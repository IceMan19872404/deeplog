import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import vm from "node:vm";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the offline shell caches the exact versions the page loads", async () => {
  const [worker, html, app] = await Promise.all([
    read("../service-worker.js"),
    read("../index.html"),
    read("../js/app.js")
  ]);

  assert.match(worker, /const CACHE = "deeplog-shell-v\d+"/);

  // Entry points referenced by index.html must be cached with the same version.
  const entryPoints = [...html.matchAll(/(?:href|src)="(\/(?:styles\/[\w-]+\.css|js\/[\w-]+\.js)\?v=[\w-]+)"/g)]
    .map((match) => match[1]);
  assert.ok(entryPoints.length >= 2, "index.html should load versioned CSS and JS");

  for (const url of entryPoints) {
    assert.ok(worker.includes(`"${url}"`), `service worker does not cache ${url}`);
  }
});

// Every static `from "./x.js?v=..."` and dynamic `import("./x.js?v=...")`
// in every module, so offline never meets a version the worker did not cache.
async function moduleImports() {
  const files = (await readdir(new URL("../js/", import.meta.url))).filter((name) => name.endsWith(".js"));
  const imports = [];
  for (const file of files) {
    const source = await read(`../js/${file}`);
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)["']\.\/([\w-]+\.js)(\?v=[\w-]+)?["']/g)) {
      imports.push({ file, module: match[1], url: `/js/${match[1]}${match[2] || ""}`, versioned: Boolean(match[2]) });
    }
  }
  return imports;
}

test("every module imported anywhere is precached under the same version", async () => {
  const worker = await read("../service-worker.js");
  const imports = await moduleImports();
  assert.ok(imports.some(({ file }) => file === "public-share.js"), "public-share.js imports should be scanned");
  assert.ok(imports.length >= 10);

  const versions = new Map();
  for (const { file, module, url, versioned } of imports) {
    assert.ok(versioned, `${file} imports ./${module} without ?v=`);
    assert.ok(worker.includes(`"${url}"`), `${file} imports ${url}, which the service worker does not cache`);
    versions.set(module, new Set([...(versions.get(module) || []), url]));
  }
  for (const [module, urls] of versions) {
    assert.equal(urls.size, 1, `${module} is imported under several versions: ${[...urls].join(", ")}`);
  }
});

// Runs service-worker.js against in-memory fakes of caches and fetch.
async function loadWorker({ online = true, files = {} } = {}) {
  const stores = new Map();
  const listeners = {};
  const network = [];
  const keyOf = (request) => (typeof request === "string" ? new URL(request, "https://deeplog.test").href : request.url);
  const openCache = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      put: async (request, response) => { store.set(keyOf(request), response); },
      match: async (request) => store.get(keyOf(request))?.clone(),
      keys: async () => [...store.keys()].map((url) => new Request(url)),
      delete: async (request) => store.delete(keyOf(request)),
      addAll: async (urls) => { urls.forEach((url) => store.set(keyOf(url), new Response(`cached ${url}`, { headers: { "content-type": "text/plain" } }))); }
    };
  };
  const caches = {
    open: async (name) => openCache(name),
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    match: async (request) => {
      for (const name of stores.keys()) {
        const hit = await openCache(name).match(request);
        if (hit) return hit;
      }
      return undefined;
    }
  };
  const fetch = async (request) => {
    const url = keyOf(request);
    network.push(url);
    if (!online) throw new TypeError("Failed to fetch");
    const path = new URL(url).pathname;
    const body = files[path] ?? "<!doctype html>";
    const type = path in files ? "application/javascript" : "text/html";
    const response = new Response(body, { status: 200, headers: { "content-type": type } });
    Object.defineProperty(response, "type", { value: "basic" });
    return response;
  };
  const self = {
    location: new URL("https://deeplog.test/service-worker.js"),
    addEventListener: (type, handler) => { listeners[type] = handler; },
    skipWaiting: () => {},
    clients: { claim: () => {} }
  };
  vm.runInNewContext(await read("../service-worker.js"), { self, caches, fetch, URL, Request, Response, Promise, console });

  async function dispatch(type, request) {
    const pending = [];
    let response;
    listeners[type]({ request, waitUntil: (promise) => pending.push(promise), respondWith: (promise) => { response = promise; } });
    const result = await response;
    await Promise.all(pending);
    return result;
  }
  const navigate = (path) => {
    const request = new Request(`https://deeplog.test${path}`);
    Object.defineProperty(request, "mode", { value: "navigate" });
    return request;
  };
  return { stores, network, dispatch, navigate, cache: () => [...stores.values()].flatMap((store) => [...store.keys()]) };
}

test("the service worker never stores share or reset tokens", async () => {
  const sw = await loadWorker();
  await sw.dispatch("install");
  const before = sw.cache().length;
  await sw.dispatch("fetch", sw.navigate("/?share=SECRET"));
  await sw.dispatch("fetch", sw.navigate("/?resetToken=SECRET"));
  await sw.dispatch("fetch", new Request("https://deeplog.test/js/app.js?token=SECRET"));
  await sw.dispatch("fetch", new Request("https://deeplog.test/definitely-missing.png"));
  assert.equal(sw.cache().length, before);
  assert.ok(!sw.cache().some((url) => /SECRET|missing/.test(url)));
});

test("activation removes token URLs an older worker stored", async () => {
  const sw = await loadWorker();
  await sw.dispatch("install");
  const [name] = sw.stores.keys();
  const store = sw.stores.get(name);
  store.set("https://deeplog.test/?share=SECRET", new Response("old"));
  store.set("https://deeplog.test/?resetToken=SECRET", new Response("old"));
  sw.stores.set("deeplog-shell-v1", new Map([["https://deeplog.test/?share=OLD", new Response("old")]]));
  await sw.dispatch("activate");
  assert.deepEqual([...sw.stores.keys()], [name]);
  assert.ok(!sw.cache().some((url) => /SECRET|OLD/.test(url)));
  assert.ok(sw.cache().some((url) => url.endsWith("/index.html")));
});

test("versioned files are served cache first, navigations network first", async () => {
  const sw = await loadWorker();
  await sw.dispatch("install");
  const worker = await read("../service-worker.js");
  const appUrl = worker.match(/"(\/js\/app\.js\?v=[\w-]+)"/)[1];
  const response = await sw.dispatch("fetch", new Request(`https://deeplog.test${appUrl}`));
  assert.equal(await response.text(), `cached ${appUrl}`);
  assert.equal(sw.network.length, 0);
  await sw.dispatch("fetch", sw.navigate("/"));
  assert.deepEqual(sw.network, ["https://deeplog.test/"]);
});

test("offline, only navigations fall back to index.html", async () => {
  const sw = await loadWorker({ online: false });
  await sw.dispatch("install");
  const page = await sw.dispatch("fetch", sw.navigate("/?share=SECRET"));
  assert.equal(await page.text(), "cached /index.html");
  const script = await sw.dispatch("fetch", new Request("https://deeplog.test/js/not-cached.js?v=1"));
  assert.equal(script.type, "error");
});

test("a versioned file missing from the cache is fetched once and stored; HTML fallbacks are not", async () => {
  const sw = await loadWorker({ files: { "/js/extra.js": "export {}" } });
  await sw.dispatch("install");
  const first = await sw.dispatch("fetch", new Request("https://deeplog.test/js/extra.js?v=9"));
  assert.equal(await first.text(), "export {}");
  assert.ok(sw.cache().includes("https://deeplog.test/js/extra.js?v=9"));
  const second = await sw.dispatch("fetch", new Request("https://deeplog.test/js/extra.js?v=9"));
  assert.equal(await second.text(), "export {}");
  assert.equal(sw.network.filter((url) => url.endsWith("/js/extra.js?v=9")).length, 1);

  // A path the server does not have answers with index.html: never stored.
  await sw.dispatch("fetch", new Request("https://deeplog.test/js/gone.js?v=9"));
  assert.ok(!sw.cache().some((url) => url.includes("gone.js")));
});

test("unversioned files go to the network first and use the precached copy offline", async () => {
  const online = await loadWorker({ files: { "/manifest.webmanifest": "{\"fresh\":true}" } });
  await online.dispatch("install");
  const fresh = await online.dispatch("fetch", new Request("https://deeplog.test/manifest.webmanifest"));
  assert.equal(await fresh.text(), "{\"fresh\":true}");

  const offline = await loadWorker({ online: false });
  await offline.dispatch("install");
  const cached = await offline.dispatch("fetch", new Request("https://deeplog.test/manifest.webmanifest"));
  assert.equal(await cached.text(), "cached /manifest.webmanifest");
  const missing = await offline.dispatch("fetch", new Request("https://deeplog.test/assets/unknown.png"));
  assert.equal(missing.type, "error");
});

test("API calls, other origins and writes are left to the browser", async () => {
  const sw = await loadWorker();
  await sw.dispatch("install");
  for (const request of [
    new Request("https://deeplog.test/api/v1/dives?v=1"),
    new Request("https://cdn.example/js/app.js?v=1"),
    new Request("https://deeplog.test/js/app.js?v=1", { method: "POST", body: "x" })
  ]) {
    assert.equal(await sw.dispatch("fetch", request), undefined);
  }
  assert.equal(sw.network.length, 0);
});

test("every stylesheet in styles/ is linked once, in file-name order", async () => {
  const html = await read("../index.html");
  const files = (await readdir(new URL("../styles/", import.meta.url)))
    .filter((name) => name.endsWith(".css"))
    .sort();
  const linked = [...html.matchAll(/href="\/styles\/([\w-]+\.css)\?v=[\w-]+"/g)].map((match) => match[1]);
  assert.deepEqual(linked, files);
});

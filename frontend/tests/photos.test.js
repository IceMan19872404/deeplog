import test from "node:test";
import assert from "node:assert/strict";
import { createUrlPool, loadPhotoUrls, photoCard, photoErrorMarkup } from "../js/photos.js";

function fakeUrlApi() {
  let next = 0;
  const live = new Set();
  return {
    live,
    createObjectURL: () => { const url = `blob:${++next}`; live.add(url); return url; },
    revokeObjectURL: (url) => live.delete(url)
  };
}

test("a pool revokes every URL it created, once", () => {
  const api = fakeUrlApi();
  const pool = createUrlPool(api);
  pool.add({});
  pool.add({});
  assert.equal(api.live.size, 2);
  pool.revokeAll();
  assert.equal(api.live.size, 0);
  pool.revokeAll();
  assert.equal(api.live.size, 0);
});

test("photos load in order; a failed one has no URL and leaks nothing", async () => {
  const api = fakeUrlApi();
  const pool = createUrlPool(api);
  const photos = [{ id: 1, url: "/a" }, { id: 2, url: "/broken" }, { id: 3, url: "/c" }];
  const loaded = await loadPhotoUrls(photos, pool, async (url) => {
    if (url === "/broken") throw new Error("404");
    return { url };
  });
  assert.deepEqual(loaded.map(({ photo, url }) => [photo.id, Boolean(url)]), [[1, true], [2, false], [3, true]]);
  assert.equal(api.live.size, 2);
});

test("photo markup escapes names", () => {
  const card = photoCard("blob:1", `<b>"x"</b>`, "<i>extra</i>");
  assert.match(card, /alt="&lt;b&gt;&quot;x&quot;&lt;\/b&gt;"/);
  assert.match(card, /<figure class="photo-card">/);
  assert.match(card, /<i>extra<\/i>/);
  assert.match(photoCard("blob:1", "a", "", "photo-card photo-card-selectable"), /class="photo-card photo-card-selectable"/);
  assert.equal(photoErrorMarkup({ originalName: "<x>.jpg" }), '<span class="photo-load-error">No se pudo cargar &lt;x&gt;.jpg</span>');
});

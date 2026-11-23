// Private world map for the dashboard.
// Draws Natural Earth land masses from a local file (no tile provider, no
// coordinates leaving DeepLog), fits the view to the diver's own sites and
// groups nearby pins so a dozen dives on the same coast stay readable.
import { WORLD_LAND_PATH, WORLD_SCALE } from "./world-map-data.js?v=20261030-1";

const SVG_NS = "http://www.w3.org/2000/svg";
const WORLD_WIDTH = 360 * WORLD_SCALE;
const WORLD_HEIGHT = 180 * WORLD_SCALE;
const MIN_SPAN = 6 * WORLD_SCALE; // never zoom closer than ~6°: the coastline data is regional, not street-level
const CLUSTER_RADIUS_PX = 26;

export function project({ latitude, longitude }) {
  return { x: (longitude + 180) * WORLD_SCALE, y: (90 - latitude) * WORLD_SCALE };
}

// Smallest view that contains every point, with breathing room, at the
// container's aspect ratio and kept inside the world.
export function fitView(points, aspect) {
  if (!points.length) return { x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_WIDTH / aspect };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  let minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);

  let width = Math.max((maxX - minX) * 1.3, MIN_SPAN);
  let height = Math.max((maxY - minY) * 1.3, MIN_SPAN / aspect);
  // Leave room above the highest pin: pins point down onto their spot.
  height += height * 0.08;
  if (width / height < aspect) width = height * aspect; else height = width / aspect;
  // Never wider than the world; on tall screens (phones) the view may be taller
  // than the world instead, so every pin stays visible with ocean above and below.
  if (width > WORLD_WIDTH) { width = WORLD_WIDTH; height = width / aspect; }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2 - height * 0.04;
  const clamp = (value, size, limit) => (size >= limit ? (limit - size) / 2 : Math.min(Math.max(value, 0), limit - size));
  return {
    x: clamp(centerX - width / 2, width, WORLD_WIDTH),
    y: clamp(centerY - height / 2, height, WORLD_HEIGHT),
    width,
    height
  };
}

// Greedy screen-space clustering: good enough for a personal logbook (tens to
// hundreds of dives) and fully deterministic.
export function clusterPoints(points, view, pixelWidth) {
  const scale = pixelWidth / view.width;
  const clusters = [];
  for (const point of points) {
    const px = (point.x - view.x) * scale;
    const py = (point.y - view.y) * scale;
    const near = clusters.find((c) => Math.hypot(c.px - px, c.py - py) < CLUSTER_RADIUS_PX);
    if (near) {
      near.points.push(point);
      near.px = (near.px * (near.points.length - 1) + px) / near.points.length;
      near.py = (near.py * (near.points.length - 1) + py) / near.points.length;
    } else {
      clusters.push({ px, py, points: [point] });
    }
  }
  return clusters;
}

function svgElement(name, attributes) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function drawBase(view) {
  const svg = svgElement("svg", {
    class: "map-canvas",
    viewBox: `${view.x} ${view.y} ${view.width} ${view.height}`,
    preserveAspectRatio: "xMidYMid meet",
    "aria-hidden": "true",
    focusable: "false"
  });
  const graticule = [];
  for (let lon = -150; lon <= 150; lon += 30) graticule.push(`M${(lon + 180) * WORLD_SCALE} 0V${WORLD_HEIGHT}`);
  for (let lat = -60; lat <= 60; lat += 30) graticule.push(`M0 ${(90 - lat) * WORLD_SCALE}H${WORLD_WIDTH}`);
  svg.append(
    svgElement("path", { class: "map-graticule", d: graticule.join("") }),
    svgElement("path", { class: "map-land", d: WORLD_LAND_PATH })
  );
  return svg;
}

export function createDiveMap(container, { onSelect, describe }) {
  let points = [];
  let focus = null; // subset of points the diver zoomed into
  let openList = null; // cluster whose dives are listed (too close together to separate by zooming)
  let frame = 0;

  function render() {
    frame = 0;
    const width = container.clientWidth || 720;
    const height = container.clientHeight || 360;
    const visible = focus || points;
    const view = fitView(visible, width / height);
    const layer = document.createElement("div");
    layer.className = "map-markers";

    for (const cluster of clusterPoints(points, view, width)) {
      cluster.key = cluster.points.map((p) => p.dive.id).join(",");
      if (cluster.px < -20 || cluster.py < -20 || cluster.px > width + 20 || cluster.py > height + 20) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.style.left = `${(cluster.px / width) * 100}%`;
      button.style.top = `${(cluster.py / height) * 100}%`;
      if (cluster.points.length === 1) {
        const [point] = cluster.points;
        button.className = "map-pin";
        button.title = describe(point.dive);
        button.addEventListener("click", () => onSelect(point.dive.id));
      } else {
        const zoomed = fitView(cluster.points, width / height);
        const canZoom = zoomed.width < view.width * 0.8;
        button.className = "map-cluster";
        button.textContent = cluster.points.length;
        if (canZoom) {
          button.title = `${cluster.points.length} inmersiones en esta zona · pulsa para acercar`;
          button.addEventListener("click", () => {
            focus = cluster.points;
            openList = null;
            render();
            container.querySelector(".map-cluster, .map-pin")?.focus();
          });
        } else {
          // Same dive site: zooming further would not separate them, so list them.
          button.classList.add("is-stack");
          button.title = `${cluster.points.length} inmersiones en el mismo lugar · pulsa para verlas`;
          button.setAttribute("aria-expanded", String(openList === cluster.key));
          button.addEventListener("click", () => {
            openList = openList === cluster.key ? null : cluster.key;
            render();
            container.querySelector(openList ? ".map-stack-list button" : ".map-cluster.is-stack")?.focus();
          });
        }
      }
      button.setAttribute("aria-label", button.title);
      layer.append(button);
      if (openList === cluster.key) layer.append(stackList(cluster, width, height));
    }

    const nodes = [drawBase(view), layer];
    if (focus) {
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "map-reset";
      reset.textContent = "Ver todas";
      reset.addEventListener("click", () => { focus = null; openList = null; render(); });
      nodes.push(reset);
    }
    container.replaceChildren(...nodes);
  }

  function stackList(cluster, width, height) {
    const list = document.createElement("div");
    list.className = "map-stack-list";
    // A plain group of buttons that stays in place inside the map: not a
    // dialog (no modal behaviour, no focus containment).
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", "Inmersiones en este lugar");
    const left = Math.min(Math.max(cluster.px, 120), width - 120);
    list.style.left = `${(left / width) * 100}%`;
    if (cluster.py > height / 2) list.classList.add("is-above");
    list.style.top = `${(cluster.py / height) * 100}%`;
    cluster.points
      .toSorted((a, b) => String(b.dive.date).localeCompare(String(a.dive.date)))
      .forEach((point) => {
        const item = document.createElement("button");
        item.type = "button";
        item.textContent = describe(point.dive);
        item.addEventListener("click", () => onSelect(point.dive.id));
        list.append(item);
      });
    list.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { openList = null; render(); container.querySelector(".map-cluster.is-stack")?.focus(); }
    });
    return list;
  }

  // Pressing anywhere on the map outside the list closes it. Presses on a
  // button are left alone: each map button re-renders the map itself, and
  // closing here first would remove the button before its click.
  container.addEventListener("pointerdown", (event) => {
    if (!openList || event.target.closest(".map-stack-list, button")) return;
    openList = null;
    render();
  });

  const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (points.length) schedule(); }).observe(container);

  return {
    update(dives) {
      points = dives
        .map((dive) => ({ dive, latitude: Number(dive.latitude), longitude: Number(dive.longitude) }))
        .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
        .map((p) => ({ ...project(p), dive: p.dive }));
      focus = null;
      openList = null;
      render();
    }
  };
}

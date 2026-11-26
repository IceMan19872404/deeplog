// Printable A4 story of one dive (TD-019): a self-contained HTML document
// opened in a new tab, saved as PDF through the browser's print dialog.
import {
  cylinderSummary,
  escapeHtml,
  formatCalendarDate,
  formatNumber,
  suitSummary,
  waterSummary
} from "./format.js?v=20261126-2";

function equipmentLabel(value) {
  if (value === "owned") return "Material propio";
  if (value === "rented") return "Material de alquiler";
  return "No indicado";
}

const comfortLabels = { comfortable: "Con comodidad", mixed: "Con sensaciones mixtas", challenging: "Fue exigente" };

// Reflection answers in print order; empty answers are left out.
const reflectionRows = [
  ["wentWell", "Salió bien"],
  ["improveNext", "Quiero mejorar"],
  ["practicedSkill", "Habilidad practicada"],
  ["comfort", "Sensación general", (value) => comfortLabels[value] || ""],
  ["incidents", "Situaciones a recordar"],
  ["nextGoal", "Próximo objetivo"]
];

function reflectionMarkup(reflection) {
  return reflectionRows.map(([field, label, describe = (value) => value]) => (reflection[field]
    ? `<p class="copy"><strong>${label}:</strong> ${escapeHtml(describe(reflection[field]))}</p>`
    : "")).join("\n        ");
}

function fact(label, value) {
  return `<div class="fact"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function photoMarkup(photo) {
  return `
    <figure>
      <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.originalName)}">
      <figcaption>${escapeHtml(photo.originalName)}</figcaption>
    </figure>`;
}

export function buildDivePrintDocument({ dive, photos, diverName }) {
  const date = formatCalendarDate(dive.date, { day: "numeric", month: "long", year: "numeric" });
  const center = dive.diveCenter || "un lugar no indicado";
  const buddies = dive.buddies.length
    ? dive.buddies.join(", ")
    : "No se indicaron compañeros.";
  const narrative = `${date}, ${center}. ${formatNumber(dive.durationMinutes)} minutos bajo la superficie y una profundidad máxima de ${formatNumber(dive.maxDepthMeters)} metros.`;
  const gallery = photos.length
    ? `<section class="story-section gallery-section">
        <p class="eyebrow">Recuerdos visuales</p>
        <h2>Lo que quedó bajo la superficie</h2>
        <div class="gallery">${photos.map(photoMarkup).join("")}</div>
      </section>`
    : "";
  const reflection = dive.reflection
    ? `<section class="story-section">
        <p class="eyebrow">Diario de aprendizaje</p>
        <h2>Lo que me llevo de esta inmersión</h2>
        ${reflectionMarkup(dive.reflection)}
      </section>`
    : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>DeepLog · ${escapeHtml(dive.name)}</title>
    <style>
      :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; color: #102a43; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #dceeff; }
      .print-toolbar { position: sticky; top: 0; z-index: 5; display: flex; gap: 16px; align-items: center; justify-content: center; padding: 12px 20px; background: rgba(16, 42, 67, .94); color: white; }
      .print-toolbar p { margin: 0; font-size: 14px; }
      .print-toolbar button { padding: 10px 18px; border: 0; border-radius: 999px; background: #68d8d6; color: #102a43; font: inherit; font-weight: 750; cursor: pointer; }
      .report { width: 210mm; min-height: 297mm; margin: 18px auto; background: #fff; box-shadow: 0 30px 80px rgba(9, 42, 76, .2); }
      .hero { position: relative; overflow: hidden; min-height: 92mm; padding: 24mm 18mm 16mm; background: linear-gradient(145deg, #dff6ff 0%, #68d8d6 50%, #107acc 100%); color: #102a43; }
      .hero::after { position: absolute; right: -28mm; bottom: -42mm; width: 105mm; height: 105mm; border: 1px solid rgba(255,255,255,.58); border-radius: 45% 55% 62% 38%; content: ""; }
      .brand { display: flex; gap: 9px; align-items: center; margin-bottom: 20mm; font-size: 17px; font-weight: 800; }
      .brand img { width: 34px; height: 34px; }
      .eyebrow { margin: 0 0 5px; color: #087f9c; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
      .hero .eyebrow { color: #102a43; }
      h1 { max-width: 155mm; margin: 0 0 8px; font-size: 38px; line-height: .98; letter-spacing: -.045em; }
      .lead { max-width: 145mm; margin: 0; font-size: 17px; line-height: 1.45; }
      .content { padding: 15mm 18mm 18mm; }
      .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0 0 13mm; }
      .fact { padding: 12px; border: 1px solid #d3edf5; border-radius: 14px; background: #f4fbfe; }
      .fact dt { margin-bottom: 5px; color: #60768a; font-size: 8px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      .fact dd { margin: 0; font-size: 13px; font-weight: 750; }
      .story-section { padding: 10mm 0; border-top: 1px solid #dbe8ef; break-inside: avoid; }
      .story-section h2 { margin: 0 0 8px; font-size: 22px; letter-spacing: -.025em; }
      .story-section .copy { margin: 0; color: #425d73; font-size: 13px; line-height: 1.65; white-space: pre-wrap; }
      .gallery-section { break-inside: auto; }
      .gallery { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 8mm; }
      figure { break-inside: avoid; margin: 0; }
      figure img { display: block; width: 100%; height: 62mm; border-radius: 13px; object-fit: cover; }
      figcaption { overflow: hidden; margin-top: 4px; color: #60768a; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
      footer { display: flex; justify-content: space-between; padding-top: 10mm; border-top: 1px solid #dbe8ef; color: #60768a; font-size: 9px; }
      @page { size: A4; margin: 0; }
      @media print {
        body { background: white; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .print-toolbar { display: none; }
        .report { width: auto; min-height: 297mm; margin: 0; box-shadow: none; }
      }
      @media screen and (max-width: 760px) {
        .print-toolbar { flex-direction: column; text-align: center; }
        .report { width: 100%; margin: 0; }
        .hero { padding-inline: 24px; }
        .content { padding-inline: 24px; }
        .facts { grid-template-columns: repeat(2, 1fr); }
        .gallery { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="print-toolbar">
      <p>En el diálogo de impresión elige “Guardar como PDF”.</p>
      <button id="print-report" type="button">Guardar como PDF</button>
    </div>
    <main class="report">
      <header class="hero">
        <div class="brand"><img src="/assets/deeplog-mark.svg" alt="">DeepLog</div>
        <p class="eyebrow">Historia de una inmersión</p>
        <h1>${escapeHtml(dive.name)}</h1>
        <p class="lead">${escapeHtml(narrative)}</p>
      </header>
      <div class="content">
        <dl class="facts">
          ${fact("Fecha", date)}
          ${fact("Duración", `${formatNumber(dive.durationMinutes)} minutos`)}
          ${fact("Profundidad máxima", `${formatNumber(dive.maxDepthMeters)} metros`)}
          ${fact("Centro de buceo", dive.diveCenter || "No indicado")}
          ${fact("Lastre", dive.ballastKg === null ? "No indicado" : `${formatNumber(dive.ballastKg)} kg`)}
          ${fact("Material", equipmentLabel(dive.equipmentOwnership))}
          ${fact("Traje", suitSummary(dive))}
          ${fact("Botella", cylinderSummary(dive))}
          ${fact("Agua", waterSummary(dive.waterType))}
        </dl>
        <section class="story-section">
          <p class="eyebrow">La experiencia compartida</p>
          <h2>Compañeros de inmersión</h2>
          <p class="copy">${escapeHtml(buddies)}</p>
        </section>
        <section class="story-section">
          <p class="eyebrow">Cuaderno de bitácora</p>
          <h2>Notas bajo la superficie</h2>
          <p class="copy">${escapeHtml(dive.comments || "Sin notas registradas.")}</p>
        </section>
        ${reflection}
        ${gallery}
        <footer><span>DeepLog · Tu océano. Tu historia.</span><span>${escapeHtml(diverName || "Bitácora personal")}</span></footer>
      </div>
    </main>
  </body>
</html>`;
}

export function openDivePrintPreview(data) {
  const preview = window.open("", "_blank");
  if (!preview) return false;

  preview.document.open();
  preview.document.write(buildDivePrintDocument(data));
  preview.document.close();
  const printButton = preview.document.querySelector("#print-report");
  const images = [...preview.document.images];
  printButton.disabled = images.some((image) => !image.complete);
  if (printButton.disabled) {
    printButton.textContent = "Preparando imágenes...";
    Promise.all(
      images.map((image) => image.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        }))
    ).then(() => {
      printButton.disabled = false;
      printButton.textContent = "Guardar como PDF";
    });
  }
  printButton.addEventListener("click", () => {
    preview.focus();
    preview.print();
  });
  return true;
}

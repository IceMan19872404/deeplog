import test from "node:test";
import assert from "node:assert/strict";
import { buildDivePrintDocument } from "../js/dive-pdf.js";

test("the printable dive story includes every selected section and escapes user text", () => {
  const html = buildDivePrintDocument({
    diverName: "Auditoria DeepLog",
    dive: {
      name: "Cala <Azul>",
      date: "2026-10-18",
      durationMinutes: 61,
      maxDepthMeters: 24.6,
      diveCenter: "Deep Blue Center",
      ballastKg: 6.5,
      equipmentOwnership: "owned",
      suitType: "wetsuit",
      suitThicknessMm: 5,
      cylinderMaterial: "steel",
      cylinderVolumeLiters: 12,
      waterType: "salt",
      buddies: ["Ana López", "Marcos Ruiz"],
      comments: "Fauna & buena visibilidad",
      reflection: {
        wentWell: "Flotabilidad",
        improveNext: null,
        practicedSkill: "Comunicación",
        comfort: "comfortable",
        incidents: null,
        nextGoal: "Mantener el ritmo"
      }
    },
    photos: [{ url: "blob:test", originalName: "recuerdo.png" }]
  });

  assert.match(html, /Cala &lt;Azul&gt;/);
  assert.match(html, /Fauna &amp; buena visibilidad/);
  assert.match(html, /Ana López, Marcos Ruiz/);
  assert.match(html, /Diario de aprendizaje/);
  assert.match(html, /recuerdo\.png/);
  assert.match(html, /Guardar como PDF/);
});

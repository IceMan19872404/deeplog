// Spanish labels for the dive and profile values the API stores as codes, and
// the short descriptions built from them (list card, detail, statistics).

import { formatNumber } from "./format.js?v=20261123-2";

export const SUIT_LABELS = { wetsuit: "Traje húmedo", drysuit: "Traje seco", shorty: "Shorty", none: "Sin traje" };
export const CYLINDER_LABELS = { steel: "Acero", aluminum: "Aluminio" };
export const WATER_LABELS = { salt: "Agua salada", fresh: "Agua dulce" };
export const COMFORT_LABELS = {
  comfortable: "Con comodidad",
  mixed: "Con sensaciones mixtas",
  challenging: "Fue exigente"
};
export const CERTIFICATION_LABELS = {
  beginner: "En formación",
  open_water: "Open Water",
  advanced: "Advanced",
  rescue: "Rescue Diver",
  divemaster: "Divemaster",
  instructor: "Instructor/a"
};

export function ownershipLabel(ownership) {
  return ownership === "owned" ? "Material propio" : "Material de alquiler";
}

function suitParts(item) {
  return [SUIT_LABELS[item.suitType], item.suitThicknessMm === null ? null : `${formatNumber(item.suitThicknessMm)} mm`]
    .filter(Boolean);
}

function cylinderParts(item) {
  return [CYLINDER_LABELS[item.cylinderMaterial], item.cylinderVolumeLiters === null ? null : `${formatNumber(item.cylinderVolumeLiters)} L`]
    .filter(Boolean);
}

// «Traje húmedo · 5 mm»
export function suitDescription(dive) {
  if (!dive.suitType && dive.suitThicknessMm === null) return "No indicado";
  return suitParts(dive).join(" · ");
}

// «Aluminio · 12 L»
export function cylinderDescription(dive) {
  if (!dive.cylinderMaterial && dive.cylinderVolumeLiters === null) return "No indicada";
  return cylinderParts(dive).join(" · ");
}

// «Traje húmedo 5 mm · Aluminio 12 L · Agua salada», for ballast groups.
export function configurationName(item) {
  return [suitParts(item).join(" "), cylinderParts(item).join(" "), WATER_LABELS[item.waterType]]
    .filter(Boolean)
    .join(" · ") || "Configuración parcial";
}

// «41.7, 2.99 · aproximada». Coordinates keep the dot: they are data.
export function locationDescription(location) {
  if (!location) return "No indicada";
  const precision = location.precision === "approximate" ? "aproximada" : "exacta y privada";
  return `${location.latitude}, ${location.longitude} · ${precision}`;
}

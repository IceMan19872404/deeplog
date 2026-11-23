const fieldLabels = {
  firstName: ["nombre", "el"],
  lastName: ["primer apellido", "el"],
  secondLastName: ["segundo apellido", "el"],
  email: ["correo electrónico", "el"],
  password: ["contraseña", "la"],
  passwordConfirmation: ["confirmación de contraseña", "la"],
  token: ["enlace de recuperación", "el"],
  name: ["nombre de la inmersión", "el"],
  date: ["fecha", "la"],
  durationMinutes: ["duración", "la"],
  maxDepthMeters: ["profundidad máxima", "la"],
  ballastKg: ["lastre utilizado", "el"],
  equipmentOwnership: ["material utilizado", "el"],
  suitType: ["tipo de traje", "el"],
  suitThicknessMm: ["grosor del traje", "el"],
  cylinderMaterial: ["material de la botella", "el"],
  cylinderVolumeLiters: ["capacidad de la botella", "la"],
  waterType: ["tipo de agua", "el"],
  diveCenter: ["centro de buceo", "el"],
  latitude: ["latitud", "la"],
  longitude: ["longitud", "la"],
  locationPrecision: ["precisión de la ubicación", "la"],
  comments: ["notas", "las"],
  buddiesText: ["compañeros de inmersión", "los"],
  bio: ["descripción del perfil", "la"],
  certificationLevel: ["nivel o certificación", "el"],
  divingSince: ["año de inicio", "el"],
  photos: ["fotografías", "las"],
  wentWell: ["apartado «qué salió bien»", "el"],
  improveNext: ["apartado «qué quieres mejorar»", "el"],
  practicedSkill: ["habilidad practicada", "la"],
  incidents: ["incidencias", "las"],
  nextGoal: ["próximo objetivo", "el"],
  photo: ["fotografía", "la"],
  confirmation: ["confirmación", "la"]
};

function decimalsAllowed(step) {
  const [, decimals = ""] = String(step).split(".");
  return decimals.length;
}

export function fieldReference(name) {
  const [label, article] = fieldLabels[name] || [name || "campo", "el"];
  return {
    label,
    article,
    plural: article === "los" || article === "las",
    feminine: article === "la" || article === "las"
  };
}

export function nativeValidationMessage(input) {
  const { label, article, plural, feminine } = fieldReference(input.name);
  const subject = `${article[0].toUpperCase()}${article.slice(1)} ${label}`;
  const verb = plural ? "deben" : "debe";

  if (input.validity.badInput) {
    return `Escribe ${article} ${label} solo con números; usa coma o punto para los decimales.`;
  }
  if (input.validity.valueMissing) {
    const adjective = plural
      ? (feminine ? "obligatorias" : "obligatorios")
      : (feminine ? "obligatoria" : "obligatorio");
    return `${subject} ${plural ? "son" : "es"} ${adjective}.`;
  }
  if (input.validity.typeMismatch) return "Introduce un correo electrónico válido.";
  if (input.validity.tooShort) {
    return `${subject} ${verb} tener al menos ${input.minLength} caracteres.`;
  }
  if (input.validity.tooLong) {
    return `${subject} no ${plural ? "pueden" : "puede"} superar ${input.maxLength} caracteres.`;
  }
  if (input.validity.rangeUnderflow) {
    return `${subject} ${verb} ser igual o superior a ${input.min}.`;
  }
  if (input.validity.rangeOverflow && input.type === "date") {
    return "La fecha no puede ser posterior a hoy.";
  }
  if (input.validity.rangeOverflow) {
    return `${subject} no ${plural ? "pueden" : "puede"} superar ${input.max}.`;
  }
  if (input.validity.stepMismatch) {
    const decimals = decimalsAllowed(input.step);
    return decimals
      ? `${subject} ${plural ? "admiten" : "admite"} hasta ${decimals} ${decimals === 1 ? "decimal" : "decimales"}.`
      : `${subject} ${verb} ser un número entero.`;
  }
  if (input.validity.patternMismatch && input.name === "password") {
    return "Usa 8 caracteres e incluye mayúscula, minúscula y número.";
  }
  if (input.validity.patternMismatch && input.name === "confirmation") {
    return "Escribe ELIMINAR en mayúsculas para confirmar.";
  }
  return `Revisa ${article} ${label}.`;
}

export function apiValidationMessage(field, message = "") {
  if (field === "token") return "El enlace ha caducado o ya se ha utilizado.";
  if (field === "password" && message.includes("lowercase")) {
    return "La contraseña debe incluir una letra minúscula.";
  }
  if (field === "password" && message.includes("uppercase")) {
    return "La contraseña debe incluir una letra mayúscula.";
  }
  if (field === "password" && message.includes("number")) {
    return "La contraseña debe incluir un número.";
  }
  const { label, article } = fieldReference(field);
  return `Revisa ${article} ${label}.`;
}

const profilePhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const PROFILE_PHOTO_MAX_BYTES = 3 * 1024 * 1024;

// Same rule the API applies to the profile photo, checked before anything is
// saved so a bad file never leaves the profile half updated.
export function profilePhotoMessage(file) {
  if (!file) return "";
  if (!profilePhotoTypes.has(file.type) || file.size > PROFILE_PHOTO_MAX_BYTES) {
    return "La fotografía debe ser JPEG, PNG o WebP y ocupar 3 MB o menos.";
  }
  return "";
}

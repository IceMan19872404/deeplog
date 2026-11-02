const database = require("../src/config/database");

const dives = [
  {
    name: "Cova de la Vaca · Illes Medes", date: "2026-10-12", durationMinutes: 58,
    maxDepthMeters: 24.6, ballastKg: 5.5, equipmentOwnership: "owned",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "steel",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Laura Ferrer", "Marc Vidal"],
    diveCenter: "Unisub L'Estartit", latitude: 42.04721, longitude: 3.22411,
    locationPrecision: "approximate",
    comments: "Entrada desde embarcación con mar casi plano. Visibilidad de 22 m y temperatura de 19 °C. Recorrido por la pared y entrada amplia de la cueva, sin penetración. Observamos meros, nudibranquios, una morena y un banco de sargos. Consumo inicial de 200 bar y salida con 65 bar.",
    reflection: { wentWell: "Flotabilidad estable junto a la pared y comunicación clara con el equipo.", improveNext: "Mantener más distancia del fondo al fotografiar nudibranquios.", practicedSkill: "Trim y propulsión frog kick", comfort: "comfortable", incidents: "Sin incidencias; corriente suave al final.", nextGoal: "Practicar giros de helicóptero sin perder profundidad." }
  },
  {
    name: "Massa d'Or · Cap de Creus", date: "2026-09-26", durationMinutes: 47,
    maxDepthMeters: 31.8, ballastKg: 5, equipmentOwnership: "owned",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "steel",
    cylinderVolumeLiters: 15, waterType: "salt", buddies: ["Marc Vidal"],
    diveCenter: "Cadaqués Divers", latitude: 42.31912, longitude: 3.31874,
    locationPrecision: "approximate",
    comments: "Inmersión de pared con corriente moderada de norte a sur. Visibilidad cercana a 25 m, agua a 18 °C y termoclina a 21 m. Vimos gorgonias rojas, langostas y un pez luna a distancia. Inicio con 210 bar; parada de seguridad de 5 minutos y salida con 70 bar.",
    reflection: { wentWell: "Buena planificación del descenso y control del tiempo a profundidad.", improveNext: "Anticipar antes el cambio de rumbo cuando aumenta la corriente.", practicedSkill: "Despliegue de boya deco", comfort: "mixed", incidents: "Corriente más intensa de la prevista durante seis minutos.", nextGoal: "Reducir el consumo manteniendo un ritmo de aleteo más pausado." }
  },
  {
    name: "Mar Menuda · Tossa de Mar", date: "2026-09-05", durationMinutes: 64,
    maxDepthMeters: 17.4, ballastKg: 6, equipmentOwnership: "rented",
    suitType: "wetsuit", suitThicknessMm: 7, cylinderMaterial: "steel",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Núria Soler", "Pau Roca"],
    diveCenter: "Andreas Diving Tossa", latitude: 41.71641, longitude: 2.93688,
    locationPrecision: "exact",
    comments: "Entrada tranquila desde playa y navegación hasta la bañera. Visibilidad de 14 m, agua a 21 °C. Encontramos caballitos de mar, pulpos, salmonetes y varias flabelinas. La botella de alquiler tenía una grifería algo dura, comprobada antes de entrar.",
    reflection: { wentWell: "Navegación de ida y vuelta precisa usando referencias naturales.", improveNext: "Comprobar con más tiempo la ergonomía del equipo alquilado.", practicedSkill: "Navegación con brújula", comfort: "comfortable", incidents: "Ninguna incidencia durante la inmersión.", nextGoal: "Repetir el recorrido liderando al grupo completo." }
  },
  {
    name: "Dofí Nord · Illes Medes", date: "2026-08-19", durationMinutes: 51,
    maxDepthMeters: 28.2, ballastKg: 5.5, equipmentOwnership: "owned",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "steel",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Laura Ferrer"],
    diveCenter: "Unisub L'Estartit", latitude: 42.05048, longitude: 3.22332,
    locationPrecision: "approximate",
    comments: "Descenso por cabo hasta la entrada del túnel. Visibilidad de 20 m y agua a 22 °C. Cruzamos únicamente la galería iluminada, manteniendo contacto visual con la salida. Meros grandes, corvinas y una raya descansando en arena. Salida con 60 bar.",
    reflection: { wentWell: "Control de flotabilidad y separación del compañero en el túnel muy correctos.", improveNext: "Evitar mirar el ordenador con tanta frecuencia en una cota estable.", practicedSkill: "Comunicación con luz y señales", comfort: "comfortable", incidents: "Sin incidencias.", nextGoal: "Mejorar la posición de la linterna para liberar una mano." }
  },
  {
    name: "Bajo de Fuera · Cabo de Palos", date: "2026-07-30", durationMinutes: 43,
    maxDepthMeters: 37.6, ballastKg: 4.5, equipmentOwnership: "owned",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "steel",
    cylinderVolumeLiters: 15, waterType: "salt", buddies: ["Sergio Molina", "Elena Torres"],
    diveCenter: "Naranjito Buceo", latitude: 37.62583, longitude: -0.68142,
    locationPrecision: "approximate",
    comments: "Inmersión profunda planificada en el bajo, con descenso por cabo y tiempo de fondo conservador. Visibilidad de 28 m, agua a 23 °C y corriente moderada. Avistamos dentones, barracudas y un águila marina. Ascenso escalonado y parada de seguridad ampliada a 6 minutos.",
    reflection: { wentWell: "Plan de gas respetado y comunicación frecuente de presión.", improveNext: "Descender un poco más despacio para compensar con mayor comodidad.", practicedSkill: "Planificación de inmersión profunda", comfort: "comfortable", incidents: "Sin incidencias; corriente prevista en superficie.", nextGoal: "Consolidar el protocolo de comprobación previa para inmersiones profundas." }
  },
  {
    name: "Punta de la Mona · La Herradura", date: "2026-07-12", durationMinutes: 62,
    maxDepthMeters: 21.3, ballastKg: 4, equipmentOwnership: "rented",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "aluminum",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Elena Torres"],
    diveCenter: "Open Water La Herradura", latitude: 36.72451, longitude: -3.72785,
    locationPrecision: "approximate",
    comments: "Salida en barco hacia la pared este. Agua a 24 °C, visibilidad de 18 m y ausencia de corriente. Vimos un pez luna juvenil, tres pulpos, doncellas y coral naranja. El aluminio modificó el trim al final de la inmersión; salida con 55 bar.",
    reflection: { wentWell: "Adaptación rápida a una botella distinta y buen control en la parada.", improveNext: "Mover ligeramente la botella hacia arriba para compensar piernas pesadas.", practicedSkill: "Ajuste de trim con aluminio", comfort: "comfortable", incidents: "Sin incidencias.", nextGoal: "Registrar el ajuste exacto de cinchas para futuras botellas de aluminio." }
  },
  {
    name: "La Ferrera · Islas Columbretes", date: "2026-06-21", durationMinutes: 55,
    maxDepthMeters: 26.9, ballastKg: 4.5, equipmentOwnership: "owned",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "steel",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Pau Roca", "Núria Soler"],
    diveCenter: "Barracuda Buceo", latitude: 39.89932, longitude: 0.68621,
    locationPrecision: "approximate",
    comments: "Fondeo protegido y descenso junto a la pared volcánica. Visibilidad superior a 30 m, agua a 22 °C. Grandes bancos de barracudas, meros, langostas y nacras. Corriente ligera en la esquina sur y regreso a sotavento.",
    reflection: { wentWell: "Equipo compacto y consumo homogéneo durante todo el recorrido.", improveNext: "Coordinar mejor las paradas para observar fauna sin separar el grupo.", practicedSkill: "Orientación natural", comfort: "comfortable", incidents: "Sin incidencias.", nextGoal: "Identificar cinco especies locales antes de la próxima visita." }
  },
  {
    name: "Pecio Don Pedro · Ibiza", date: "2026-05-30", durationMinutes: 39,
    maxDepthMeters: 38.9, ballastKg: 5, equipmentOwnership: "owned",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "steel",
    cylinderVolumeLiters: 15, waterType: "salt", buddies: ["Sergio Molina"],
    diveCenter: "Scuba Ibiza", latitude: 38.89174, longitude: 1.47862,
    locationPrecision: "approximate",
    comments: "Descenso directo por cabo hasta la cubierta del pecio, sin penetración. Visibilidad de 24 m, agua a 20 °C en el fondo. Recorrido por proa, puente y hélice; congrios y bancos de tres colas. Se aplicó estrictamente el tiempo de retorno y la reserva de gas.",
    reflection: { wentWell: "Disciplina con profundidad, tiempo y gas en un entorno exigente.", improveNext: "Practicar encuadres fotográficos sin acercarme a estructuras cortantes.", practicedSkill: "Procedimientos de pecio sin penetración", comfort: "mixed", incidents: "Ligero aumento de oleaje durante la salida.", nextGoal: "Preparar una lista de comprobación específica para pecios." }
  },
  {
    name: "Pont d'en Gil · Menorca", date: "2026-05-09", durationMinutes: 57,
    maxDepthMeters: 18.7, ballastKg: 4.5, equipmentOwnership: "rented",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "aluminum",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Laura Ferrer", "Jordi Casas"],
    diveCenter: "Bluewater Menorca", latitude: 40.01384, longitude: 3.79462,
    locationPrecision: "approximate",
    comments: "Entrada desde embarcación y visita a la gran cavidad con cámara de aire, siguiendo al guía y sin abandonar la zona iluminada. Visibilidad de 26 m y agua a 20 °C. Contraluces espectaculares, gambas y corvinas. Regreso por la pared exterior.",
    reflection: { wentWell: "Respiración tranquila y comunicación ordenada en la cavidad.", improveNext: "Evitar levantar sedimento al aproximarme a zonas arenosas.", practicedSkill: "Aleteo modificado", comfort: "comfortable", incidents: "Sin incidencias.", nextGoal: "Practicar retroceso con aletas en aguas confinadas abiertas." }
  },
  {
    name: "Museo Atlántico · Lanzarote", date: "2026-04-18", durationMinutes: 61,
    maxDepthMeters: 14.8, ballastKg: 6, equipmentOwnership: "rented",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "aluminum",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Clara Benítez"],
    diveCenter: "Rubicon Diving", latitude: 28.85692, longitude: -13.81721,
    locationPrecision: "approximate",
    comments: "Recorrido completo por las esculturas con visibilidad de 20 m, agua a 19 °C y mar en calma. Fotografías tomadas sin tocar las obras ni el fondo. Vimos angelotes en la arena, viejas y bancos de roncadores. Consumo especialmente bajo por la poca profundidad.",
    reflection: { wentWell: "Ritmo pausado, buen control para las fotografías y respeto del entorno.", improveNext: "Reducir medio kilo de lastre con esta configuración.", practicedSkill: "Flotabilidad para fotografía", comfort: "comfortable", incidents: "Sin incidencias.", nextGoal: "Probar 5,5 kg con traje húmedo de 5 mm y aluminio de 12 l." }
  },
  {
    name: "Montaña Amarilla · Tenerife", date: "2026-03-28", durationMinutes: 66,
    maxDepthMeters: 19.6, ballastKg: 5.5, equipmentOwnership: "rented",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "aluminum",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Clara Benítez", "Iván Gómez"],
    diveCenter: "Atlantic Divers", latitude: 28.00784, longitude: -16.63945,
    locationPrecision: "exact",
    comments: "Entrada desde costa con pequeño oleaje. Recorrido por formaciones volcánicas y arena a 20 m. Visibilidad de 25 m, agua a 20 °C. Avistamos chuchos, trompetas, sepias y un banco de bicudas. Parada de seguridad junto a la pared amarilla.",
    reflection: { wentWell: "Entrada y salida desde costa bien coordinadas.", improveNext: "Asegurar mejor los accesorios antes de cruzar la rompiente.", practicedSkill: "Entrada de costa con oleaje", comfort: "comfortable", incidents: "Un mosquetón quedó suelto al entrar; corregido en superficie.", nextGoal: "Simplificar la configuración exterior del chaleco." }
  },
  {
    name: "Sardina del Norte · Gran Canaria", date: "2026-02-14", durationMinutes: 72,
    maxDepthMeters: 16.2, ballastKg: 5, equipmentOwnership: "rented",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "aluminum",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Iván Gómez"],
    diveCenter: "Sardina Sub", latitude: 28.15391, longitude: -15.69584,
    locationPrecision: "approximate",
    comments: "Inmersión larga y relajada desde el muelle. Visibilidad de 18 m, agua a 19 °C. Rayas, caballitos de mar, sepias y un gran banco de roncadores. Perfil poco profundo y consumo final de 70 bar, el mejor registrado con equipo de alquiler.",
    reflection: { wentWell: "Respiración lenta y perfil estable durante toda la inmersión.", improveNext: "Dedicar más tiempo a comprobar el enfoque antes de disparar.", practicedSkill: "Control respiratorio", comfort: "comfortable", incidents: "Sin incidencias.", nextGoal: "Mantener este consumo en una inmersión de 20-25 m." }
  },
  {
    name: "Maaya Thila · Maldivas", date: "2025-12-06", durationMinutes: 46,
    maxDepthMeters: 29.4, ballastKg: 3, equipmentOwnership: "rented",
    suitType: "shorty", suitThicknessMm: 3, cylinderMaterial: "aluminum",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Aisha Rahman", "Daniel Ortiz"],
    diveCenter: "Ari Atoll Dive Centre", latitude: 3.88321, longitude: 72.81844,
    locationPrecision: "approximate",
    comments: "Inmersión al amanecer con corriente moderada. Agua a 28 °C y visibilidad de 30 m. Tiburones de punta blanca, tortugas, atunes y jureles cazando alrededor del thila. Uso de gancho solo en roca desnuda según indicación del guía. Salida con boya en aguas abiertas.",
    reflection: { wentWell: "Posición hidrodinámica y control del grupo con corriente.", improveNext: "Mantener la boya más recogida antes del despliegue.", practicedSkill: "Ascenso en azul con boya", comfort: "mixed", incidents: "Separación breve de un miembro del grupo, resuelta siguiendo el protocolo.", nextGoal: "Practicar despliegue de boya con corriente antes de otro viaje." }
  },
  {
    name: "SS Thistlegorm · Mar Rojo", date: "2025-11-18", durationMinutes: 42,
    maxDepthMeters: 30.7, ballastKg: 4, equipmentOwnership: "rented",
    suitType: "wetsuit", suitThicknessMm: 3, cylinderMaterial: "aluminum",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Daniel Ortiz"],
    diveCenter: "Sinai Divers", latitude: 27.81479, longitude: 33.92012,
    locationPrecision: "approximate",
    comments: "Primera inmersión exterior en el pecio, sin penetración en bodegas. Agua a 27 °C, visibilidad de 22 m y corriente fuerte sobre cubierta. Observamos motocicletas desde el exterior, peces cocodrilo y un gran napoleón. Descenso y ascenso siempre por el cabo de fondeo.",
    reflection: { wentWell: "Agarre y progresión por el cabo sin elevar el consumo.", improveNext: "Reforzar la señalización con el compañero cuando hay muchos grupos.", practicedSkill: "Descenso por cabo con corriente", comfort: "challenging", incidents: "Corriente fuerte y tráfico de buceadores; sin pérdida de contacto.", nextGoal: "Entrenar comunicación de proximidad antes de repetir un pecio concurrido." }
  },
  {
    name: "Blue Hole · Gozo", date: "2025-10-04", durationMinutes: 53,
    maxDepthMeters: 27.5, ballastKg: 5, equipmentOwnership: "owned",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "steel",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Marta Serra", "Jordi Casas"],
    diveCenter: "Gozo Technical Diving", latitude: 36.05371, longitude: 14.18892,
    locationPrecision: "approximate",
    comments: "Entrada por el Blue Hole y salida hacia la pared exterior. Visibilidad de 30 m, agua a 24 °C. Arco observado desde zona abierta, morenas y bancos de damiselas. Oleaje suave en la salida, realizada uno a uno siguiendo las instrucciones del guía.",
    reflection: { wentWell: "Buena conciencia del entorno y del resto del equipo.", improveNext: "Reservar más gas para disfrutar de la zona somera final.", practicedSkill: "Planificación de gas por tercios adaptada", comfort: "comfortable", incidents: "Sin incidencias.", nextGoal: "Calcular el consumo SAC con los datos de esta inmersión." }
  },
  {
    name: "Princess Alice Bank · Azores", date: "2025-08-23", durationMinutes: 44,
    maxDepthMeters: 32.1, ballastKg: 4, equipmentOwnership: "rented",
    suitType: "wetsuit", suitThicknessMm: 5, cylinderMaterial: "steel",
    cylinderVolumeLiters: 15, waterType: "salt", buddies: ["Marta Serra"],
    diveCenter: "Norberto Diver", latitude: 38.03572, longitude: -29.23641,
    locationPrecision: "approximate",
    comments: "Inmersión oceánica con descenso por cabo hasta la cima del banco. Agua a 22 °C, visibilidad superior a 35 m y corriente variable. Dos mantas oceánicas, mobulas y grandes bancos de bonitos. Se mantuvo siempre contacto con el cabo para el ascenso.",
    reflection: { wentWell: "Gestión conservadora del gas y calma en entorno azul abierto.", improveNext: "Ecualizar antes durante los primeros metros del descenso rápido.", practicedSkill: "Referencia visual en azul", comfort: "mixed", incidents: "Una compensación tardía obligó a detener el descenso durante un minuto.", nextGoal: "Practicar descensos verticales lentos sin perder la referencia del compañero." }
  },
  {
    name: "Palancar Gardens · Cozumel", date: "2025-06-14", durationMinutes: 59,
    maxDepthMeters: 25.8, ballastKg: 3, equipmentOwnership: "rented",
    suitType: "shorty", suitThicknessMm: 3, cylinderMaterial: "aluminum",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Sofía Navarro", "Luis Herrera"],
    diveCenter: "Aldora Divers", latitude: 20.35481, longitude: -87.02863,
    locationPrecision: "approximate",
    comments: "Deriva suave sobre jardines de coral con agua a 29 °C y visibilidad de 35 m. Tortuga verde, tiburón nodriza, pez sapo y rayas águila. Perfil multinivel aprovechando la corriente y salida con boya junto al guía. Se evitó cualquier contacto con el coral.",
    reflection: { wentWell: "Trim horizontal constante y gran control de separación respecto al arrecife.", improveNext: "Mirar más a menudo hacia atrás para mantener referencia del grupo.", practicedSkill: "Buceo en corriente a la deriva", comfort: "comfortable", incidents: "Sin incidencias.", nextGoal: "Liderar una deriva sencilla manteniendo agrupado al binomio." }
  },
  {
    name: "USAT Liberty · Tulamben", date: "2025-04-09", durationMinutes: 63,
    maxDepthMeters: 26.4, ballastKg: 2.5, equipmentOwnership: "rented",
    suitType: "shorty", suitThicknessMm: 3, cylinderMaterial: "aluminum",
    cylinderVolumeLiters: 12, waterType: "salt", buddies: ["Sofía Navarro"],
    diveCenter: "Tulamben Wreck Divers", latitude: -8.27418, longitude: 115.59302,
    locationPrecision: "approximate",
    comments: "Entrada desde playa de cantos y recorrido exterior por el pecio. Agua a 29 °C, visibilidad de 20 m. Pez loro gigante, caballitos pigmeos, barracudas y jardines de coral blando. Madrugamos para evitar grupos y mantuvimos distancia de las estructuras.",
    reflection: { wentWell: "Muy buen consumo y aproximación cuidadosa a la macrofauna.", improveNext: "Pedir ayuda para entrar con el equipo sobre los cantos si vuelve a haber oleaje.", practicedSkill: "Entrada y salida en playa de cantos", comfort: "comfortable", incidents: "Resbalón leve al salir, sin consecuencias ni daño al equipo.", nextGoal: "Mejorar la técnica de salida asistida en costas irregulares." }
  },
  {
    name: "Fisura de Silfra · Islandia", date: "2024-11-02", durationMinutes: 36,
    maxDepthMeters: 17.9, ballastKg: 10, equipmentOwnership: "rented",
    suitType: "drysuit", suitThicknessMm: 8, cylinderMaterial: "steel",
    cylinderVolumeLiters: 12, waterType: "fresh", buddies: ["Helga Jónsdóttir", "Álvaro Martín"],
    diveCenter: "DIVE.IS", latitude: 64.25591, longitude: -21.12374,
    locationPrecision: "approximate",
    comments: "Agua dulce a 3 °C y visibilidad superior a 80 m. Recorrido lineal entre las placas con traje seco y guantes gruesos. Botella y regulador preparados para agua fría. Se siguió el control térmico acordado y se finalizó al notar frío leve en las manos.",
    reflection: { wentWell: "Control del traje seco y flotabilidad sin aire atrapado en los pies.", improveNext: "Practicar señales con guantes gruesos antes de entrar.", practicedSkill: "Flotabilidad con traje seco", comfort: "challenging", incidents: "Frío leve en las manos al final; salida anticipada según el plan.", nextGoal: "Realizar otra inmersión de agua fría con mejor aislamiento de manos." }
  },
  {
    name: "Skottevik · Fiordos de Noruega", date: "2024-08-17", durationMinutes: 48,
    maxDepthMeters: 23.7, ballastKg: 11, equipmentOwnership: "rented",
    suitType: "drysuit", suitThicknessMm: 8, cylinderMaterial: "steel",
    cylinderVolumeLiters: 15, waterType: "salt", buddies: ["Erik Lund", "Álvaro Martín"],
    diveCenter: "One Ocean Dive Center", latitude: 58.14352, longitude: 8.12571,
    locationPrecision: "approximate",
    comments: "Inmersión de costa en agua a 9 °C, visibilidad de 16 m y mar tranquilo. Bosque de kelp, cangrejos, nudibranquios y bacalaos pequeños. Configuración de agua fría con reguladores redundantes. Ascenso por pendiente y parada de seguridad protegida entre algas.",
    reflection: { wentWell: "Gestión térmica y ajuste del lastre adecuados con botella de acero.", improveNext: "Distribuir parte del lastre en bolsillos altos para mejorar el trim.", practicedSkill: "Gestión de válvulas con guantes", comfort: "comfortable", incidents: "Sin incidencias.", nextGoal: "Probar una distribución de lastre 2 kg más alta en el torso." }
  }
];

async function insertDive(client, userId, dive) {
  const existing = await client.query(
    "SELECT id FROM dives WHERE user_id = $1 AND name = $2 AND dive_date = $3",
    [userId, dive.name, dive.date]
  );
  if (existing.rows[0]) return false;

  const result = await client.query(
    `INSERT INTO dives (
       user_id, name, dive_date, duration_minutes, max_depth_meters,
       ballast_kg, equipment_ownership, suit_type, suit_thickness_mm,
       cylinder_material, cylinder_volume_liters, water_type, dive_center,
       latitude, longitude, location_precision, comments
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
     ) RETURNING id`,
    [userId, dive.name, dive.date, dive.durationMinutes, dive.maxDepthMeters,
      dive.ballastKg, dive.equipmentOwnership, dive.suitType, dive.suitThicknessMm,
      dive.cylinderMaterial, dive.cylinderVolumeLiters, dive.waterType,
      dive.diveCenter, dive.latitude, dive.longitude, dive.locationPrecision,
      dive.comments]
  );
  const diveId = result.rows[0].id;

  await client.query(
    `INSERT INTO dive_buddies (dive_id, name, position)
     SELECT $1, entry.name, entry.ordinality - 1
       FROM unnest($2::text[]) WITH ORDINALITY AS entry(name, ordinality)`,
    [diveId, dive.buddies]
  );
  const reflection = dive.reflection;
  await client.query(
    `INSERT INTO dive_reflections (
       dive_id, went_well, improve_next, practiced_skill, comfort, incidents, next_goal
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [diveId, reflection.wentWell, reflection.improveNext,
      reflection.practicedSkill, reflection.comfort, reflection.incidents,
      reflection.nextGoal]
  );
  return true;
}

async function main() {
  const email = process.argv[2] || process.env.SEED_USER_EMAIL;
  if (!email) {
    throw new Error("Indica el correo de la cuenta: npm run seed:demo -- usuario@ejemplo.com");
  }

  const client = await database.pool.connect();
  try {
    const userResult = await client.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );
    if (!userResult.rows[0]) throw new Error(`No existe una cuenta local con el correo ${email}`);

    await client.query("BEGIN");
    let inserted = 0;
    for (const dive of dives) {
      if (await insertDive(client, userResult.rows[0].id, dive)) inserted += 1;
    }
    await client.query("COMMIT");
    console.log(`Inmersiones añadidas: ${inserted}. Ya existentes: ${dives.length - inserted}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await database.pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});


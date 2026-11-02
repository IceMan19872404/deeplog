const { z } = require("zod");

function isValidDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isNotFutureDate(value) {
  // The server cannot know the diver's time zone. Accept any date that is
  // already "today" somewhere on Earth (UTC+14), so a dive logged just after
  // local midnight east of UTC is not rejected as a future dive.
  const latestToday = new Date(Date.now() + 14 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return value <= latestToday;
}

const diveDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
  .refine(isValidDate, "Date is not valid")
  .refine(isNotFutureDate, "Date cannot be in the future");

const createDiveSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    date: diveDateSchema,
    durationMinutes: z.number().int().min(1).max(300),
    maxDepthMeters: z
      .number()
      .positive()
      .max(150)
      .multipleOf(0.01, "Depth can have at most two decimal places"),
    ballastKg: z
      .number()
      .min(0)
      .max(20)
      .multipleOf(0.01, "Ballast can have at most two decimal places")
      .optional(),
    equipmentOwnership: z.enum(["owned", "rented"]).optional(),
    suitType: z.enum(["wetsuit", "drysuit", "shorty", "none"]).optional(),
    suitThicknessMm: z.number().min(0).max(15).multipleOf(0.1).optional(),
    cylinderMaterial: z.enum(["steel", "aluminum"]).optional(),
    cylinderVolumeLiters: z.number().min(3).max(20).multipleOf(0.1).optional(),
    waterType: z.enum(["salt", "fresh"]).optional(),
    buddies: z
      .array(z.string().trim().min(2).max(80))
      .max(10)
      .default([]),
    diveCenter: z.string().trim().max(120).optional(),
    latitude: z.number().min(-90).max(90).multipleOf(0.00001).optional(),
    longitude: z.number().min(-180).max(180).multipleOf(0.00001).optional(),
    locationPrecision: z.enum(["exact", "approximate"]).optional(),
    comments: z.string().trim().max(5000).optional()
  })
  .strict()
  .superRefine((value, context) => {
    const provided = [value.latitude, value.longitude, value.locationPrecision]
      .filter((item) => item !== undefined).length;
    if (provided !== 0 && provided !== 3) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Latitude, longitude and locationPrecision must be provided together"
      });
    }
  });

const updateDiveSchema = createDiveSchema;

const diveIdSchema = z
  .object({
    diveId: z.string().regex(/^[1-9]\d*$/, "Dive ID must be a positive integer")
  })
  .strict();

const divePhotoIdSchema = z
  .object({
    diveId: z.string().regex(/^[1-9]\d*$/, "Dive ID must be a positive integer"),
    photoId: z.string().regex(/^[1-9]\d*$/, "Photo ID must be a positive integer")
  })
  .strict();

const listDivesSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    dateFrom: diveDateSchema.optional(),
    dateTo: diveDateSchema.optional(),
    diveCenter: z.string().trim().min(1).max(120).optional(),
    minDepth: z.coerce.number().positive().max(150).optional(),
    maxDepth: z.coerce.number().positive().max(150).optional()
  })
  .strict()
  .refine(
    (query) => !query.dateFrom || !query.dateTo || query.dateFrom <= query.dateTo,
    {
      message: "dateFrom cannot be after dateTo",
      path: ["dateFrom"]
    }
  )
  .refine(
    (query) =>
      query.minDepth === undefined ||
      query.maxDepth === undefined ||
      query.minDepth <= query.maxDepth,
    {
      message: "minDepth cannot be greater than maxDepth",
      path: ["minDepth"]
    }
  );

const configurationMemorySchema = z.object({
  waterType: z.enum(["salt", "fresh"]).optional(),
  suitType: z.enum(["wetsuit", "drysuit", "shorty", "none"]).optional(),
  suitThicknessMm: z.coerce.number().min(0).max(15).multipleOf(0.1).optional(),
  cylinderMaterial: z.enum(["steel", "aluminum"]).optional(),
  cylinderVolumeLiters: z.coerce.number().min(3).max(20).multipleOf(0.1).optional(),
  excludeDiveId: z.coerce.number().int().positive().optional()
}).strict().refine((value) => Object.keys(value).some((key) => key !== "excludeDiveId"), {
  message: "At least one configuration field is required"
});

module.exports = {
  createDiveSchema,
  updateDiveSchema,
  diveIdSchema,
  divePhotoIdSchema,
  listDivesSchema,
  configurationMemorySchema
};

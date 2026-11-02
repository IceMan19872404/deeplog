const { z } = require("zod");

const currentYear = new Date().getUTCFullYear();
const profileSchema = z.object({
  bio: z.string().trim().max(500).nullable().optional(),
  certificationLevel: z.enum([
    "beginner", "open_water", "advanced", "rescue", "divemaster", "instructor"
  ]).nullable().optional(),
  divingSince: z.number().int().min(1950).max(currentYear).nullable().optional(),
  shareNameByDefault: z.boolean()
}).strict();

module.exports = { profileSchema };

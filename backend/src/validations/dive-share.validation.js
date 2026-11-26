const { z } = require("zod");
const { positiveIdString } = require("./common.validation");

const id = positiveIdString("ID must be a positive integer");
const shareToken = z.string().regex(/^[a-f0-9]{64}$/, "Share token is invalid");

const visibilitySchema = z.object({
  includeDiverName: z.boolean().default(false),
  includeCenter: z.boolean().default(true),
  includeEquipment: z.boolean().default(true),
  includeBuddies: z.boolean().default(true),
  includeComments: z.boolean().default(true),
  photoIds: z.array(z.coerce.number().int().positive()).max(5).default([])
}).strict();

const createShareSchema = z.object({
  // No visibility at all means every field default above.
  visibility: visibilitySchema.default(() => visibilitySchema.parse({})),
  expiresInDays: z.union([z.literal(1), z.literal(7), z.literal(30), z.null()])
    .default(7),
  password: z.string().min(8).max(64).optional()
}).strict();

const diveIdSchema = z.object({ diveId: id }).strict();
const shareIdSchema = z.object({ diveId: id, shareId: z.string().uuid() }).strict();
const tokenSchema = z.object({ token: shareToken }).strict();
const sharePasswordSchema = z.object({
  password: z.string().min(8).max(64)
}).strict();
const publicPhotoSchema = z.object({
  token: shareToken,
  position: z.coerce.number().int().min(1).max(5)
}).strict();

module.exports = {
  createShareSchema,
  diveIdSchema,
  shareIdSchema,
  tokenSchema,
  sharePasswordSchema,
  publicPhotoSchema
};

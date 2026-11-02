const { z } = require("zod");

const clientErrorSchema = z.object({
  kind: z.enum(["error", "unhandledrejection"]),
  source: z.string().max(120).regex(/^(\/[-a-zA-Z0-9._/]*|inline|external)$/),
  line: z.number().int().min(0).max(1000000).nullable(),
  column: z.number().int().min(0).max(1000000).nullable()
}).strict();

module.exports = { clientErrorSchema };

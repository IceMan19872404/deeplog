const { z } = require("zod");

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(72),
  confirmation: z.literal("ELIMINAR", {
    errorMap: () => ({ message: "Confirmation must be ELIMINAR" })
  })
}).strict();

module.exports = { deleteAccountSchema };

const { z } = require("zod");

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2).max(50),
    lastName: z.string().trim().min(2).max(80),
    secondLastName: z.string().trim().max(80).optional(),
    email: z.string().trim().email().max(254),
    password: z
      .string()
      .min(8)
      .max(72)
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[0-9]/, "Password must contain a number")
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(72)
  })
  .strict();

const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email().max(254)
  })
  .strict();

const resetPasswordSchema = z
  .object({
    token: z.string().length(64),
    password: z
      .string()
      .min(8)
      .max(72)
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[0-9]/, "Password must contain a number")
  })
  .strict();

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};

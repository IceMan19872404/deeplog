const { z } = require("zod");

const optionalText = (maximum) => z.string().trim().max(maximum).nullable().optional();
const reflectionSchema = z.object({
  wentWell: optionalText(2000),
  improveNext: optionalText(2000),
  practicedSkill: optionalText(120),
  comfort: z.enum(["comfortable", "mixed", "challenging"]).nullable().optional(),
  incidents: optionalText(2000),
  nextGoal: optionalText(500)
}).strict().refine(
  (value) => Object.values(value).some((item) => typeof item === "string" && item.length > 0),
  { message: "At least one reflection field is required" }
);

module.exports = { reflectionSchema };

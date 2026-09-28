import { z } from "zod";
import { ApiError } from "./ApiError.js";

/** Parses input against a schema; throws a 400 listing each invalid field. */
export const validate = <T extends z.ZodType>(schema: T, input: unknown): z.infer<T> => {
  const result = schema.safeParse(input ?? {});
  if (result.success) return result.data;
  const errors = result.error.issues.map((i) => ({ field: i.path.join(".") || null, message: i.message }));
  throw new ApiError(400, errors[0]?.message ?? "Invalid input.", errors);
};

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(30, "Username must be at most 30 characters.")
  .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/, "Use lowercase letters, numbers, - and _ (not at the start or end).");

export const emailSchema = z.email("Enter a valid email address.").trim().toLowerCase().max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.");

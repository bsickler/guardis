import { z } from "zod";
import { INVALID_USER, VALID_USER } from "../data/object-schema.ts";

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  active: z.boolean(),
  score: z.number(),
  email: z.string().optional(),
});

Deno.bench({ name: "zod: object (valid)", fn() { UserSchema.safeParse(VALID_USER); } });
Deno.bench({ name: "zod: object (invalid)", fn() { UserSchema.safeParse(INVALID_USER); } });

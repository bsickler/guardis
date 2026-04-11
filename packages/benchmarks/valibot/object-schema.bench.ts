import * as v from "valibot";
import { INVALID_USER, VALID_USER } from "../data/object-schema.ts";

const UserSchema = v.object({
  name: v.string(),
  age: v.number(),
  active: v.boolean(),
  score: v.number(),
  email: v.optional(v.string()),
});

Deno.bench({ name: "valibot: object (valid)", fn() { v.safeParse(UserSchema, VALID_USER); } });
Deno.bench({
  name: "valibot: object (invalid)",
  fn() { v.safeParse(UserSchema, INVALID_USER); },
});

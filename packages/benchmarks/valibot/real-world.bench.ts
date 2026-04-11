import * as v from "valibot";
import { INVALID_API_REQUEST, VALID_API_REQUEST } from "../data/real-world.ts";

const ApiRequestSchema = v.object({
  user: v.object({
    name: v.string(),
    email: v.string(),
    age: v.number(),
    active: v.boolean(),
  }),
  address: v.object({
    street: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
  }),
  tags: v.array(v.string()),
  metadata: v.object({
    source: v.string(),
    version: v.number(),
    referral: v.string(),
  }),
});

Deno.bench({
  name: "valibot: real-world (valid)",
  fn() { v.safeParse(ApiRequestSchema, VALID_API_REQUEST); },
});
Deno.bench({
  name: "valibot: real-world (invalid)",
  fn() { v.safeParse(ApiRequestSchema, INVALID_API_REQUEST); },
});

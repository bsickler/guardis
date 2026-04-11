import { z } from "zod";
import { INVALID_API_REQUEST, VALID_API_REQUEST } from "../data/real-world.ts";

const ApiRequestSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string(),
    age: z.number(),
    active: z.boolean(),
  }),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
  }),
  tags: z.array(z.string()),
  metadata: z.object({
    source: z.string(),
    version: z.number(),
    referral: z.string(),
  }),
});

Deno.bench({
  name: "zod: real-world (valid)",
  fn() { ApiRequestSchema.safeParse(VALID_API_REQUEST); },
});
Deno.bench({
  name: "zod: real-world (invalid)",
  fn() { ApiRequestSchema.safeParse(INVALID_API_REQUEST); },
});

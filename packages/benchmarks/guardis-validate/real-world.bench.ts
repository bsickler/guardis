import { createTypeGuard, isArray, isBoolean, isNumber, isString } from "@spudlabs/guardis";
import { INVALID_API_REQUEST, VALID_API_REQUEST } from "../data/real-world.ts";

const isApiRequest = createTypeGuard({
  user: {
    name: isString,
    email: isString,
    age: isNumber,
    active: isBoolean,
  },
  address: {
    street: isString,
    city: isString,
    state: isString,
    zip: isString,
  },
  tags: isArray.of(isString),
  metadata: {
    source: isString,
    version: isNumber,
    referral: isString,
  },
});

// Validate-path benchmarks: uses .validate() which returns a StandardSchemaV1.Result
// with full issue tracking. Compares apples-to-apples with Zod.safeParse, etc.

Deno.bench({
  name: "guardis-validate: real-world (valid)",
  fn() {
    isApiRequest.validate(VALID_API_REQUEST);
  },
});
Deno.bench({
  name: "guardis-validate: real-world (invalid)",
  fn() {
    isApiRequest.validate(INVALID_API_REQUEST);
  },
});

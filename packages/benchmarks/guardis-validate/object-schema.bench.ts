import { createTypeGuard, isBoolean, isNumber, isString } from "@spudlabs/guardis";
import { INVALID_USER, VALID_USER } from "../data/object-schema.ts";

const isUser = createTypeGuard({
  name: isString,
  age: isNumber,
  active: isBoolean,
  score: isNumber,
  email: isString.optional,
});

// Validate-path benchmarks: uses .validate() which returns a StandardSchemaV1.Result
// with full issue tracking. Compares apples-to-apples with Zod.safeParse, etc.

Deno.bench({
  name: "guardis-validate: object (valid)",
  fn() { isUser.validate(VALID_USER); },
});
Deno.bench({
  name: "guardis-validate: object (invalid)",
  fn() { isUser.validate(INVALID_USER); },
});

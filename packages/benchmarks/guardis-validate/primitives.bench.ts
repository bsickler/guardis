import { isBoolean, isNumber, isString } from "@spudlabs/guardis";
import {
  INVALID_BOOLEAN,
  INVALID_NUMBER,
  INVALID_STRING,
  VALID_BOOLEAN,
  VALID_NUMBER,
  VALID_STRING,
} from "../data/primitives.ts";

// Validate-path benchmarks: uses .validate() which returns a StandardSchemaV1.Result
// with full issue tracking. Compares apples-to-apples with Zod.safeParse, valibot.safeParse, etc.

Deno.bench({
  name: "guardis-validate: string (valid)",
  fn() { isString.validate(VALID_STRING); },
});
Deno.bench({
  name: "guardis-validate: string (invalid)",
  fn() { isString.validate(INVALID_STRING); },
});
Deno.bench({
  name: "guardis-validate: number (valid)",
  fn() { isNumber.validate(VALID_NUMBER); },
});
Deno.bench({
  name: "guardis-validate: number (invalid)",
  fn() { isNumber.validate(INVALID_NUMBER); },
});
Deno.bench({
  name: "guardis-validate: boolean (valid)",
  fn() { isBoolean.validate(VALID_BOOLEAN); },
});
Deno.bench({
  name: "guardis-validate: boolean (invalid)",
  fn() { isBoolean.validate(INVALID_BOOLEAN); },
});

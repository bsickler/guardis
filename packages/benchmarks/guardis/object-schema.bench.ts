import { createTypeGuard, isBoolean, isNumber, isString } from "@spudlabs/guardis";
import { INVALID_USER, VALID_USER } from "../data/object-schema.ts";

const isUser = createTypeGuard({
  name: isString,
  age: isNumber,
  active: isBoolean,
  score: isNumber,
  email: isString.optional,
});

Deno.bench({ name: "guardis: object (valid)", fn() { isUser(VALID_USER); } });
Deno.bench({ name: "guardis: object (invalid)", fn() { isUser(INVALID_USER); } });

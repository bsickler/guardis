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

Deno.bench({
  name: "guardis: real-world (valid)",
  fn() {
    isApiRequest(VALID_API_REQUEST);
  },
});
Deno.bench({
  name: "guardis: real-world (invalid)",
  fn() {
    isApiRequest(INVALID_API_REQUEST);
  },
});

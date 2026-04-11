import { type } from "arktype";
import { INVALID_API_REQUEST, VALID_API_REQUEST } from "../data/real-world.ts";

const ApiRequest = type({
  user: {
    name: "string",
    email: "string",
    age: "number",
    active: "boolean",
  },
  address: {
    street: "string",
    city: "string",
    state: "string",
    zip: "string",
  },
  tags: "string[]",
  metadata: {
    source: "string",
    version: "number",
    referral: "string",
  },
});

Deno.bench({
  name: "arktype: real-world (valid)",
  fn() { ApiRequest(VALID_API_REQUEST); },
});
Deno.bench({
  name: "arktype: real-world (invalid)",
  fn() { ApiRequest(INVALID_API_REQUEST); },
});

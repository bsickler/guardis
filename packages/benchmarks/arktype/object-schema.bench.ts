import { type } from "arktype";
import { INVALID_USER, VALID_USER } from "../data/object-schema.ts";

const User = type({
  name: "string",
  age: "number",
  active: "boolean",
  score: "number",
  "email?": "string",
});

Deno.bench({ name: "arktype: object (valid)", fn() { User(VALID_USER); } });
Deno.bench({ name: "arktype: object (invalid)", fn() { User(INVALID_USER); } });

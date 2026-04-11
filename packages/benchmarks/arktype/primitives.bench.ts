import { type } from "arktype";
import {
  INVALID_BOOLEAN,
  INVALID_NUMBER,
  INVALID_STRING,
  VALID_BOOLEAN,
  VALID_NUMBER,
  VALID_STRING,
} from "../data/primitives.ts";

const arkString = type("string");
const arkNumber = type("number");
const arkBoolean = type("boolean");

Deno.bench({ name: "arktype: string (valid)", fn() { arkString(VALID_STRING); } });
Deno.bench({ name: "arktype: string (invalid)", fn() { arkString(INVALID_STRING); } });
Deno.bench({ name: "arktype: number (valid)", fn() { arkNumber(VALID_NUMBER); } });
Deno.bench({ name: "arktype: number (invalid)", fn() { arkNumber(INVALID_NUMBER); } });
Deno.bench({ name: "arktype: boolean (valid)", fn() { arkBoolean(VALID_BOOLEAN); } });
Deno.bench({ name: "arktype: boolean (invalid)", fn() { arkBoolean(INVALID_BOOLEAN); } });

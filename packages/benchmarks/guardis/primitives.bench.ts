import { isBoolean, isNumber, isString } from "@spudlabs/guardis";
import {
  INVALID_BOOLEAN,
  INVALID_NUMBER,
  INVALID_STRING,
  VALID_BOOLEAN,
  VALID_NUMBER,
  VALID_STRING,
} from "../data/primitives.ts";

Deno.bench({ name: "guardis: string (valid)", fn() { isString(VALID_STRING); } });
Deno.bench({ name: "guardis: string (invalid)", fn() { isString(INVALID_STRING); } });
Deno.bench({ name: "guardis: number (valid)", fn() { isNumber(VALID_NUMBER); } });
Deno.bench({ name: "guardis: number (invalid)", fn() { isNumber(INVALID_NUMBER); } });
Deno.bench({ name: "guardis: boolean (valid)", fn() { isBoolean(VALID_BOOLEAN); } });
Deno.bench({ name: "guardis: boolean (invalid)", fn() { isBoolean(INVALID_BOOLEAN); } });

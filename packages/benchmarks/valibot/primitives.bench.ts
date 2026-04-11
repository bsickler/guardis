import * as v from "valibot";
import {
  INVALID_BOOLEAN,
  INVALID_NUMBER,
  INVALID_STRING,
  VALID_BOOLEAN,
  VALID_NUMBER,
  VALID_STRING,
} from "../data/primitives.ts";

const vString = v.string();
const vNumber = v.number();
const vBoolean = v.boolean();

Deno.bench({ name: "valibot: string (valid)", fn() { v.safeParse(vString, VALID_STRING); } });
Deno.bench({ name: "valibot: string (invalid)", fn() { v.safeParse(vString, INVALID_STRING); } });
Deno.bench({ name: "valibot: number (valid)", fn() { v.safeParse(vNumber, VALID_NUMBER); } });
Deno.bench({ name: "valibot: number (invalid)", fn() { v.safeParse(vNumber, INVALID_NUMBER); } });
Deno.bench({ name: "valibot: boolean (valid)", fn() { v.safeParse(vBoolean, VALID_BOOLEAN); } });
Deno.bench({
  name: "valibot: boolean (invalid)",
  fn() { v.safeParse(vBoolean, INVALID_BOOLEAN); },
});

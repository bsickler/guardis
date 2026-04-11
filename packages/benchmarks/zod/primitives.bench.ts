import { z } from "zod";
import {
  INVALID_BOOLEAN,
  INVALID_NUMBER,
  INVALID_STRING,
  VALID_BOOLEAN,
  VALID_NUMBER,
  VALID_STRING,
} from "../data/primitives.ts";

const zString = z.string();
const zNumber = z.number();
const zBoolean = z.boolean();

Deno.bench({ name: "zod: string (valid)", fn() { zString.safeParse(VALID_STRING); } });
Deno.bench({ name: "zod: string (invalid)", fn() { zString.safeParse(INVALID_STRING); } });
Deno.bench({ name: "zod: number (valid)", fn() { zNumber.safeParse(VALID_NUMBER); } });
Deno.bench({ name: "zod: number (invalid)", fn() { zNumber.safeParse(INVALID_NUMBER); } });
Deno.bench({ name: "zod: boolean (valid)", fn() { zBoolean.safeParse(VALID_BOOLEAN); } });
Deno.bench({ name: "zod: boolean (invalid)", fn() { zBoolean.safeParse(INVALID_BOOLEAN); } });

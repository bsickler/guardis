import { assert, assertFalse, assertThrows } from "@std/assert";
import { extend } from "./extend.ts";

Deno.test("extend", () => {
  const Is = extend({
    MySillyType: (v: unknown) => {
      if (v === 10 || v === "meatball") {
        return v;
      }

      return null;
    },
  });

  assert("MySillyType" in Is);
  assert(Is.MySillyType(10));
  assert(Is.MySillyType("meatball"));
  assertFalse(Is.MySillyType(1));

  assert("strict" in Is.MySillyType);
  assert(Is.MySillyType.strict(10));
  assertThrows(() => Is.MySillyType.strict("sausage"));
});

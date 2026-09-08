// Side-effect import: stamps base specs and patches chain methods. Must run
// before any of the isString/isNumber/isArray chaining below.
import "./src/modules/primitives.ts";

import { assertEquals } from "@std/assert";
import { createTypeGuard, isString } from "@spudlabs/guardis";
import { registerGen, resolveSpec } from "./mod.ts";

Deno.test("escape hatch", async (t) => {
  await t.step("registerGen overrides for a fully custom guard", () => {
    const isZip = createTypeGuard(
      "zip",
      (v: unknown): string | null => typeof v === "string" && /^\d{5}$/.test(v) ? v : null,
    );
    registerGen(isZip, { kind: "string", constraints: { min: 5, max: 5 } });

    const value = isZip.generate();
    assertEquals(value.length, 5);
  });

  await t.step("explicit registerGen wins over an inherited default", () => {
    const derived = isString.extend((v: string) => v.length > 0 ? v : null);
    // Default: inherits isString's plain spec.
    assertEquals(resolveSpec(derived)?.kind, "string");

    registerGen(derived, { kind: "number", constraints: {} });
    assertEquals(resolveSpec(derived)?.kind, "number");
  });
});

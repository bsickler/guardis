import "./modules/primitives.ts";

import { assertEquals } from "@std/assert";
import { createTypeGuard, isString, type TypeGuard } from "@spudlabs/guardis";
import { registerGen, resolveSpec } from "./spec.ts";

Deno.test("resolveSpec", async (t) => {
  await t.step("returns undefined for undefined", () => {
    assertEquals(resolveSpec(undefined), undefined);
  });

  await t.step("returns undefined when neither the guard nor any ancestor has a spec", () => {
    const isPlain = createTypeGuard(
      "plain",
      (v: unknown): string | null => typeof v === "string" ? v : null,
    );
    assertEquals(resolveSpec(isPlain), undefined);
  });

  await t.step("walks multiple GUARDIS_PARENT hops to find the nearest registered ancestor", () => {
    const isStep1 = isString.extend((v: string) => v.length > 0 ? v : null);
    const isStep2 = isStep1.extend((v: string) => v.length < 100 ? v : null);
    const isStep3 = isStep2.extend((v: string) => v === v.trim() ? v : null);

    assertEquals(resolveSpec(isStep3)?.kind, "string");
  });

  await t.step("wraps an .optional guard's resolved spec in kind 'optional'", () => {
    const isThing = createTypeGuard(
      "thing",
      (v: unknown): string | null => typeof v === "string" ? v : null,
    );
    registerGen(isThing, { kind: "string", constraints: { min: 4 } });

    const spec = resolveSpec(isThing.optional);
    assertEquals(spec?.kind, "optional");
    assertEquals(spec && "inner" in spec ? spec.inner : undefined, {
      kind: "string",
      constraints: { min: 4 },
    });
  });

  await t.step("an explicit own spec on the .optional guard itself skips the wrap", () => {
    const isThing = createTypeGuard(
      "thing",
      (v: unknown): string | null => typeof v === "string" ? v : null,
    );
    registerGen(isThing, { kind: "string", constraints: {} });
    registerGen(isThing.optional, { kind: "number", constraints: {} });

    assertEquals(resolveSpec(isThing.optional)?.kind, "number");
  });

  await t.step("plain .notEmpty is never wrapped, only .optional/.notEmpty.optional are", () => {
    const isThing = createTypeGuard(
      "thing",
      (v: unknown): string | null => typeof v === "string" ? v : null,
    );
    registerGen(isThing, { kind: "string", constraints: {} });

    // .notEmpty's own type is an anonymous inline shape in core (not the
    // named TypeGuard<T>/OptionalTypeGuard<T> interfaces guardis-gen can
    // augment), so it's not directly assignable to resolveSpec's parameter
    // type even though the runtime object is a real, usable guard.
    assertEquals(resolveSpec(isThing.notEmpty as unknown as TypeGuard<unknown>)?.kind, "string");
    assertEquals(resolveSpec(isThing.notEmpty.optional)?.kind, "optional");
  });

  await t.step(
    "returns undefined, not a wrapper with no inner, when the parent has no spec",
    () => {
      const isPlain = createTypeGuard(
        "plain",
        (v: unknown): string | null => typeof v === "string" ? v : null,
      );
      assertEquals(resolveSpec(isPlain.optional), undefined);
    },
  );
});

Deno.test("registerGen", () => {
  const isThing = createTypeGuard(
    "thing",
    (v: unknown): string | null => typeof v === "string" ? v : null,
  );

  registerGen(isThing, { kind: "string", constraints: { min: 1 } });
  assertEquals(resolveSpec(isThing)?.kind, "string");

  registerGen(isThing, { kind: "number", constraints: {} });
  assertEquals(resolveSpec(isThing)?.kind, "number");
});

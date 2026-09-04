import "./modules/primitives.ts";
import "./object.ts";

import { assert, assertEquals, assertThrows } from "@std/assert";
import { createTypeGuard, isString, type TypeGuard } from "@spudlabs/guardis";
import { deref, fixedSpec, registerGen, resolveSpec, specRef, unresolvedSpec } from "./spec.ts";

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

  await t.step("returns undefined for a bare predicate, rather than throwing", () => {
    const isNumberPredicate = (v: unknown): v is number => typeof v === "number";
    assertEquals(resolveSpec(isNumberPredicate as unknown as TypeGuard<unknown>), undefined);
  });
});

Deno.test("deref", async (t) => {
  await t.step("a { spec } source returns that spec identically", () => {
    const spec = fixedSpec({ kind: "string", constraints: { min: 1 } });
    assertEquals(deref(spec), { kind: "string", constraints: { min: 1 } });
  });

  await t.step("specRef(g) derefs to resolveSpec(g) for a guard with a spec", () => {
    const isThing = createTypeGuard(
      "thing",
      (v: unknown): string | null => typeof v === "string" ? v : null,
    );
    registerGen(isThing, { kind: "string", constraints: { min: 3 } });

    assertEquals(deref(specRef(isThing)), resolveSpec(isThing));
  });

  await t.step("specRef(g) is undefined for a guard with no spec", () => {
    const isPlain = createTypeGuard(
      "plain",
      (v: unknown): string | null => typeof v === "string" ? v : null,
    );
    assertEquals(deref(specRef(isPlain)), undefined);
  });

  await t.step("deref(undefined) is undefined", () => {
    assertEquals(deref(undefined), undefined);
  });

  await t.step("specRef(g.optional) derefs to an optional-wrapped spec", () => {
    const isThing = createTypeGuard(
      "thing",
      (v: unknown): string | null => typeof v === "string" ? v : null,
    );
    registerGen(isThing, { kind: "string", constraints: {} });

    const spec = deref(specRef(isThing.optional));
    assertEquals(spec?.kind, "optional");
    assertEquals(spec && "inner" in spec ? spec.inner : undefined, {
      kind: "string",
      constraints: {},
    });
  });
});

Deno.test("createTypeGuard accepts a bare predicate field without throwing", () => {
  const guard = createTypeGuard({
    n: (v: unknown): v is number => typeof v === "number",
    name: isString,
  });
  assertEquals(typeof guard, "function");
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

Deno.test("unresolvedSpec", async (t) => {
  await t.step(
    "a constructed guard with no generator points at .defineGenerator()/registerGen()",
    () => {
      const isThing = createTypeGuard(
        "thing",
        (v: unknown): string | null => typeof v === "string" ? v : null,
      );
      const spec = unresolvedSpec("array element", isThing);
      const error = assertThrows(() => (spec as { generate: () => void }).generate(), Error);
      assert(error.message.includes("thing"), error.message);
      assert(error.message.includes(".defineGenerator()"), error.message);
      assert(error.message.includes("registerGen()"), error.message);
    },
  );

  await t.step(
    "a bare predicate has no plugin bag, so the advice doesn't point at either dead end",
    () => {
      const bare = (v: unknown): v is string => typeof v === "string";
      const spec = unresolvedSpec(".or() branch", bare);
      const error = assertThrows(() => (spec as { generate: () => void }).generate(), Error);
      assert(error.message.includes("bare"), error.message);
      assert(!error.message.includes(".defineGenerator()"), error.message);
      assert(!error.message.includes("registerGen()"), error.message);
    },
  );
});

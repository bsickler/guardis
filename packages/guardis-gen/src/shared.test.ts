import "./modules/primitives.ts";

import { assert, assertEquals, assertThrows } from "@std/assert";
import { createTypeGuard, isString } from "@spudlabs/guardis";
import { registerGen } from "./spec.ts";
import { attachGenerate } from "./shared.ts";

Deno.test("attachGenerate", async (t) => {
  await t.step("installs .generate() directly on an already-built guard", () => {
    const isThing = createTypeGuard(
      "thing",
      (v: unknown): string | null => typeof v === "string" ? v : null,
    );
    // Not asserting .generate is absent beforehand: this file's own
    // modules/primitives.ts import (needed for the isString-based tests
    // below) means the construction hook is already registered globally by
    // the time this guard is built, so calling attachGenerate directly here
    // is redundant-but-harmless -- the point is confirming it installs a
    // working .generate, not proving it was previously missing.
    attachGenerate(isThing);
    registerGen(isThing, { kind: "string", constraints: { ofLength: 6 } });

    assertEquals(typeof isThing.generate, "function");
    assertEquals(isThing.generate().length, 6);
  });

  await t.step("with no genDefaults set, only call-time options matter", () => {
    const isThing = createTypeGuard(
      "thing2",
      (v: unknown): string | null => typeof v === "string" ? v : null,
    );
    attachGenerate(isThing);
    registerGen(isThing, { kind: "string", constraints: {} });

    // A hand-built custom guard has no typed generate() options overload
    // (see spec.ts's GenerateOptionsFor -- only object/branded guards get
    // one), so this call reaches through the same untyped `unknown`
    // dispatch attachGenerate always uses at runtime, purely to exercise
    // the call-time-options-only path with no genDefaults registered.
    // Cast the guard itself (not just the method) so `this` stays bound.
    const untyped = isThing as unknown as { generate(options?: unknown): string };
    assertEquals(untyped.generate({ ofLength: 4 }).length, 4);
  });
});

Deno.test("isString.optional.generate() (core singleton, wired via attachToVariants)", () => {
  const results = new Set<boolean>();
  for (let i = 0; i < 50; i++) {
    results.add(isString.optional.generate() === undefined);
  }
  assert(results.has(true), "never resolved to undefined across 50 samples");
  assert(results.has(false), "never resolved to a string across 50 samples");
});

Deno.test("isString.notEmpty.generate() never resolves to undefined", () => {
  // .notEmpty's own type is an anonymous inline shape in core, not
  // TypeGuard<T>/OptionalTypeGuard<T> -- see spec.test.ts's matching note.
  const notEmpty = isString.notEmpty as unknown as { generate(): string };
  for (let i = 0; i < 20; i++) {
    assertEquals(typeof notEmpty.generate(), "string");
  }
});

Deno.test("isString.notEmpty.optional.generate() resolves to both undefined and a string", () => {
  const results = new Set<boolean>();
  for (let i = 0; i < 50; i++) {
    results.add(isString.notEmpty.optional.generate() === undefined);
  }
  assert(results.has(true), "never resolved to undefined across 50 samples");
  assert(results.has(false), "never resolved to a string across 50 samples");
});

Deno.test("guard.defineGenerator(fn) on .optional bypasses the wrap entirely", () => {
  const isThing = isString.extend(
    "thing4",
    (v: string) => v.length > 0 ? v : null,
  );
  isThing.optional.defineGenerator(() => "always-present");

  for (let i = 0; i < 10; i++) {
    assertEquals(isThing.optional.generate(), "always-present");
  }
});

Deno.test("guard.defineGenerator(fn) on .optional still validates its own output", () => {
  const isThing = isString.extend(
    "thing5",
    (v: string) => v.length > 0 ? v : null,
  );
  isThing.optional.defineGenerator(() => "");

  assertThrows(
    () => isThing.optional.generate(),
    TypeError,
    "produced a value that fails its own guard",
  );
});

Deno.test("registered defaults on .optional apply to the present branch without defeating the wrap", () => {
  const isThing = isString.extend(
    "thing6",
    (v: string) => v.length > 0 ? v : null,
  );
  // Same cast as define-generator.test.ts's primitive constraint-merge test
  // -- a plain (non-object, non-branded) guard has no typed defineGenerator()
  // options overload, .optional included.
  const optional = isThing.optional as unknown as {
    defineGenerator(defaults: unknown): void;
    generate(): string | undefined;
  };
  optional.defineGenerator({ ofLength: 6 });

  const results = new Set<boolean>();
  for (let i = 0; i < 50; i++) {
    const value = optional.generate();
    results.add(value === undefined);
    if (value !== undefined) assertEquals(value.length, 6);
  }
  assert(results.has(true), "never resolved to undefined across 50 samples");
  assert(results.has(false), "never resolved to a string across 50 samples");
});

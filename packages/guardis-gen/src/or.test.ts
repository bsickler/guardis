import "./modules/primitives.ts";

import { assert, assertEquals } from "@std/assert";
import { createTypeGuard, isNumber, isString } from "@spudlabs/guardis";
import { registerGen, resolveSpec } from "./spec.ts";
import { attachOrSpec, ensureOrCapability } from "./or.ts";

Deno.test("attachOrSpec", async (t) => {
  await t.step("a.or(b) registers a union spec with both branches", () => {
    const isThing = isString.or(isNumber);
    assertEquals(resolveSpec(isThing), {
      kind: "union",
      branches: [
        { kind: "string", constraints: {} },
        { kind: "number", constraints: {} },
      ],
    });
  });

  await t.step("generate() resolves to both branch types across samples", () => {
    const isThing = isString.or(isNumber);
    const kinds = new Set<string>();
    for (let i = 0; i < 50; i++) {
      kinds.add(typeof isThing.generate());
    }
    assert(kinds.has("string"), "never resolved to the string branch across 50 samples");
    assert(kinds.has("number"), "never resolved to the number branch across 50 samples");
  });

  await t.step("a bare (guard-less) predicate branch falls back instead of throwing", () => {
    const isEven = (v: unknown): v is number => typeof v === "number" && v % 2 === 0;
    const isThing = isNumber.or(isEven);
    assertEquals(resolveSpec(isThing), {
      kind: "union",
      branches: [
        { kind: "number", constraints: {} },
        { kind: "string", constraints: {} }, // isEven has no meta -- falls back to DEFAULT_ELEMENT_SPEC
      ],
    });
  });

  await t.step("chaining .or().or() nests a union spec and keeps generating valid data", () => {
    const isFlag = createTypeGuard(
      "flag",
      (v: unknown): boolean | null => typeof v === "boolean" ? v : null,
    );
    registerGen(isFlag, { kind: "boolean" });

    const isThing = isString.or(isNumber).or(isFlag);
    for (let i = 0; i < 20; i++) {
      const value = isThing.generate();
      assert(isThing(value), `generated value ${JSON.stringify(value)} failed its own guard`);
    }
  });

  await t.step("installs .or() wrapping directly on an already-built guard", () => {
    const isThing = createTypeGuard(
      "thing",
      (v: unknown): string | null => typeof v === "string" ? v : null,
    );
    registerGen(isThing, { kind: "string", constraints: {} });
    // Not asserting the wrap is absent beforehand -- same reasoning as
    // shared.test.ts's attachGenerate test: this file's own
    // modules/primitives.ts import means the construction hook is already
    // globally registered by the time isThing is built, so calling
    // attachOrSpec directly here is redundant-but-harmless.
    attachOrSpec(isThing);

    const isCombined = isThing.or(isNumber);
    assertEquals(resolveSpec(isCombined)?.kind, "union");
  });
});

Deno.test("ensureOrCapability", () => {
  ensureOrCapability();
  ensureOrCapability();

  const isThing = createTypeGuard(
    "thing2",
    (v: unknown): string | null => typeof v === "string" ? v : null,
  );
  registerGen(isThing, { kind: "string", constraints: {} });

  const isCombined = isThing.or(isNumber);
  assertEquals(resolveSpec(isCombined)?.kind, "union");
});

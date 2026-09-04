import "./modules/primitives.ts";

import { assert, assertEquals } from "@std/assert";
import { createTypeGuard, isNumber, isString } from "@spudlabs/guardis";
import { registerGen, resolveSpec, specRef } from "./spec.ts";
import { attachOrSpec } from "./or.ts";
import { seed } from "./utilities/rng.ts";

Deno.test("attachOrSpec", async (t) => {
  await t.step("a.or(b) registers a union spec with both branches, late-bound", () => {
    const isThing = isString.or(isNumber);
    assertEquals(resolveSpec(isThing), {
      kind: "union",
      branches: [specRef(isString), specRef(isNumber)],
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

  await t.step(
    "a bare (guard-less) predicate branch is never dropped, but throws a useful message if picked",
    () => {
      const isEven = (v: unknown): v is number => typeof v === "number" && v % 2 === 0;
      const isThing = isNumber.or(isEven);
      const spec = resolveSpec(isThing);
      assertEquals(spec?.kind, "union");
      // isEven has no plugin bag to point at via specRef -- but it's still a
      // legal .or() branch, and dropping it would shift pick()'s branch
      // arity (isNumber would then always win). It keeps a spot in
      // `branches` so arity survives, but generating it now throws instead
      // of fabricating a wrong-typed value for whatever isEven actually
      // checks -- silently generating a number-typed default would be no
      // better, since a bare predicate could check anything.
      assertEquals((spec && "branches" in spec ? spec.branches : [])[0], specRef(isNumber));

      let sawThrow = false;
      let sawNumber = false;
      for (let s = 0; s < 50 && !(sawThrow && sawNumber); s++) {
        seed(s);
        try {
          assertEquals(typeof isThing.generate(), "number");
          sawNumber = true;
        } catch (error) {
          assert((error as Error).message.includes("isEven"), (error as Error).message);
          sawThrow = true;
        }
      }
      assert(sawThrow, "the bare predicate branch was never picked across 50 seeds");
      assert(sawNumber, "the isNumber branch was never picked across 50 seeds");
    },
  );

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

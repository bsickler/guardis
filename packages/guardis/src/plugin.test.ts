import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { createTypeGuard } from "./guard.ts";
import { guardParent, pluginBag, registerConstructionHook } from "./plugin.ts";
import type { TypeGuard } from "./types.ts";
import { isNumber, isString } from "./modules/primitives.ts";

const stringParser = (v: unknown): string | null => typeof v === "string" ? v : null;

Deno.test("plugin bag", async (t) => {
  await t.step("every guard gets an own, empty bag by default", () => {
    const isFoo = createTypeGuard("foo", stringParser);
    assertEquals(pluginBag(isFoo), {});
  });

  await t.step("shape-based guards also get a bag", () => {
    const isPerson = createTypeGuard({ name: isString, age: isNumber });
    assertEquals(pluginBag(isPerson), {});
  });

  await t.step("each guard gets its own bag instance, not a shared one", () => {
    const a = createTypeGuard("a", stringParser);
    const b = createTypeGuard("b", stringParser);
    assert(pluginBag(a) !== pluginBag(b));
  });
});

Deno.test("parent pointer", async (t) => {
  await t.step("extend() stamps the parent", () => {
    const base = createTypeGuard("base", stringParser);
    const derived = base.extend((v: string) => v.length > 0 ? v : null);
    assertStrictEquals(guardParent(derived), base);
  });

  await t.step("extend() with a shape stamps the parent", () => {
    const base = createTypeGuard({ name: isString });
    const derived = base.extend({ age: isNumber });
    assertStrictEquals(guardParent(derived), base);
  });

  await t.step(".optional stamps the parent", () => {
    const base = createTypeGuard("base", stringParser);
    assertStrictEquals(guardParent(base.optional), base);
  });

  await t.step(".notEmpty stamps the parent", () => {
    const base = createTypeGuard("base", stringParser);
    assertStrictEquals(guardParent(base.notEmpty as unknown as TypeGuard<unknown>), base);
  });

  await t.step("base guards have no parent", () => {
    const base = createTypeGuard("base", stringParser);
    assertEquals(guardParent(base), undefined);
  });

  await t.step(".or() does not stamp a parent (multi-parent, out of scope)", () => {
    const a = createTypeGuard("a", stringParser);
    const combined = a.or(isNumber);
    assertEquals(guardParent(combined), undefined);
  });
});

Deno.test("construction hooks", async (t) => {
  await t.step("run once for every guard, including parser and shape paths", () => {
    const seen: unknown[] = [];
    registerConstructionHook((guard) => seen.push(guard));

    const parserGuard = createTypeGuard("p", stringParser);
    const shapeGuard = createTypeGuard({ name: isString });

    assert(seen.includes(parserGuard));
    assert(seen.includes(shapeGuard));
  });

  await t.step("run for .optional and .notEmpty variants too", () => {
    const seen: unknown[] = [];
    registerConstructionHook((guard) => seen.push(guard));

    const base = createTypeGuard("base", stringParser);

    assert(seen.includes(base.optional));
    assert(seen.includes(base.notEmpty));
  });

  await t.step("can assign an own-property capability visible on future guards", () => {
    registerConstructionHook((guard) => {
      (guard as { marked?: boolean }).marked = true;
    });

    const guard = createTypeGuard("marked-test", stringParser);
    assertEquals((guard as { marked?: boolean }).marked, true);
  });
});

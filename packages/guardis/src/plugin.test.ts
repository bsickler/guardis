import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { createTypeGuard } from "./guard.ts";
import { GUARDIS_EXT, GUARDIS_PARENT, registerConstructionHook } from "./plugin.ts";
import type { GuardisPluginCarrier } from "./types.ts";
import { isNumber, isString } from "./modules/primitives.ts";

const stringParser = (v: unknown): string | null => typeof v === "string" ? v : null;

/** Whitebox access to the plugin slots TypeGuard<T> deliberately doesn't declare. */
const carrier = <T>(guard: unknown): GuardisPluginCarrier<T> => guard as GuardisPluginCarrier<T>;

Deno.test("plugin bag", async (t) => {
  await t.step("every guard gets an own, empty bag by default", () => {
    const isFoo = createTypeGuard("foo", stringParser);
    assertEquals(carrier(isFoo)[GUARDIS_EXT], {});
  });

  await t.step("shape-based guards also get a bag", () => {
    const isPerson = createTypeGuard({ name: isString, age: isNumber });
    assertEquals(carrier(isPerson)[GUARDIS_EXT], {});
  });

  await t.step("each guard gets its own bag instance, not a shared one", () => {
    const a = createTypeGuard("a", stringParser);
    const b = createTypeGuard("b", stringParser);
    assert(carrier(a)[GUARDIS_EXT] !== carrier(b)[GUARDIS_EXT]);
  });
});

Deno.test("parent pointer", async (t) => {
  await t.step("extend() stamps the parent", () => {
    const base = createTypeGuard("base", stringParser);
    const derived = base.extend((v: string) => v.length > 0 ? v : null);
    assertStrictEquals(carrier(derived)[GUARDIS_PARENT], base);
  });

  await t.step("extend() with a shape stamps the parent", () => {
    const base = createTypeGuard({ name: isString });
    const derived = base.extend({ age: isNumber });
    assertStrictEquals(carrier(derived)[GUARDIS_PARENT], base);
  });

  await t.step(".optional stamps the parent", () => {
    const base = createTypeGuard("base", stringParser);
    assertStrictEquals(carrier(base.optional)[GUARDIS_PARENT], base);
  });

  await t.step(".notEmpty stamps the parent", () => {
    const base = createTypeGuard("base", stringParser);
    assertStrictEquals(carrier(base.notEmpty)[GUARDIS_PARENT], base);
  });

  await t.step("base guards have no parent", () => {
    const base = createTypeGuard("base", stringParser);
    assertEquals(carrier(base)[GUARDIS_PARENT], undefined);
  });

  await t.step(".or() does not stamp a parent (multi-parent, out of scope)", () => {
    const a = createTypeGuard("a", stringParser);
    const combined = a.or(isNumber);
    assertEquals(carrier(combined)[GUARDIS_PARENT], undefined);
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

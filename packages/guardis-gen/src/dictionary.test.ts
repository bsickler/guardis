import { assert, assertEquals, assertThrows } from "@std/assert";
import { seed } from "./utilities/rng.ts";
import { Dictionary } from "./dictionary.ts";

Deno.test("Dictionary.of()", async (t) => {
  await t.step("wraps a flat pool -- pick() only ever returns a member of it", () => {
    const pool = ["a", "b", "c"];
    const dictionary = Dictionary.of(pool);
    for (let i = 0; i < 50; i++) {
      assert(pool.includes(dictionary.pick()));
    }
  });

  await t.step("is reproducible under seed()", () => {
    const dictionary = Dictionary.of(["a", "b", "c", "d", "e"]);

    seed("dictionary-pick-test");
    const first = Array.from({ length: 10 }, () => dictionary.pick());

    seed("dictionary-pick-test");
    const second = Array.from({ length: 10 }, () => dictionary.pick());

    assertEquals(first, second);
  });

  await t.step("rejects non-array data", () => {
    assertThrows(
      () => (Dictionary.of as (data: unknown) => Dictionary<unknown>)("not an array"),
      Error,
      "Requires an array",
    );
  });
});

Deno.test("Dictionary.from()", async (t) => {
  await t.step("wraps a plain function as a working Dictionary<T>", () => {
    const alwaysRed = Dictionary.from(() => "red");
    assertEquals(alwaysRed.pick(), "red");
  });

  await t.step("calls the function fresh on every pick() -- not memoized", () => {
    let count = 0;
    const counting = Dictionary.from(() => ++count);
    assertEquals(counting.pick(), 1);
    assertEquals(counting.pick(), 2);
    assertEquals(counting.pick(), 3);
  });

  await t.step("composes other Dictionary instances, including Dictionary.of() ones", () => {
    const first = Dictionary.of(["Ada", "Grace"]);
    const last = Dictionary.of(["Lovelace", "Hopper"]);
    const fullName = Dictionary.from(() => `${first.pick()} ${last.pick()}`);
    const [firstPart, lastPart] = fullName.pick().split(" ");
    assert(["Ada", "Grace"].includes(firstPart));
    assert(["Lovelace", "Hopper"].includes(lastPart));
  });
});

Deno.test("Dictionary.withChildren()", async (t) => {
  await t.step("merges a main dictionary's pick() with named child dictionaries", () => {
    const first = Dictionary.of(["Ada", "Grace"]);
    const last = Dictionary.of(["Lovelace", "Hopper"]);
    const fullName = Dictionary.withChildren(
      Dictionary.from(() => `${first.pick()} ${last.pick()}`),
      { first, last } as const,
    );

    const [firstPart, lastPart] = fullName.pick().split(" ");
    assert(["Ada", "Grace"].includes(firstPart));
    assert(["Lovelace", "Hopper"].includes(lastPart));

    assert(["Ada", "Grace"].includes(fullName.first.pick()));
    assert(["Lovelace", "Hopper"].includes(fullName.last.pick()));
  });
});

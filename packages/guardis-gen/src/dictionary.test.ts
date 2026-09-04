import { assert, assertEquals, assertThrows } from "@std/assert";
import { seed } from "./utilities/rng.ts";
import { defineDictionary, type Dictionary, dictionaryOf, fromDictionary } from "./dictionary.ts";

Deno.test("defineDictionary construction", async (t) => {
  await t.step("accepts a non-empty pool", () => {
    const dictionary = defineDictionary(["a", "b", "c"]);
    assertEquals(dictionary.size, 3);
  });

  await t.step("throws on an empty pool", () => {
    assertThrows(
      () => defineDictionary([]),
      TypeError,
      "must contain at least one value",
    );
  });

  await t.step("duplicate entries in the source iterable collapse", () => {
    const dictionary = defineDictionary(["a", "a", "b", "a"]);
    assertEquals(dictionary.size, 2);
  });

  await t.step("accepts any iterable, not just arrays", () => {
    const dictionary = defineDictionary(new Set(["x", "y"]));
    assertEquals(dictionary.size, 2);
  });
});

Deno.test("defineDictionary().pick()", async (t) => {
  await t.step("only ever returns a member of the pool", () => {
    const pool = ["a", "b", "c"];
    const dictionary = defineDictionary(pool);
    for (let i = 0; i < 50; i++) {
      assert(pool.includes(dictionary.pick()));
    }
  });

  await t.step("is reproducible under seed()", () => {
    const dictionary = defineDictionary(["a", "b", "c", "d", "e"]);

    seed("dictionary-pick-test");
    const first = Array.from({ length: 10 }, () => dictionary.pick());

    seed("dictionary-pick-test");
    const second = Array.from({ length: 10 }, () => dictionary.pick());

    assertEquals(first, second);
  });
});

Deno.test("defineDictionary().has() / iteration", async (t) => {
  await t.step("has() reflects pool membership", () => {
    const dictionary = defineDictionary(["a", "b"]);
    assert(dictionary.has("a"));
    assert(!dictionary.has("z"));
  });

  await t.step("is iterable over its deduplicated values", () => {
    const dictionary = defineDictionary(["a", "a", "b"]);
    assertEquals([...dictionary].sort(), ["a", "b"]);
  });
});

Deno.test("Dictionary<T> is a plain interface -- no base class involved", async (t) => {
  await t.step("any object with a matching pick() satisfies Dictionary<T>", () => {
    const alwaysRed: Dictionary<string> = { pick: () => "red" };
    assertEquals(alwaysRed.pick(), "red");
  });

  await t.step("a class can implement Dictionary<T> directly, composing other dictionaries", () => {
    class FullName implements Dictionary<string> {
      #first = defineDictionary(["Ada", "Grace"]);
      #last = defineDictionary(["Lovelace", "Hopper"]);
      pick(): string {
        return `${this.#first.pick()} ${this.#last.pick()}`;
      }
    }
    const fullName = new FullName();
    const [first, last] = fullName.pick().split(" ");
    assert(["Ada", "Grace"].includes(first));
    assert(["Lovelace", "Hopper"].includes(last));
  });

  await t.step("a factory function can build one too, no class needed at all", () => {
    function createShouting(pool: Iterable<string>): Dictionary<string> {
      const dictionary = defineDictionary(pool);
      return { pick: () => dictionary.pick().toUpperCase() };
    }
    const shouting = createShouting(["hi", "hey"]);
    assert(["HI", "HEY"].includes(shouting.pick()));
  });
});

Deno.test("dictionaryOf()", async (t) => {
  await t.step("wraps a plain function as a working Dictionary<T>", () => {
    const alwaysRed = dictionaryOf(() => "red");
    assertEquals(alwaysRed.pick(), "red");
  });

  await t.step("calls the function fresh on every pick() -- not memoized", () => {
    let count = 0;
    const counting = dictionaryOf(() => ++count);
    assertEquals(counting.pick(), 1);
    assertEquals(counting.pick(), 2);
    assertEquals(counting.pick(), 3);
  });

  await t.step(
    "composes with defineDictionary() the same way a hand-written { pick: () => ... } would",
    () => {
      const first = defineDictionary(["Ada", "Grace"]);
      const last = defineDictionary(["Lovelace", "Hopper"]);
      const fullName = dictionaryOf(() => `${first.pick()} ${last.pick()}`);
      const [firstPart, lastPart] = fullName.pick().split(" ");
      assert(["Ada", "Grace"].includes(firstPart));
      assert(["Lovelace", "Hopper"].includes(lastPart));
    },
  );
});

Deno.test("fromDictionary()", async (t) => {
  await t.step("produces a generator that draws from the dictionary", () => {
    const pool = ["a", "b", "c"];
    const dictionary = defineDictionary(pool);
    const generate = fromDictionary(dictionary);

    for (let i = 0; i < 20; i++) {
      assert(pool.includes(generate()));
    }
  });

  await t.step("works with a plain object implementing Dictionary<T> directly", () => {
    const generate = fromDictionary({ pick: () => "fixed" });
    assertEquals(generate(), "fixed");
  });
});

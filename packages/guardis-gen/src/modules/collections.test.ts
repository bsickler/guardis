// Side-effect import: stamps base Map/Set specs and patches .of(). Must run
// before any of the isMap.of()/isSet.of() calls below.
import "./collections.ts";
// gen.tuple's generated elements below (isString/isNumber/isBoolean) need
// their own specs registered too.
import "./primitives.ts";

import { assert, assertEquals } from "@std/assert";
import { isBoolean, isMap, isNumber, isSet, isString } from "@spudlabs/guardis";
import { gen } from "../../mod.ts";

Deno.test("isMap.generate()", async (t) => {
  await t.step("works with no .of() call", () => {
    const sample = isMap.generate();
    assert(sample instanceof Map);
  });

  await t.step("generate({min, max}) overrides size bounds for this call only", () => {
    for (let i = 0; i < 20; i++) {
      const sample = isMap.generate({ min: 3, max: 5 });
      assert(sample.size >= 3 && sample.size <= 5, `size ${sample.size} out of range`);
    }
  });

  await t.step("generate({ofLength}) generates an exact size", () => {
    assertEquals(isMap.generate({ ofLength: 4 }).size, 4);
  });
});

Deno.test("isSet.generate()", async (t) => {
  await t.step("works with no .of() call", () => {
    const sample = isSet.generate();
    assert(sample instanceof Set);
  });

  await t.step("generate({min, max}) overrides size bounds for this call only", () => {
    for (let i = 0; i < 20; i++) {
      const sample = isSet.generate({ min: 3, max: 5 });
      assert(sample.size >= 3 && sample.size <= 5, `size ${sample.size} out of range`);
    }
  });

  await t.step("generate({ofLength}) generates an exact size", () => {
    assertEquals(isSet.generate({ ofLength: 4 }).size, 4);
  });
});

Deno.test("isMap.of().generate()", async (t) => {
  await t.step("produces a Map<string, number> whose entries satisfy the guards", () => {
    const isStrToNum = isMap.of(isString, isNumber);
    for (let i = 0; i < 10; i++) {
      const sample = isStrToNum.generate();
      assert(sample instanceof Map);
      for (const [key, value] of sample) {
        assert(isString(key), `key ${String(key)} is not a string`);
        assert(isNumber(value), `value ${String(value)} is not a number`);
      }
    }
  });

  await t.step("generate({min, max}) applies to .of() results too", () => {
    // .of() returns a plain TypeGuard<Map<K, V>> (see collections.types.ts
    // in core), not a distinct nominal type, but GenerateOptionsFor's own
    // Map/Set branch (spec.ts) covers it without needing a cast.
    const isStrToNum = isMap.of(isString, isNumber);
    for (let i = 0; i < 10; i++) {
      const sample = isStrToNum.generate({ min: 3, max: 3 });
      assertEquals(sample.size, 3);
    }
  });
});

Deno.test("isSet.of().generate()", async (t) => {
  await t.step("produces a Set whose elements are all numbers", () => {
    const isNumberSet = isSet.of(isNumber);
    for (let i = 0; i < 10; i++) {
      const sample = isNumberSet.generate();
      assert(sample instanceof Set);
      for (const item of sample) {
        assert(isNumber(item), `element ${String(item)} is not a number`);
      }
    }
  });

  await t.step("generate({min, max}) applies to .of() results too", () => {
    const isNumberSet = isSet.of(isNumber);
    for (let i = 0; i < 10; i++) {
      const sample = isNumberSet.generate({ min: 3, max: 3 });
      assertEquals(sample.size, 3);
    }
  });
});

Deno.test("isMap/isSet size chain methods (.min/.max/.ofSize/.range)", async (t) => {
  await t.step("base isMap.ofSize()/.min()/.max()/.range() generate matching sizes", () => {
    assertEquals(isMap.ofSize(4).generate().size, 4);
    for (let i = 0; i < 10; i++) {
      assert(isMap.min(2).generate().size >= 2);
      assert(isMap.max(2).generate().size <= 2);
      const ranged = isMap.range(2, 4).generate();
      assert(ranged.size >= 2 && ranged.size <= 4, `size ${ranged.size} out of range`);
    }
  });

  await t.step("base isSet.ofSize()/.min()/.max()/.range() generate matching sizes", () => {
    assertEquals(isSet.ofSize(4).generate().size, 4);
    for (let i = 0; i < 10; i++) {
      assert(isSet.min(2).generate().size >= 2);
      assert(isSet.max(2).generate().size <= 2);
      const ranged = isSet.range(2, 4).generate();
      assert(ranged.size >= 2 && ranged.size <= 4, `size ${ranged.size} out of range`);
    }
  });

  await t.step("size methods on .of() results keep the element/key/value type", () => {
    const isNumberSetOfSize3 = isSet.of(isNumber).ofSize(3);
    for (let i = 0; i < 10; i++) {
      const sample = isNumberSetOfSize3.generate();
      assertEquals(sample.size, 3);
      for (const item of sample) assert(isNumber(item));
    }

    const isStrToNumMin2 = isMap.of(isString, isNumber).min(2);
    for (let i = 0; i < 10; i++) {
      const sample = isStrToNumMin2.generate();
      assert(sample.size >= 2);
      for (const [key, value] of sample) {
        assert(isString(key));
        assert(isNumber(value));
      }
    }
  });

  await t.step(
    "size methods on the base guard still chain to .of() (key/value typed correctly)",
    () => {
      const isSmallStrToNum = isMap.max(3).of(isString, isNumber);
      for (let i = 0; i < 10; i++) {
        const sample = isSmallStrToNum.generate();
        for (const [key, value] of sample) {
          assert(isString(key));
          assert(isNumber(value));
        }
      }
    },
  );

  await t.step("deep chain: min().max().of().ofSize() composes correctly", () => {
    const deep = isMap.min(1).max(5).of(isString, isNumber).ofSize(2);
    for (let i = 0; i < 10; i++) {
      const sample = deep.generate();
      assertEquals(sample.size, 2);
      for (const [key, value] of sample) {
        assert(isString(key));
        assert(isNumber(value));
      }
    }
  });
});

Deno.test("gen.tuple", async (t) => {
  await t.step("builds a guard and a matching tuple spec", () => {
    const isTriple = gen.tuple(isString, isNumber, isBoolean);
    assert(isTriple(["a", 1, true]));
  });

  await t.step("generate() produces a 3-element array in string/number/boolean order", () => {
    const isTriple = gen.tuple(isString, isNumber, isBoolean);
    const sample = isTriple.generate();
    assertEquals(sample.length, 3);
    assertEquals(typeof sample[0], "string");
    assertEquals(typeof sample[1], "number");
    assertEquals(typeof sample[2], "boolean");
  });
});

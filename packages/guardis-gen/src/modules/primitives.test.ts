// Deliberately does NOT import modules/strings.ts or modules/http.ts --
// proves this module (the default, always-available surface) is usable on
// its own, independent of the format-guard subpaths.
import "./primitives.ts";

import { assert, assertEquals } from "@std/assert";
import { isArray, isBoolean, isDate, isNumber, isString } from "@spudlabs/guardis";

Deno.test("primitive defaults", async (t) => {
  await t.step("isString.generate() returns a string", () => {
    assertEquals(typeof isString.generate(), "string");
  });

  await t.step("isNumber.generate() returns a number", () => {
    assertEquals(typeof isNumber.generate(), "number");
  });

  await t.step("isBoolean.generate() returns a boolean", () => {
    assertEquals(typeof isBoolean.generate(), "boolean");
  });

  await t.step("isDate.generate() returns a Date", () => {
    assert(isDate.generate() instanceof Date);
  });

  await t.step("isArray.generate() returns an array", () => {
    assert(Array.isArray(isArray.generate()));
  });
});

Deno.test("isString chain-method constraint tracking", async (t) => {
  await t.step("min(5).max(10) generates a string within range", () => {
    const isConstrained = isString.min(5).max(10);
    for (let i = 0; i < 20; i++) {
      const value = isConstrained.generate();
      assert(value.length >= 5 && value.length <= 10, `length ${value.length} out of range`);
    }
  });

  await t.step("ofLength(7) generates an exact-length string", () => {
    const isExact = isString.ofLength(7);
    assertEquals(isExact.generate().length, 7);
  });

  await t.step("range(3, 6) generates a string within range", () => {
    const isConstrained = isString.range(3, 6);
    for (let i = 0; i < 20; i++) {
      const value = isConstrained.generate();
      assert(value.length >= 3 && value.length <= 6, `length ${value.length} out of range`);
    }
  });

  await t.step("unconstrained derived guard still inherits the base kind", () => {
    const derived = isString.extend((v: string) => v.toUpperCase() === v ? v : null);
    assertEquals(typeof derived.generate(), "string");
  });
});

Deno.test("isNumber chain-method constraint tracking", async (t) => {
  await t.step("gt(10).lt(20) generates a number within range", () => {
    const isConstrained = isNumber.gt(10).lt(20);
    for (let i = 0; i < 20; i++) {
      const value = isConstrained.generate();
      assert(value >= 10 && value <= 20, `value ${value} out of range`);
    }
  });

  await t.step("gte(0).lte(1) generates a number within range", () => {
    const isConstrained = isNumber.gte(0).lte(1);
    for (let i = 0; i < 20; i++) {
      const value = isConstrained.generate();
      assert(value >= 0 && value <= 1, `value ${value} out of range`);
    }
  });

  await t.step("further chaining after .finite stays constraint-aware", () => {
    const isConstrained = isNumber.finite.gt(0).lt(5);
    for (let i = 0; i < 20; i++) {
      const value = isConstrained.generate();
      assert(value >= 0 && value <= 5, `value ${value} out of range`);
    }
  });
});

Deno.test("isDate chain-method constraint tracking", async (t) => {
  await t.step("gte(x).lte(y) generates a date within range", () => {
    const gte = new Date("2023-01-01");
    const lte = new Date("2023-12-31");
    const isConstrained = isDate.gte(gte).lte(lte);
    for (let i = 0; i < 20; i++) {
      const value = isConstrained.generate();
      assert(
        value.getTime() >= gte.getTime() && value.getTime() <= lte.getTime(),
        `date ${value.toISOString()} out of range`,
      );
    }
  });

  await t.step("gt(x).lt(y) generates a date within range", () => {
    const gt = new Date("2023-01-01");
    const lt = new Date("2023-12-31");
    const isConstrained = isDate.gt(gt).lt(lt);
    for (let i = 0; i < 20; i++) {
      const value = isConstrained.generate();
      assert(
        value.getTime() >= gt.getTime() && value.getTime() <= lt.getTime(),
        `date ${value.toISOString()} out of range`,
      );
    }
  });
});

Deno.test("isArray chain-method constraint tracking", async (t) => {
  await t.step("min(2).max(4) generates an array within length range", () => {
    const isConstrained = isArray.min(2).max(4);
    for (let i = 0; i < 20; i++) {
      const value = isConstrained.generate();
      assert(value.length >= 2 && value.length <= 4, `length ${value.length} out of range`);
    }
  });

  await t.step("ofLength(3) generates an exact-length array", () => {
    const isExact = isArray.ofLength(3);
    assertEquals(isExact.generate().length, 3);
  });

  await t.step("range(1, 2) generates an array within length range", () => {
    const isConstrained = isArray.range(1, 2);
    for (let i = 0; i < 20; i++) {
      const value = isConstrained.generate();
      assert(value.length >= 1 && value.length <= 2, `length ${value.length} out of range`);
    }
  });
});

Deno.test("isArray.of() element-aware generation", async (t) => {
  await t.step("of(isNumber) generates an array of numbers", () => {
    const isNumberArray = isArray.of(isNumber);
    for (let i = 0; i < 20; i++) {
      const value = isNumberArray.generate();
      for (const el of value) assertEquals(typeof el, "number");
    }
  });

  await t.step(
    "chaining .min()/.max() after of() keeps the element type -- doesn't fall back to strings",
    () => {
      const isConstrained = isArray.of(isNumber).min(3).max(5);
      for (let i = 0; i < 20; i++) {
        const value = isConstrained.generate();
        assert(value.length >= 3 && value.length <= 5, `length ${value.length} out of range`);
        for (const el of value) assertEquals(typeof el, "number");
      }
    },
  );
});

Deno.test("call-time generate() options", async (t) => {
  await t.step("isString.generate({min, max}) overrides for this call only", () => {
    const value = isString.generate({ min: 2, max: 5 });
    assert(value.length >= 2 && value.length <= 5, `length ${value.length} out of range`);
    assertEquals(typeof isString.generate(), "string");
  });

  await t.step("isNumber.generate({min, max, int}) overrides for this call only", () => {
    const value = isNumber.generate({ min: 10, max: 20, int: true });
    assert(Number.isInteger(value) && value >= 10 && value <= 20, `value ${value} out of range`);
  });

  await t.step("isDate.generate({gte, lte}) overrides for this call only", () => {
    const gte = new Date("2020-01-01");
    const lte = new Date("2020-12-31");
    const value = isDate.generate({ gte, lte });
    assert(
      value.getTime() >= gte.getTime() && value.getTime() <= lte.getTime(),
      `date ${value.toISOString()} out of range`,
    );
  });

  await t.step("isArray.generate({min, max}) overrides for this call only", () => {
    const value = isArray.generate({ min: 2, max: 4 });
    assert(value.length >= 2 && value.length <= 4, `length ${value.length} out of range`);
  });

  await t.step("isString.generate({ofLength}) generates an exact-length string", () => {
    assertEquals(isString.generate({ ofLength: 6 }).length, 6);
  });

  await t.step("isArray.generate({ofLength}) generates an exact-length array", () => {
    assertEquals(isArray.generate({ ofLength: 2 }).length, 2);
  });

  await t.step("call-time options override a chained guard's own registered constraints", () => {
    const isExact = isString.min(3).max(3);
    assertEquals(isExact.generate().length, 3);
    const overridden = isExact.generate({ max: 10 });
    assert(
      overridden.length >= 3 && overridden.length <= 10,
      `length ${overridden.length} out of range`,
    );
  });
});

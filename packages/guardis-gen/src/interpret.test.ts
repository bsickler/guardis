import { assert, assertEquals } from "@std/assert";
import { interpret } from "./interpret.ts";
import type {
  CustomSpec,
  MapSpec,
  ObjectSpec,
  OptionalSpec,
  PrimitiveSpec,
  SetSpec,
  TupleSpec,
  UnionSpec,
} from "./spec.ts";

Deno.test("interpret(undefined) returns undefined", () => {
  assertEquals(interpret(undefined), undefined);
});

Deno.test("interpret() structural primitive kinds", async (t) => {
  await t.step("string: default bounds with no constraints", () => {
    for (let i = 0; i < 20; i++) {
      const value = interpret({ kind: "string" } as PrimitiveSpec) as string;
      assertEquals(typeof value, "string");
      assert(value.length >= 3 && value.length <= 8, `length ${value.length} out of default range`);
    }
  });

  await t.step("string: explicit min/max constraints", () => {
    const spec: PrimitiveSpec = { kind: "string", constraints: { min: 10, max: 12 } };
    for (let i = 0; i < 20; i++) {
      const value = interpret(spec) as string;
      assert(value.length >= 10 && value.length <= 12, `length ${value.length} out of range`);
    }
  });

  await t.step("string: ofLength shorthand generates an exact length", () => {
    const spec: PrimitiveSpec = { kind: "string", constraints: { ofLength: 9 } };
    assertEquals((interpret(spec) as string).length, 9);
  });

  await t.step("number: default and explicit bounds", () => {
    const value = interpret({ kind: "number" } as PrimitiveSpec) as number;
    assert(value >= 0 && value <= 100, `value ${value} out of default range`);

    const bounded = interpret(
      { kind: "number", constraints: { min: 5, max: 5, int: true } } as PrimitiveSpec,
    ) as number;
    assertEquals(bounded, 5);
  });

  await t.step("boolean: always a boolean", () => {
    assertEquals(typeof interpret({ kind: "boolean" } as PrimitiveSpec), "boolean");
  });

  await t.step("optional: resolves to both undefined and the inner value across samples", () => {
    const spec: OptionalSpec = { kind: "optional", inner: { kind: "string" } };
    const results = new Set<boolean>();
    for (let i = 0; i < 50; i++) {
      results.add(interpret(spec) === undefined);
    }
    assert(results.has(true), "optional never resolved to undefined across 50 samples");
    assert(results.has(false), "optional never resolved to its inner value across 50 samples");
  });

  await t.step("optional: forwards options/defaults to the inner value when present", () => {
    const spec: OptionalSpec = { kind: "optional", inner: { kind: "string" } };
    for (let i = 0; i < 50; i++) {
      const value = interpret(spec, { ofLength: 4 }) as string | undefined;
      if (value !== undefined) assertEquals(value.length, 4);
    }
  });

  await t.step("date: default and explicit bounds", () => {
    assert(interpret({ kind: "date" } as PrimitiveSpec) instanceof Date);

    const gte = new Date("2021-01-01");
    const lte = new Date("2021-01-02");
    const value = interpret(
      { kind: "date", constraints: { gte, lte } } as PrimitiveSpec,
    ) as Date;
    assert(value.getTime() >= gte.getTime() && value.getTime() <= lte.getTime());
  });

  await t.step("array: default bounds and ofLength shorthand", () => {
    const value = interpret({ kind: "array" } as PrimitiveSpec) as unknown[];
    assert(value.length >= 0 && value.length <= 3, `length ${value.length} out of default range`);

    const exact = interpret(
      { kind: "array", constraints: { ofLength: 4 } } as PrimitiveSpec,
    ) as unknown[];
    assertEquals(exact.length, 4);
  });

  await t.step("array: with no element spec, falls back to string elements", () => {
    const value = interpret(
      { kind: "array", constraints: { ofLength: 3 } } as PrimitiveSpec,
    ) as unknown[];
    for (const el of value) assertEquals(typeof el, "string");
  });

  await t.step("array: element spec generates matching elements", () => {
    const spec: PrimitiveSpec = {
      kind: "array",
      element: { kind: "number", constraints: { min: 5, max: 5 } },
      constraints: { ofLength: 4 },
    };
    const value = interpret(spec) as number[];
    assertEquals(value.length, 4);
    for (const el of value) assertEquals(el, 5);
  });

  await t.step("union: resolves to both branch kinds across samples", () => {
    const spec: UnionSpec = {
      kind: "union",
      branches: [{ kind: "string" }, { kind: "number" }],
    };
    const kinds = new Set<string>();
    for (let i = 0; i < 50; i++) {
      kinds.add(typeof interpret(spec));
    }
    assert(kinds.has("string"), "union never resolved to the string branch across 50 samples");
    assert(kinds.has("number"), "union never resolved to the number branch across 50 samples");
  });

  await t.step("union: forwards options/defaults to whichever branch is picked", () => {
    const spec: UnionSpec = {
      kind: "union",
      branches: [{ kind: "string" }, { kind: "string" }],
    };
    for (let i = 0; i < 20; i++) {
      assertEquals((interpret(spec, { ofLength: 4 }) as string).length, 4);
    }
  });
});

Deno.test("interpret() CustomSpec 'generate' dispatch and shallowMerge", async (t) => {
  const echoSpec = (): CustomSpec => ({ kind: "custom", generate: (options) => options });

  await t.step("merges defaults and options when both are objects, options key wins", () => {
    assertEquals(interpret(echoSpec(), { b: 2 }, { a: 1 }), { a: 1, b: 2 });
    assertEquals(interpret(echoSpec(), { a: 2 }, { a: 1 }), { a: 2 });
  });

  await t.step("falls back to defaults alone when options is undefined", () => {
    assertEquals(interpret(echoSpec(), undefined, { a: 1 }), { a: 1 });
  });

  await t.step("uses options alone when defaults is undefined", () => {
    assertEquals(interpret(echoSpec(), { b: 2 }), { b: 2 });
  });

  await t.step("returns undefined when neither is given", () => {
    assertEquals(interpret(echoSpec()), undefined);
  });

  await t.step("a non-object options value wins outright over object defaults", () => {
    assertEquals(interpret(echoSpec(), "options-string", { a: 1 }), "options-string");
  });

  await t.step("a non-object defaults value is discarded once options is a plain object", () => {
    assertEquals(interpret(echoSpec(), { b: 2 }, "defaults-string"), { b: 2 });
  });
});

Deno.test("interpret() collection kinds", async (t) => {
  await t.step("map: entries satisfy the key/value kinds", () => {
    const spec: MapSpec = { kind: "map", key: { kind: "string" }, value: { kind: "number" } };
    for (let i = 0; i < 20; i++) {
      const result = interpret(spec) as Map<unknown, unknown>;
      assert(result instanceof Map);
      for (const [key, value] of result) {
        assertEquals(typeof key, "string");
        assertEquals(typeof value, "number");
      }
    }
  });

  await t.step("set: elements satisfy the element kind", () => {
    const spec: SetSpec = { kind: "set", element: { kind: "boolean" } };
    for (let i = 0; i < 20; i++) {
      const result = interpret(spec) as Set<unknown>;
      assert(result instanceof Set);
      for (const item of result) assertEquals(typeof item, "boolean");
    }
  });

  await t.step("tuple: empty tuple produces an empty array", () => {
    const spec: TupleSpec = { kind: "tuple", elements: [] };
    assertEquals(interpret(spec), []);
  });

  await t.step("tuple: preserves order, count, and per-position kind", () => {
    const spec: TupleSpec = {
      kind: "tuple",
      elements: [{ kind: "string" }, { kind: "number" }, { kind: "boolean" }],
    };
    const result = interpret(spec) as unknown[];
    assertEquals(result.length, 3);
    assertEquals(typeof result[0], "string");
    assertEquals(typeof result[1], "number");
    assertEquals(typeof result[2], "boolean");
  });
});

Deno.test("interpret() object kind, called directly", async (t) => {
  await t.step(
    "a literal (non-function) option forwards to that field's own interpret() call",
    () => {
      const echo: CustomSpec = { kind: "custom", generate: (o) => o };
      const spec: ObjectSpec = { kind: "object", fields: { code: echo } };
      const result = interpret(spec, { props: { code: "LITERAL" } }) as { code: unknown };
      assertEquals(result.code, "LITERAL");
    },
  );

  await t.step("fields without a matching option generate their own default value", () => {
    const spec: ObjectSpec = { kind: "object", fields: { name: { kind: "string" } } };
    const result = interpret(spec) as { name: string };
    assertEquals(typeof result.name, "string");
  });

  await t.step("non-object options/defaults degrade to no props, not a crash", () => {
    const spec: ObjectSpec = { kind: "object", fields: { name: { kind: "string" } } };
    assertEquals(typeof (interpret(spec, 42, "junk") as { name: string }).name, "string");
    assertEquals(typeof (interpret(spec, null) as { name: string }).name, "string");
  });
});

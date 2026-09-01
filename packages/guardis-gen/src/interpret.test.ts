// interpret() is exercised here through REAL composed guards --
// createTypeGuard(shape), .of(), .or(), gen.tuple(), and chain methods
// (.min/.max/.ofLength/.gte/.lte/...) -- and their real .generate() calls,
// wherever that's possible. NOT by hand-building a Spec literal and passing
// it straight to interpret(): a hand-built Spec bypasses every one of the
// composition sites (object.ts, primitives.ts, collections.ts, tuple.ts,
// or.ts, plus mergeConstraint's element carry-forward) that give a composed
// position its late-bound `SpecSource`. `interpret` itself is not exported
// from mod.ts; no real caller reaches it that way, so a test that only ever
// hands interpret() a literal Spec is structurally incapable of catching a
// composition regression, no matter how thorough it looks.
//
// A handful of steps below still call interpret() directly. Each carries its
// own comment explaining why: they test a non-exported branch or a pure
// internal function that a real composed guard cannot reach without a cast
// no real caller would write.
//
// Side-effect imports: registers the automatic object-spec construction
// hook, stamps base specs, and patches chain methods for primitives and
// collections. Must run before a createTypeGuard(shape) guard, isArray.of(),
// isMap.of(), isSet.of(), or a chain method (.min/.max/.ofLength/.gte/...)
// can carry a matching generation spec.
import "./object.ts";
import "./modules/primitives.ts";
import "./modules/collections.ts";

import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  createTypeGuard,
  isArray,
  isBoolean,
  isDate,
  isMap,
  isNumber,
  isSet,
  isString,
} from "@spudlabs/guardis";
import { gen, next, seed } from "../mod.ts";
import { interpret } from "./interpret.ts";
import type { CustomSpec, GenContext } from "./spec.ts";
import { registerGen, resolveSpec, specRef } from "./spec.ts";

/**
 * Records a 4096-draw transcript from `seedValue`, replays `run()` from the
 * same seed, then finds where the next() stream resumes after `run()`
 * consumed its draws -- used below to check a draw COUNT, not just a value,
 * where a value assertion alone wouldn't catch a spurious extra/missing draw.
 */
function drawsConsumed(seedValue: number | string, run: () => void): number {
  seed(seedValue);
  const transcript = Array.from({ length: 4096 }, () => next());
  seed(seedValue);
  run();
  const resume = next();
  const at = transcript.indexOf(resume);
  assert(at >= 0, "generation consumed more than 4096 draws");
  assertEquals(at, transcript.lastIndexOf(resume), "ambiguous resume point");
  return at;
}

Deno.test("interpret(undefined) returns undefined", () => {
  // A real internal contract, not a composition-bypass shortcut: `deref`
  // (spec.ts) returns `undefined` for an unresolved SpecSource, and
  // interpret() has to handle that directly -- there is no guard to compose
  // that would exercise this any more realistically than calling it straight.
  assertEquals(interpret(undefined), undefined);
});

Deno.test("interpret() structural primitive kinds", async (t) => {
  await t.step("string: default bounds with no constraints", () => {
    for (let i = 0; i < 20; i++) {
      const value = isString.generate();
      assertEquals(typeof value, "string");
      assert(value.length >= 3 && value.length <= 8, `length ${value.length} out of default range`);
    }
  });

  await t.step("string: explicit min/max constraints", () => {
    const isBounded = isString.min(10).max(12);
    for (let i = 0; i < 20; i++) {
      const value = isBounded.generate();
      assert(value.length >= 10 && value.length <= 12, `length ${value.length} out of range`);
    }
  });

  await t.step("string: ofLength shorthand generates an exact length", () => {
    assertEquals(isString.ofLength(9).generate().length, 9);
  });

  await t.step("number: default and explicit bounds", () => {
    const value = isNumber.generate();
    assert(value >= 0 && value <= 100, `value ${value} out of default range`);

    const bounded = isNumber.generate({ min: 5, max: 5, int: true });
    assertEquals(bounded, 5);
  });

  await t.step("boolean: always a boolean", () => {
    assertEquals(typeof isBoolean.generate(), "boolean");
  });

  await t.step("optional: resolves to both undefined and the inner value across samples", () => {
    const results = new Set<boolean>();
    for (let i = 0; i < 50; i++) {
      results.add(isString.optional.generate() === undefined);
    }
    assert(results.has(true), "optional never resolved to undefined across 50 samples");
    assert(results.has(false), "optional never resolved to its inner value across 50 samples");
  });

  await t.step("optional: forwards options/defaults to the inner value when present", () => {
    for (let i = 0; i < 50; i++) {
      // OptionalTypeGuard<T1> gets no primitive-specific typed generate()
      // overload the way StringTypeGuard does (spec.ts's declare module only
      // augments the base TypeGuard/OptionalTypeGuard interfaces generically)
      // -- same untyped dispatch as isNumber's .defineGenerator cast in
      // object.test.ts's "registered defaults apply only where registered"
      // section. The forwarding itself is real runtime behavior either way.
      const value = (isString.optional.generate as (options?: unknown) => string | undefined)({
        ofLength: 4,
      });
      if (value !== undefined) assertEquals(value.length, 4);
    }
  });

  await t.step("date: default and explicit bounds", () => {
    assert(isDate.generate() instanceof Date);

    const gte = new Date("2021-01-01");
    const lte = new Date("2021-01-02");
    const value = isDate.gte(gte).lte(lte).generate();
    assert(value.getTime() >= gte.getTime() && value.getTime() <= lte.getTime());
  });

  await t.step("array: default bounds and ofLength shorthand", () => {
    const value = isArray.generate();
    assert(value.length >= 0 && value.length <= 3, `length ${value.length} out of default range`);

    const exact = isArray.ofLength(4).generate();
    assertEquals(exact.length, 4);
  });

  await t.step("array: with no element spec, falls back to string elements", () => {
    const value = isArray.ofLength(3).generate();
    for (const el of value) assertEquals(typeof el, "string");
  });

  await t.step("array: element spec generates matching elements", () => {
    // Exercises patchArrayOf's late-bound `element` -- .of() then .ofLength()
    // must carry the element guard forward through the chain.
    const isRow = isArray.of(isNumber.gte(5).lte(5)).ofLength(4);
    const value = isRow.generate();
    assertEquals(value.length, 4);
    for (const el of value) assertEquals(el, 5);
  });

  await t.step("union: resolves to both branch kinds across samples", () => {
    const isRow = isString.or(isNumber);
    const kinds = new Set<string>();
    for (let i = 0; i < 50; i++) {
      kinds.add(typeof isRow.generate());
    }
    assert(kinds.has("string"), "union never resolved to the string branch across 50 samples");
    assert(kinds.has("number"), "union never resolved to the number branch across 50 samples");
  });

  await t.step("union: forwards options/defaults to whichever branch is picked", () => {
    const isRow = isString.or(isString);
    for (let i = 0; i < 20; i++) {
      // .or()'s result is a plain TypeGuard<T1>, not a StringTypeGuard, so it
      // carries no primitive-specific typed generate() overload -- same
      // untyped dispatch as the optional case above. Forwarding still
      // happens at runtime regardless of which branch pick() draws.
      const value = (isRow.generate as (options?: unknown) => string)({ ofLength: 4 });
      assertEquals(value.length, 4);
    }
  });
});

Deno.test("interpret() CustomSpec 'generate' dispatch", async (t) => {
  // Kept on interpret() directly: this dispatches a hand-rolled CustomSpec
  // across inputs -- undefined, a non-object string -- that a real guard's
  // .defineGenerator(fn) cannot express. bindGenerator (define-generator.ts)
  // validates the generator's return value against the guard on every call,
  // so a guard whose generator sometimes returns "options-string" and
  // sometimes undefined would need to accept both as valid, which defeats
  // the point of that validation. This exercises the raw `"generate" in
  // spec` dispatch branch in interpret() directly instead.
  const echoSpec = (): CustomSpec => ({ kind: "custom", generate: (options) => options });

  await t.step("passes options straight through, object or not", () => {
    assertEquals(interpret(echoSpec(), { b: 2 }), { b: 2 });
    assertEquals(interpret(echoSpec(), "options-string"), "options-string");
  });

  await t.step("returns undefined when no options are given", () => {
    assertEquals(interpret(echoSpec()), undefined);
  });
});

Deno.test("interpret() collection kinds", async (t) => {
  await t.step("map: entries satisfy the key/value kinds", () => {
    const isRow = isMap.of(isString, isNumber);
    for (let i = 0; i < 20; i++) {
      const result = isRow.generate();
      assert(result instanceof Map);
      for (const [key, value] of result) {
        assertEquals(typeof key, "string");
        assertEquals(typeof value, "number");
      }
    }
  });

  await t.step("set: elements satisfy the element kind", () => {
    const isRow = isSet.of(isBoolean);
    for (let i = 0; i < 20; i++) {
      const result = isRow.generate();
      assert(result instanceof Set);
      for (const item of result) assertEquals(typeof item, "boolean");
    }
  });

  await t.step("tuple: empty tuple produces an empty array", () => {
    assertEquals(gen.tuple().generate(), []);
  });

  await t.step("tuple: preserves order, count, and per-position kind", () => {
    const isRow = gen.tuple(isString, isNumber, isBoolean);
    const result = isRow.generate();
    assertEquals(result.length, 3);
    assertEquals(typeof result[0], "string");
    assertEquals(typeof result[1], "number");
    assertEquals(typeof result[2], "boolean");
  });
});

Deno.test("interpret() object kind", async (t) => {
  await t.step(
    "a literal (non-function) option forwards to that field's own interpret() call",
    () => {
      const isCode = createTypeGuard(
        "code",
        (v: unknown): string | null => typeof v === "string" ? v : null,
      );
      isCode.defineGenerator((opt: unknown) => opt as string);
      const isRow = createTypeGuard({ code: isCode });
      // isCode is a plain TypeGuard<string>, not a Brand -- so NestedOptionsFor
      // types `props.code` as LengthConstraints (the generic string branch),
      // not as an arbitrary passthrough value. Forwarding a raw literal to a
      // field's own generator is real CustomSpec.generate(options) behavior
      // (untyped by design -- see CustomSpec in spec.ts), just not one the
      // typed `props` surface can express -- same untyped dispatch as
      // isNumber's .defineGenerator cast in object.test.ts.
      const result = (isRow.generate as (options?: unknown) => { code: string })({
        props: { code: "LITERAL" },
      });
      assertEquals(result.code, "LITERAL");
    },
  );

  await t.step("fields without a matching option generate their own default value", () => {
    const isRow = createTypeGuard({ name: isString });
    const result = isRow.generate();
    assertEquals(typeof result.name, "string");
  });

  await t.step("non-object options degrade to no props, not a crash", () => {
    // Kept on interpret() directly: a real caller reaches `.generate()`
    // through GenerateOptionsFor<T1>, which types an object shape's options
    // as `{ props?: ... }` -- a non-object value only reaches this branch
    // via a cast (`.generate(42 as never)`) no real caller would write.
    // Calling interpret() needs no such cast: its own options parameter is
    // already `unknown`, so this is the honest way to reach this branch.
    const spec = resolveSpec(createTypeGuard({ name: isString }));
    assertEquals(typeof (interpret(spec, 42) as { name: string }).name, "string");
    assertEquals(typeof (interpret(spec, null) as { name: string }).name, "string");
  });
});

Deno.test("interpret() generation context", async (t) => {
  const isMember = createTypeGuard({ name: isString, email: isString });

  await t.step("a nested object's field reads an outer sibling via ctx.parent", () => {
    const isCompany = createTypeGuard({ name: isString });
    const isFirm = createTypeGuard({ firstName: isString, company: isCompany });
    const value = isFirm.generate({
      props: {
        company: {
          props: {
            name: (_c, ctx) => `${ctx.parent.firstName}-co`,
          },
        },
      },
    });
    assertEquals(value.company.name, `${value.firstName}-co`);
  });

  await t.step(
    "order independence: a dependency declared AFTER its dependent is pulled forward",
    () => {
      // `email` is declared first, yet derives from `company`, declared last.
      const isCompany = createTypeGuard({ name: isString });
      const isFirm = createTypeGuard({ email: isString, company: isCompany });
      const value = isFirm.generate({
        props: { email: (p) => `a@${p.company.name}` },
      });
      assertEquals(value.email, `a@${value.company.name}`);
    },
  );

  await t.step("every array element reads the SAME enclosing sibling through ctx.parent", () => {
    const isCompany = createTypeGuard({ name: isString });
    const isFirm = createTypeGuard({
      company: isCompany,
      members: isArray.of(isMember).ofLength(3),
    });
    const value = isFirm.generate({
      props: {
        members: {
          props: { email: (m, ctx) => `${m.name}@${ctx.parent.company.name}` },
        },
      },
    });
    assertEquals(value.members.length, 3);
    for (const m of value.members) assertEquals(m.email, `${m.name}@${value.company.name}`);
  });

  await t.step("root context: parent/root/index undefined, ancestors empty, path empty", () => {
    let seen: GenContext | undefined;
    const isRoot = createTypeGuard({ a: isString });
    isRoot.generate({
      props: {
        a: (_p, ctx) => {
          seen = ctx;
          return "x";
        },
      },
    });
    assertEquals(seen?.parent, undefined);
    assertEquals(seen?.root, undefined);
    assertEquals(seen?.index, undefined);
    assertEquals(seen?.ancestors.length, 0);
    assertEquals(seen?.path, []);
  });

  await t.step("ancestors is root-first, and parent === ancestors.at(-1)", () => {
    let seen: GenContext | undefined;
    const isInner = createTypeGuard({ leaf: isString });
    const isMid = createTypeGuard({ inner: isInner });
    const isOuter = createTypeGuard({ tag: isString, mid: isMid });
    const value = isOuter.generate({
      props: {
        mid: {
          props: {
            inner: {
              props: {
                leaf: (_p, ctx) => {
                  seen = ctx;
                  return "x";
                },
              },
            },
          },
        },
      },
    });

    assertEquals(seen?.ancestors.length, 2);
    assertEquals(seen?.parent, seen?.ancestors.at(-1));
    assertEquals(seen?.root, seen?.ancestors[0]);
    // The root proxy really is the outermost object: reading through it works.
    assertEquals((seen?.root as { tag: string } | undefined)?.tag, value.tag);
  });

  await t.step(
    "ctx.index is the element position, and survives into an element's own fields",
    () => {
      const isElement = createTypeGuard({ at: isString });
      const isRow = isArray.of(isElement).ofLength(3);
      const value = isRow.generate({
        props: { at: (_p, ctx) => `i=${ctx.index}` },
      });
      assertEquals(value.map((v) => v.at), ["i=0", "i=1", "i=2"]);
    },
  );

  await t.step("ctx.path names the position, through fields and elements alike", () => {
    const paths: (readonly (string | number)[])[] = [];
    const isFirm = createTypeGuard({ members: isArray.of(isMember).ofLength(2) });
    isFirm.generate({
      props: {
        members: {
          props: {
            email: (_m, ctx) => {
              paths.push(ctx.path);
              return "x";
            },
          },
        },
      },
    });
    assertEquals(paths, [["members", 0], ["members", 1]]);
  });
});

Deno.test("interpret() collection options forward to elements", async (t) => {
  await t.step("size keys stay with the collection and are NOT forwarded", () => {
    // If `min`/`max` leaked through to the string elements, their LENGTH would
    // be bounded by 2..4 instead of the array's length.
    const isRow = isArray.of(isString);
    for (let i = 0; i < 20; i++) {
      const value = isRow.generate({ min: 2, max: 4 });
      assert(value.length >= 2 && value.length <= 4, `array length ${value.length}`);
      for (const s of value) {
        assert(s.length >= 3 && s.length <= 8, `element length ${s.length} was constrained`);
      }
    }
  });

  await t.step("set: residual reaches elements, ofSize stays with the set", () => {
    const isChild = createTypeGuard({ v: isString });
    const isRow = isSet.of(isChild);
    const value = isRow.generate({ ofLength: 3, props: { v: () => "fixed" } });
    // Three structurally identical objects, but distinct references -- a Set
    // dedupes by identity, so all three survive.
    assertEquals(value.size, 3);
    assertEquals([...value].every((o) => o.v === "fixed"), true);
  });

  await t.step("map: one residual bag serves key and value; a string key ignores props", () => {
    const isChild = createTypeGuard({ v: isString });
    const isRow = isMap.of(isString, isChild);
    const value = isRow.generate({ ofLength: 2, props: { v: () => "mapped" } });
    assertEquals(value.size, 2);
    for (const [k, v] of value) {
      assertEquals(typeof k, "string");
      assertEquals(v.v, "mapped");
    }
  });

  await t.step("tuple: every position receives the residual", () => {
    const isChild = createTypeGuard({ v: isString });
    const isRow = gen.tuple(isChild, isChild);
    // gen.tuple's guard has no typed generate() overload accepting options:
    // GenerateOptionsFor collapses to `never` for a tuple's array-shaped
    // output (tuple.ts adds no declare-module augmentation the way
    // ArraySizeGuard does in modules/primitives.ts) -- same untyped dispatch
    // as isNumber's .defineGenerator cast in object.test.ts. The residual
    // still reaches every position at runtime.
    const value = (isRow.generate as unknown as (options?: unknown) => { v: string }[])({
      props: { v: (_p: unknown, ctx: GenContext) => `p${ctx.index}` },
    });
    assertEquals(value.map((e) => e.v), ["p0", "p1"]);
  });

  await t.step("array: residual reaches every element", () => {
    const isChild = createTypeGuard({ v: isString });
    const isRow = isArray.of(isChild).ofLength(2);
    const value = isRow.generate({ props: { v: () => "fixed" } });
    assertEquals(value.map((e) => e.v), ["fixed", "fixed"]);
  });
});

Deno.test("interpret() cross-level cycles", async (t) => {
  await t.step("a cycle spanning nesting levels throws, with a path-qualified chain", () => {
    const isChild = createTypeGuard({ note: isString });
    const isParent = createTypeGuard({ summary: isString, child: isChild });
    const error = assertThrows(
      () =>
        isParent.generate({
          props: {
            summary: (p) => p.child.note,
            child: {
              props: {
                note: (_c, ctx) => ctx.parent.summary,
              },
            },
          },
        }),
      Error,
      "circular dependency in relational properties",
    );
    // The chain names the level, not just the bare key.
    assert(error.message.includes("child.note"), `message was: ${error.message}`);
    assert(error.message.includes("summary"), `message was: ${error.message}`);
  });

  await t.step("a root-level cycle message is unchanged by paths existing", () => {
    const isRow = createTypeGuard({ a: isString, b: isString });
    assertThrows(
      () => isRow.generate({ props: { a: (p) => p.b, b: (p) => p.a } }),
      Error,
      "circular dependency in relational properties: a -> b -> a",
    );
  });
});

Deno.test("interpret() generation depth cap", async (t) => {
  await t.step(
    "a self-referential spec built via registerGen + specRef throws RangeError naming the depth and a path",
    () => {
      // A guard can't reference itself inside its own shape literal (that's
      // a TDZ ReferenceError, unrelated to this cap) -- but registering the
      // cycle onto an already-constructed guard is exactly what late binding
      // makes representable, and is the documented registerGen escape hatch
      // for self-referential schemas (see spec.ts). `child` is required, not
      // optional, so every level actually recurses -- no randomness needed
      // to hit the cap.
      const isNode = createTypeGuard(
        "node",
        (v: unknown): Record<string, unknown> | null =>
          v && typeof v === "object" ? v as Record<string, unknown> : null,
      );
      registerGen(isNode, {
        kind: "object",
        guard: isNode,
        fields: { child: specRef(isNode) },
      });

      const error = assertThrows(() => isNode.generate(), RangeError);
      assert(error.message.includes("32"), `message was: ${error.message}`);
      assert(error.message.includes("child"), `message was: ${error.message}`);
    },
  );

  await t.step(
    "the relational cycle detector still fires first for a props-level cycle, distinctly from the depth cap",
    () => {
      // Shallow -- path never grows past depth 1 -- so if this ever threw a
      // RangeError instead, the depth cap would have wrongly pre-empted the
      // relational cycle detector for a case that has nothing to do with it.
      const isRow = createTypeGuard({ a: isString, b: isString });
      const error = assertThrows(
        () => isRow.generate({ props: { a: (p) => p.b, b: (p) => p.a } }),
        Error,
        "circular dependency in relational properties",
      );
      assert(!(error instanceof RangeError), "a props cycle must not be reported as a RangeError");
    },
  );
});

Deno.test("interpret() object fields named after Object.prototype members", async (t) => {
  // `key in result`/`key in thunks`/`!(key in target)` all walk the
  // prototype chain, so each has to be guarded against silently matching a
  // field named after an inherited member (toString, constructor, ...)
  // before its own thunk ever runs. Separately, `propOptions[key]` bracket
  // access alone would resolve to the SAME inherited member (misread as a
  // user-supplied deriver). Both are covered by generating each name below.
  const prototypeNames = [
    "toString",
    "constructor",
    "valueOf",
    "hasOwnProperty",
    "__proto__",
    "toLocaleString",
    "isPrototypeOf",
  ];

  for (const name of prototypeNames) {
    await t.step(
      `a field named '${name}' generates its own value, not the inherited member`,
      () => {
        // Computed key: `{ __proto__: isString }` written literally sets the
        // object literal's OWN prototype instead of creating an own property
        // called "__proto__" -- a computed key has no such special case, so
        // this is the only way to get a REAL own "__proto__" field to test.
        const fields = { [name]: isString, other: isNumber } as Record<string, unknown>;
        const isRow = createTypeGuard(fields as never);
        const sample = isRow.generate() as Record<string, unknown>;
        assertEquals(typeof sample[name], "string", `sample.${name} was ${String(sample[name])}`);
        assertEquals(typeof sample.other, "number");
      },
    );
  }

  await t.step(
    "a prototype-named field draws exactly like an equivalent ordinary-named field",
    () => {
      // A field that short-circuited to the inherited prototype member would
      // consume ZERO draws, silently shifting every later draw in the tree
      // -- so the real check is that the draw COUNT matches an
      // otherwise-identical schema with a boring field name, not just that
      // the value looks like a string.
      const isWithPrototypeName = createTypeGuard({ toString: isString, other: isNumber });
      const isWithOrdinaryName = createTypeGuard({ label: isString, other: isNumber });
      const withPrototypeName = drawsConsumed(90210, () => isWithPrototypeName.generate());
      const ordinary = drawsConsumed(90210, () => isWithOrdinaryName.generate());
      assertEquals(
        withPrototypeName,
        ordinary,
        "a field named 'toString' must draw exactly one string's worth, like any other field",
      );
    },
  );
});

Deno.test("interpret() object fields do not leak Object.prototype members for undeclared prototype-named keys", () => {
  // Before the fix, a `slug` deriver reading `p.constructor` on the live
  // props proxy would resolve to the inherited `Object` constructor (truthy)
  // even though no `constructor` field was ever declared -- calling it as a
  // thunk injected a bogus own field AND returned the wrong answer.
  const isRow = createTypeGuard({ name: isString, slug: isString });
  const sample = isRow.generate({
    props: { slug: (p) => p.constructor === Object ? "plain" : "notplain" },
  }) as Record<string, unknown>;

  assertEquals(sample.slug, "plain");
  assertEquals(Object.keys(sample), ["name", "slug"]);
});

Deno.test("interpret() generation depth cap fires for a union-only self-reference", () => {
  // `case "union"` forwards `ctx` unchanged (see `deeper`), so `ctx.path`
  // never grows across a union-only recursion -- depth tracking can't rely
  // on `path.length` here, which is exactly why `ActiveContext.depth` exists
  // as a separate counter (see MAX_GENERATION_DEPTH's doc). Without it, this
  // would recurse until the JS call stack itself overflowed, with no useful
  // diagnostic. A guard can't reference itself inside its own shape literal
  // (TDZ), so the cycle is wired up after construction via registerGen, same
  // escape hatch as the object-kind depth-cap test above.
  const isNode = createTypeGuard(
    "union-node",
    (v: unknown): unknown => v,
  );
  registerGen(isNode, { kind: "union", branches: [specRef(isNode)] });

  const error = assertThrows(() => isNode.generate(), RangeError);
  assert(error.message.includes("max depth"), `message was: ${error.message}`);
});

Deno.test("interpret() pathLabel collisions do not cause false-positive cycle errors", async (t) => {
  await t.step(
    "a nested field and a dotted top-level key with the same joined spelling don't collide",
    () => {
      const isInner = createTypeGuard({ y: isString });
      const isRoot = createTypeGuard({ x: isInner, "x.y": isString });
      // NOT extracted into a separate `const generate = isRoot.generate` --
      // that would drop the `isRoot` receiver `.generate()` reads its own
      // spec through, and `this` would be undefined at call time instead.
      const sample = (isRoot.generate as (options?: unknown) => Record<string, unknown>)({
        props: {
          x: {
            props: {
              y: (_p: unknown, ctx: GenContext) =>
                "from:" + (ctx.parent as Record<string, unknown>)["x.y"],
            },
          },
        },
      });
      assertEquals(sample.x, { y: `from:${sample["x.y"]}` });
    },
  );

  await t.step(
    "a literal bracketed-and-dotted key and an array element's nested field don't collide",
    () => {
      // `items[0].name` (a nested field, three path segments joined) and a
      // literal top-level key spelled the same way render to the IDENTICAL
      // `pathLabel` string -- exactly the same ambiguity as the dotted-key
      // case above, just via array notation instead of two object levels.
      // `items` must stay structural (an options BAG, not a function) so its
      // element's deriver runs WHILE `items` is still mid-resolution and
      // both labels are on the stack at once -- a deriver on the literal key
      // itself would run in the later derived-fields pass, after `items`
      // already finished, and never observe the collision either way.
      const isChild = createTypeGuard({ name: isString });
      const isRoot = createTypeGuard({
        items: isArray.of(isChild).ofLength(2),
        "items[0].name": isString,
      });
      const sample = (isRoot.generate as (options?: unknown) => Record<string, unknown>)({
        props: {
          items: {
            props: {
              name: (_c: unknown, ctx: GenContext) =>
                "from:" + (ctx.root as Record<string, unknown>)["items[0].name"],
            },
          },
        },
      });
      assertEquals(
        (sample.items as { name: string }[])[0].name,
        `from:${sample["items[0].name"]}`,
      );
    },
  );
});

Deno.test("interpret() the object self-guard failure message survives an unstringifiable value", async (t) => {
  await t.step("a deriver returning the live props proxy doesn't crash JSON.stringify", () => {
    // A guard that accepts any non-null object -- loose enough that
    // returning the (self-referential) props proxy still fails the object's
    // OWN top-level guard here, since the field's own guard is isString.
    const isRow = createTypeGuard({ a: isString, b: isString });
    const error = assertThrows(
      () => (isRow.generate as (options?: unknown) => unknown)({ props: { a: (p: unknown) => p } }),
      TypeError,
      "fails its own guard",
    );
    assert(!error.message.includes("Converting circular structure"), error.message);
  });

  await t.step("a deriver returning a BigInt doesn't crash JSON.stringify", () => {
    const isRow = createTypeGuard({ a: isString, b: isString });
    const error = assertThrows(
      () =>
        (isRow.generate as (options?: unknown) => unknown)({ props: { a: (_p: unknown) => 1n } }),
      TypeError,
      "fails its own guard",
    );
    assert(!error.message.includes("Do not know how to serialize"), error.message);
  });
});

Deno.test("interpret() a deriver returning props embeds the plain object, not the live proxy", () => {
  // Loose enough to accept an object where a stricter guard would reject the
  // proxy outright and mask the leak as an ordinary "fails its own guard".
  const isLoose = (v: unknown): v is unknown => typeof v === "object" && v !== null;
  const isRow = createTypeGuard({ a: isString, b: isLoose });
  const sample = (isRow.generate as (options?: unknown) => { a: string; b: unknown })({
    props: { b: (p: unknown) => p },
  });
  // Self-referential (the deriver returned "itself"), but a PLAIN circular
  // reference the caller made, not a live Proxy the implementation leaked.
  assertEquals(sample.b, sample);
});

Deno.test("interpret() recursion-aware collection shrinking, not absolute-depth shrinking", async (t) => {
  await t.step(
    "a non-recursive schema generates populated collections at every level, however deep",
    () => {
      // 4 levels deep (org -> users -> posts -> tags), nothing recursive.
      // Under depth-based shrinking this reliably empties `post.tags` --
      // 229/300 generated, 0 non-empty was the observed bug.
      const isTag = createTypeGuard({ label: isString });
      const isPost = createTypeGuard({ title: isString, tags: isArray.of(isTag) });
      const isUser = createTypeGuard({ name: isString, posts: isArray.of(isPost) });
      const isOrg = createTypeGuard({ org: isString, users: isArray.of(isUser) });

      let nonEmptyTagArrays = 0;
      let sawMultiplePosts = false;
      const SAMPLES = 300;
      for (let i = 0; i < SAMPLES; i++) {
        seed(i);
        const org = isOrg.generate() as unknown as {
          users: { posts: { tags: unknown[] }[] }[];
        };
        for (const user of org.users) {
          if (user.posts.length > 1) sawMultiplePosts = true;
          for (const post of user.posts) {
            if (post.tags.length > 0) nonEmptyTagArrays++;
          }
        }
      }
      assert(
        nonEmptyTagArrays > 0,
        `post.tags was empty over every generation across ${SAMPLES} seeds`,
      );
      assert(sawMultiplePosts, `user.posts never exceeded length 1 across ${SAMPLES} seeds`);
    },
  );

  await t.step(
    "siblings sharing one guard are not recursion -- both get the full spread independently",
    () => {
      // { a: isCompany, b: isCompany } must not count as isCompany recursing
      // into itself just because both fields name the same guard.
      const isCompany = createTypeGuard({ name: isString, tags: isArray.of(isString) });
      const isPair = createTypeGuard({ a: isCompany, b: isCompany });

      const aLengths = new Set<number>();
      const bLengths = new Set<number>();
      const SAMPLES = 200;
      for (let i = 0; i < SAMPLES; i++) {
        seed(i);
        const pair = isPair.generate() as unknown as {
          a: { tags: unknown[] };
          b: { tags: unknown[] };
        };
        aLengths.add(pair.a.tags.length);
        bLengths.add(pair.b.tags.length);
      }
      // Full (unshrunk) spread for an unconstrained array reaches 3 -- if `b`
      // were wrongly treated as a recursive revisit of `a`'s guard, it would
      // shrink toward 0 and never reach the top of that range.
      assert(aLengths.has(3), `a.tags.length values seen: ${[...aLengths]}`);
      assert(bLengths.has(3), `b.tags.length values seen: ${[...bLengths]}`);
    },
  );

  await t.step(
    "a genuine recursive cycle still shrinks toward zero and terminates well within the depth cap",
    () => {
      // Same shape as self-guard-violations.test.ts's recursive-schema test,
      // plus a bound on the tree's actual depth: terminating only by hitting
      // MAX_GENERATION_DEPTH (32) would still "not throw", but would mean
      // recursion-aware shrinking wasn't actually doing its job.
      const isCommentLike = createTypeGuard("comment", (v: unknown) => v);
      const isComment = createTypeGuard({ text: isString, replies: isArray.of(isCommentLike) });
      registerGen(isCommentLike, resolveSpec(isComment)!);

      function maxTreeDepth(v: { replies: unknown[] }): number {
        const children = v.replies as { replies: unknown[] }[];
        return children.length === 0 ? 1 : 1 + Math.max(...children.map(maxTreeDepth));
      }
      for (let s = 0; s < 50; s++) {
        seed(s);
        const value = isComment.generate() as { text: string; replies: unknown[] };
        assert(Array.isArray(value.replies), `replies was not an array: ${JSON.stringify(value)}`);
        const depth = maxTreeDepth(value);
        assert(
          depth < 10,
          `seed ${s}: reply tree grew to depth ${depth} instead of shrinking to 0`,
        );
      }
    },
  );

  await t.step(
    "an explicit min still enforces its floor, and doesn't cap the spread, at a nested level",
    () => {
      const isTag = createTypeGuard({ label: isString });
      const isPost = createTypeGuard({ title: isString, tags: isArray.of(isTag).min(3) });
      const isUser = createTypeGuard({ name: isString, posts: isArray.of(isPost) });
      const isOrg = createTypeGuard({ org: isString, users: isArray.of(isUser) });

      const tagLengths = new Set<number>();
      const SAMPLES = 100;
      for (let i = 0; i < SAMPLES; i++) {
        seed(i);
        const org = isOrg.generate() as unknown as {
          users: { posts: { tags: unknown[] }[] }[];
        };
        for (const user of org.users) {
          for (const post of user.posts) tagLengths.add(post.tags.length);
        }
      }
      for (const n of tagLengths) {
        assert(n >= 3, `post.tags.length was ${n}, below the explicit min(3)`);
      }
      // The floor doesn't cap the spread on top of it -- not forced down to
      // exactly 3 just for sitting 3 levels deep.
      assert(
        Math.max(...tagLengths) > 3,
        `tags.length values seen: ${[...tagLengths]} -- spread looks shrunk by depth alone`,
      );
    },
  );

  await t.step("explicit ofLength still wins over recursion-aware shrinking, at any depth", () => {
    const isTag = createTypeGuard({ label: isString });
    const isPost = createTypeGuard({ title: isString, tags: isArray.of(isTag).ofLength(5) });
    const isUser = createTypeGuard({ name: isString, posts: isArray.of(isPost).ofLength(5) });
    for (let s = 0; s < 20; s++) {
      seed(s);
      const user = isUser.generate() as unknown as { posts: { tags: unknown[] }[] };
      assertEquals(user.posts.length, 5);
      for (const post of user.posts) assertEquals(post.tags.length, 5);
    }
  });
});

Deno.test("interpret() unwrapProps recurses one level into arrays/plain objects a deriver builds", async (t) => {
  const isLoose = (v: unknown): v is unknown => v !== undefined;

  await t.step("[props] -- the embedded element is the plain object, not a live proxy", () => {
    const isRow = createTypeGuard({ a: isString, self: isLoose });
    const sample = (isRow.generate as (options?: unknown) => { a: string; self: unknown[] })({
      props: { self: (p: unknown) => [p] },
    });
    assertEquals(sample.self[0], sample);
    // A live proxy's own preventExtensions trap throws; a plain object freezes.
    Object.freeze(sample.self[0]);
  });

  await t.step("{ snapshot: props } -- the embedded property is the plain object", () => {
    const isRow = createTypeGuard({ a: isString, self: isLoose });
    const sample =
      (isRow.generate as (options?: unknown) => { a: string; self: { snapshot: unknown } })(
        { props: { self: (p: unknown) => ({ snapshot: p }) } },
      );
    assertEquals(sample.self.snapshot, sample);
    Object.freeze(sample.self.snapshot);
  });

  await t.step("a directly-returned ctx.ancestors is unwrapped, element by element", () => {
    const isInner = createTypeGuard({ trail: isLoose });
    const isOuter = createTypeGuard({ name: isString, inner: isInner });
    const sample = (isOuter.generate as (options?: unknown) => { inner: { trail: unknown[] } })({
      props: { inner: { props: { trail: (_p: unknown, ctx: GenContext) => ctx.ancestors } } },
    });
    assertEquals(sample.inner.trail[0], sample);
    for (const ancestor of sample.inner.trail) Object.freeze(ancestor);
  });

  await t.step(
    "an array/object wrapping ctx.ancestors TWO levels deep is a documented residual gap",
    () => {
      // `{ trail: c.ancestors }` -- the proxy sits inside the array, which
      // itself sits inside the returned object, two containers deep.
      // unwrapProps only recurses one level, so this specific shape still
      // leaks -- ctx.ancestorValues (tested below) is the way to avoid it.
      const isInner = createTypeGuard({ trail: isLoose });
      const isOuter = createTypeGuard({ name: isString, inner: isInner });
      const sample =
        (isOuter.generate as (options?: unknown) => { inner: { trail: { trail: unknown[] } } })({
          props: {
            inner: {
              props: { trail: (_p: unknown, ctx: GenContext) => ({ trail: ctx.ancestors }) },
            },
          },
        });
      assertThrows(
        () => Object.freeze(sample.inner.trail.trail[0]),
        TypeError,
        "live view",
      );
    },
  );

  await t.step("ctx.ancestorValues never leaks, even wrapped two levels deep", () => {
    const isInner = createTypeGuard({ trail: isLoose });
    const isOuter = createTypeGuard({ name: isString, inner: isInner });
    const sample =
      (isOuter.generate as (options?: unknown) => { inner: { trail: { trail: unknown[] } } })({
        props: {
          inner: {
            props: { trail: (_p: unknown, ctx: GenContext) => ({ trail: ctx.ancestorValues }) },
          },
        },
      });
    assertEquals(sample.inner.trail.trail[0], sample);
    Object.freeze(sample.inner.trail.trail[0]);
  });
});

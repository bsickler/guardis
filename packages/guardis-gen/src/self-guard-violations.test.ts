// Coverage for the "silent self-guard violation" bug class: generation
// either produces a value that satisfies its own guard, or throws a useful
// error naming what it couldn't produce -- across unsatisfiable constraints,
// dedup retries, unresolvable guards, self-guard failure messages, and
// recursive-schema termination.
//
// Side-effect imports: registers the object-spec construction hook, stamps
// base specs/patches chain methods for primitives, collections, and binds
// isEmail's real generator.
import "./object.ts";
import "./modules/primitives.ts";
import "./modules/collections.ts";
import "./modules/strings.ts";

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
import { isEmail } from "@spudlabs/guardis/strings";
import { seed } from "../mod.ts";
import { registerGen, resolveSpec } from "./spec.ts";

Deno.test("unsatisfiable min/max constraints throw at generation instead of generating invalid values", async (t) => {
  await t.step("isNumber.gt(10).lt(5) throws naming the conflict", () => {
    const error = assertThrows(() => isNumber.gt(10).lt(5).generate(), Error);
    assert(error.message.includes("10"), `message was: ${error.message}`);
    assert(error.message.includes("5"), `message was: ${error.message}`);
  });

  await t.step("isString.min(5).max(3) throws naming the conflict", () => {
    const error = assertThrows(() => isString.min(5).max(3).generate(), Error);
    assert(error.message.includes("5"), `message was: ${error.message}`);
    assert(error.message.includes("3"), `message was: ${error.message}`);
  });

  await t.step("isArray.min(5).max(3) throws the same way", () => {
    assertThrows(() => isArray.min(5).max(3).generate(), Error);
  });

  await t.step("isMap.min(5).max(3) and isSet.min(5).max(3) throw the same way", () => {
    assertThrows(() => isMap.min(5).max(3).generate(), Error);
    assertThrows(() => isSet.min(5).max(3).generate(), Error);
  });

  await t.step("an inverted date range throws instead of generating a date", () => {
    const gte = new Date("2024-01-02");
    const lte = new Date("2024-01-01");
    assertThrows(() => isDate.gte(gte).lte(lte).generate(), Error);
  });

  await t.step(
    "a single-sided bound generates a value instead of false-triggering the check",
    () => {
      assert(isString.max(2).generate().length <= 2);
      assertEquals(isString.max(0).generate().length, 0);
      assert(isArray.max(0).generate().length === 0);

      const lessThanZero = isNumber.lt(0).generate();
      assert(lessThanZero < 0, `value was not < 0: ${lessThanZero}`);
      const lessThanNegFive = isNumber.lt(-5).generate();
      assert(lessThanNegFive < -5, `value was not < -5: ${lessThanNegFive}`);

      const future = new Date(Date.now() + 86400000);
      const generatedDate = isDate.gte(future).generate();
      assert(
        generatedDate.getTime() >= future.getTime(),
        `date was before ${future.toISOString()}`,
      );
    },
  );

  await t.step("ofLength conflicting with an existing min/max throws", () => {
    const error = assertThrows(
      () => isString.min(5).generate({ ofLength: 2 }),
      Error,
    );
    assert(error.message.includes("5"), `message was: ${error.message}`);
    assert(error.message.includes("2"), `message was: ${error.message}`);
    assertThrows(() => isArray.of(isString).min(3).generate({ ofLength: 1 }), Error);
  });

  await t.step("ofLength that doesn't conflict with min still generates the exact length", () => {
    assertEquals(isString.min(2).generate({ ofLength: 5 }).length, 5);
  });
});

Deno.test(".notEmpty registers an explicit min:1, so it never throws on its own", () => {
  const isRow = createTypeGuard({ tags: isArray.notEmpty });
  for (let i = 0; i < 100; i++) {
    const value = isRow.generate();
    assert(value.tags.length >= 1, `tags was empty: ${JSON.stringify(value.tags)}`);
  }

  for (let i = 0; i < 100; i++) {
    const value = (isString.notEmpty as unknown as { generate(): string }).generate();
    assert(value.length >= 1, `string was empty`);
  }
});

Deno.test("Set/Map dedup retries instead of silently undershooting the requested size", async (t) => {
  await t.step("a satisfiable small domain (booleans, ofSize 2) retries to the target size", () => {
    for (let i = 0; i < 30; i++) {
      seed(`retry-set-${i}`);
      assertEquals(isSet.of(isBoolean).ofSize(2).generate().size, 2);
    }
    for (let i = 0; i < 30; i++) {
      seed(`retry-map-${i}`);
      assertEquals(isMap.of(isBoolean, isString).ofSize(2).generate().size, 2);
    }
  });

  await t.step("an unsatisfiable target size throws, naming the size and the element guard", () => {
    const setError = assertThrows(() => isSet.of(isBoolean).ofSize(3).generate(), Error);
    assert(setError.message.includes("3"), `message was: ${setError.message}`);

    const mapError = assertThrows(() => isMap.of(isBoolean, isString).ofSize(3).generate(), Error);
    assert(mapError.message.includes("3"), `message was: ${mapError.message}`);
  });

  await t.step("a min-only or max-only size never throws, across seeds", () => {
    for (let i = 0; i < 50; i++) {
      seed(`min-only-set-${i}`);
      isSet.of(isBoolean).min(1).generate();
      seed(`max-only-set-${i}`);
      isSet.of(isBoolean).max(5).generate();
      seed(`min-only-map-${i}`);
      isMap.of(isBoolean, isString).min(1).generate();
    }
  });
});

Deno.test("an unresolvable guard throws consistently across object/array/union positions", async (t) => {
  const isZip = createTypeGuard(
    "zip",
    (v: unknown): string | null => /^\d{5}$/.test(v as string) ? v as string : null,
  );

  await t.step("object field", () => {
    const isRow = createTypeGuard({ zip: isZip });
    assertThrows(() => isRow.generate(), TypeError, "fails its own guard");
  });

  await t.step("array element", () => {
    const isRow = isArray.of(isZip).ofLength(1);
    const error = assertThrows(() => isRow.generate(), Error);
    assert(error.message.includes("zip"), `message was: ${error.message}`);
  });

  await t.step(".or() branch", () => {
    // Both branches unresolvable, so whichever pick() draws still throws --
    // no dependence on which branch is randomly selected.
    const isRow = isZip.or(isZip);
    const error = assertThrows(() => isRow.generate(), Error);
    assert(error.message.includes("zip"), `message was: ${error.message}`);
  });
});

Deno.test("the self-guard failure message names what actually happened, not a nonexistent deriver", async (t) => {
  await t.step("no derivers involved: message names the missing field, not a deriver", () => {
    const isZip = createTypeGuard(
      "zip",
      (v: unknown): string | null => /^\d{5}$/.test(v as string) ? v as string : null,
    );
    const isRow = createTypeGuard({ zip: isZip });
    const error = assertThrows(() => isRow.generate(), TypeError, "fails its own guard");
    assert(error.message.includes("zip"), `message was: ${error.message}`);
    assert(!error.message.includes("relational derive"), `message was: ${error.message}`);
  });

  await t.step("a deriver involved: the message still mentions it", () => {
    const isRow = createTypeGuard({ email: isEmail });
    const error = assertThrows(
      () => isRow.generate({ props: { email: () => "not-an-email" } }),
      TypeError,
      "fails its own guard",
    );
    assert(error.message.includes("derive"), `message was: ${error.message}`);
  });
});

Deno.test("a recursive schema with a base case terminates reliably across 50 seeds", () => {
  const isCommentLike = createTypeGuard("comment", (v: unknown) => v);
  const isComment = createTypeGuard({ text: isString, replies: isArray.of(isCommentLike) });
  registerGen(isCommentLike, resolveSpec(isComment)!);

  for (let s = 0; s < 50; s++) {
    seed(s);
    const value = isComment.generate() as { text: string; replies: unknown[] };
    assertEquals(typeof value.text, "string");
    assert(Array.isArray(value.replies), `replies was not an array: ${JSON.stringify(value)}`);
  }
});

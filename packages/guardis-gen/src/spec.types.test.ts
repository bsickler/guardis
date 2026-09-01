/**
 * spec.types.test.ts - Compile-time assertions for the option types. Almost
 * nothing here runs; `deno test` type-checks the file, which is the point.
 * `@ts-expect-error` lines fail the build if the error they claim stops
 * happening, so they pin the negative cases as firmly as the positive ones.
 *
 * The assignability check at the bottom is the important one: spec.ts warns
 * that `GenerateOptionsFor`/`defineGenerator`'s `T1_` formulation is
 * load-bearing for `TypeGuard<T> extends TypeGuard<unknown>` program-wide.
 * That invariant used to be provable only by type-checking a downstream
 * package; asserting it here fails fast, in this package's own test run.
 */
import "./object.ts";
import "./modules/primitives.ts";
import "./modules/collections.ts";

import { assertEquals } from "@std/assert";
import {
  createTypeGuard,
  isArray,
  isBoolean,
  isMap,
  isNumber,
  isSet,
  isString,
} from "@spudlabs/guardis";
import type { OptionalTypeGuard, TypeGuard } from "@spudlabs/guardis";
import { resolveSpec } from "./spec.ts";

const isCompany = createTypeGuard({ name: isString, size: isNumber });
const isMember = createTypeGuard({ name: isString, email: isString });
const isTeam = createTypeGuard({
  company: isCompany,
  members: isArray.of(isMember).ofLength(2),
  headcount: isNumber,
});

Deno.test("option types accept the documented shapes", () => {
  // props/ctx are contextually typed with no annotations and no casts.
  const team = isTeam.generate({
    props: {
      members: { props: { email: (m, ctx) => `${m.name}@${ctx.parent.company.name}` } },
      headcount: (p) => p.members.length,
    },
  });
  assertEquals(team.members.length, 2);
  assertEquals(team.headcount, 2);

  // A nested object reaching outward, in its own call. Kept separate from the
  // one above on purpose: combining `company.name <- headcount`,
  // `headcount <- members` and `members[].email <- company.name` is a genuine
  // cycle, and the engine rejects it (see object.test.ts's cross-level cycle
  // step) rather than quietly producing a half-built value.
  const outward = isTeam.generate({
    props: { company: { props: { name: (_c, ctx) => `co-${ctx.parent.headcount}` } } },
  });
  assertEquals(outward.company.name, `co-${outward.headcount}`);

  // Nested option bags that aren't derivers still type-check. `ofLength` here
  // must not contradict the guard's own `.ofLength(2)` -- a call-time override
  // that does produces an object failing its own guard, as it always has.
  const bags = isTeam.generate({
    props: { members: { ofLength: 2 }, company: { props: { size: { min: 1, max: 5 } } } },
  });
  assertEquals(bags.members.length, 2);
  assertEquals(bags.company.size >= 1 && bags.company.size <= 5, true);

  // Collections: size keys plus element options in one bag.
  isMap.of(isString, isCompany).generate({ ofLength: 2, props: { name: () => "x" } });
  isSet.of(isCompany).generate({ ofLength: 2, props: { name: () => "x" } });
  isArray.of(isCompany).generate({ ofLength: 2, props: { name: () => "x" } });

  // A bare collection has unknown elements: size keys alone must still work.
  isSet.generate({ min: 1, max: 2 });
  isMap.generate({ ofLength: 1 });
  isArray.generate({ ofLength: 1 });
});

/**
 * Declared and never called: these lines exist to be TYPE-checked, and several
 * would throw or generate pointless data if they ran. `@ts-expect-error` fails
 * the build if the error it claims stops happening, so an unused function still
 * pins every case below.
 */
function _rejectedOptionShapes(): void {
  // @ts-expect-error - a deriver must return the field's own type
  isTeam.generate({ props: { headcount: () => "not a number" } });

  // @ts-expect-error - `nope` is not a field of Team
  isTeam.generate({ props: { nope: () => 1 } });

  // @ts-expect-error - `nope` is not a field of Company
  isTeam.generate({ props: { company: { props: { nope: () => 1 } } } });

  // @ts-expect-error - a string field takes length bounds, not a number's `int`
  isTeam.generate({ props: { company: { props: { name: { int: true } } } } });

  // @ts-expect-error - a boolean field has no constraints, so only a deriver
  createTypeGuard({ flag: isBoolean }).generate({ props: { flag: { min: 1 } } });
}

/**
 * The `T1_` control. If `GenerateOptionsFor` or `defineGenerator`'s overloads
 * regress, a concrete guard stops being assignable to `TypeGuard<unknown>`
 * and these lines stop compiling -- which is exactly how `resolveSpec`,
 * `CanBeEmpty` and `isExactly` break program-wide.
 */
Deno.test("a concrete TypeGuard stays assignable to TypeGuard<unknown>", () => {
  const widened: TypeGuard<unknown> = isTeam;
  const widenedPrimitive: TypeGuard<unknown> = isString;
  const widenedOptional: OptionalTypeGuard<unknown> = isString.optional;

  assertEquals(typeof widened, "function");
  assertEquals(typeof widenedPrimitive, "function");
  assertEquals(typeof widenedOptional, "function");

  // The concrete call sites spec.ts's `T1_` comment names. (`.of()` results
  // are deliberately absent: `ArraySizeGuard` is a separate interface that has
  // never been assignable to `TypeGuard<unknown>` -- its `notEmpty` against
  // `CanBeEmpty<unknown>` -- so modules/primitives.ts reaches resolveSpec
  // through a cast, and there is no assignability here to regress.)
  assertEquals(resolveSpec(isTeam)?.kind, "object");
  assertEquals(resolveSpec(isString.optional)?.kind, "optional");
});

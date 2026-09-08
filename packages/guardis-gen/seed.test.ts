// Side-effect imports: registers the object-spec construction hook, stamps
// base specs/patches chain methods (including .or()), and binds real
// string-format generators. Needed so the guard built below exercises
// interpret()'s object/array/union/optional/string/number/boolean paths,
// plus a .defineGenerator()-bound custom generator (isUUIDv4), all in one
// reproducibility check.
import "./src/object.ts";
import "./src/modules/primitives.ts";
import "./src/modules/strings.ts";

import { assertEquals, assertNotEquals } from "@std/assert";
import { createTypeGuard, isArray, isBoolean, isNumber, isString } from "@spudlabs/guardis";
import { isUUIDv4 } from "@spudlabs/guardis/strings";
import { seed } from "./mod.ts";

Deno.test("seed() makes structural generation reproducible", () => {
  const isUser = createTypeGuard({
    id: isNumber,
    name: isString,
    active: isBoolean,
    tags: isArray.of(isString),
    nickname: isString.optional,
    rank: isString.or(isNumber),
  });

  seed(20260828);
  const a = isUser.generate();
  seed(20260828);
  const b = isUser.generate();
  assertEquals(a, b);

  seed(1);
  const c = isUser.generate();
  assertNotEquals(a, c);
});

Deno.test("seed() makes a custom .defineGenerator() generator reproducible", () => {
  seed("uuid-repro");
  const a = isUUIDv4.generate();
  seed("uuid-repro");
  const b = isUUIDv4.generate();
  assertEquals(a, b);
});

Deno.test("seed() determinism freeze: structural generation draws in a fixed order", () => {
  // A frozen expected value pinning the PRNG DRAW ORDER for structural
  // generation, not the values themselves. A diff here means the draw order
  // moved -- investigate rather than re-freeze. (It may legitimately change
  // if @spudlabs/guardis alters guard construction, or the structural
  // defaults in utilities/random.ts change.)
  const isUser = createTypeGuard({
    id: isNumber,
    name: isString,
    active: isBoolean,
    tags: isArray.of(isString),
    nickname: isString.optional,
    rank: isString.or(isNumber),
  });

  seed(20260828);
  assertEquals(isUser.generate(), {
    id: 10.692043602466583,
    name: "tqs",
    active: true,
    tags: [],
    // Present as an own key holding undefined -- an absent optional is
    // assigned, not skipped. assertEquals distinguishes the two, so this line
    // is load-bearing.
    nickname: undefined,
    rank: "jkmwklz",
  });
});

Deno.test("seed() makes cross-level relational generation reproducible", () => {
  const isCompany = createTypeGuard({ name: isString });
  const isMember = createTypeGuard({ name: isString, email: isString });
  const isTeam = createTypeGuard({
    company: isCompany,
    members: isArray.of(isMember).ofLength(3),
    headcount: isNumber,
  });

  const options = {
    props: {
      members: { props: { email: (m, ctx) => `${m.name}@${ctx.parent.company.name}` } },
      headcount: (p) => p.members.length,
    },
  } satisfies Parameters<typeof isTeam.generate>[0];

  seed("cross-level");
  const a = isTeam.generate(options);
  seed("cross-level");
  const b = isTeam.generate(options);
  assertEquals(a, b);

  seed("different");
  assertNotEquals(a, isTeam.generate(options));
});

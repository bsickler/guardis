// Side-effect imports: registers the automatic object-spec construction
// hook, stamps base specs/patches chain methods, and binds isEmail's real
// generator. Must all run before a createTypeGuard(shape) guard can have
// an object spec + `.generate()` attached (registration hooks into guard
// construction globally) and before isEmail.generate() produces an actual
// email shape instead of inheriting isString's plain spec.
import "./object.ts";
import "./modules/primitives.ts";
import "./modules/strings.ts";
import "./modules/collections.ts";

import { assert, assertEquals, assertThrows } from "@std/assert";
import { createTypeGuard, isArray, isMap, isNumber, isSet, isString } from "@spudlabs/guardis";
import { isEmail } from "@spudlabs/guardis/strings";
import { registerGen, resolveSpec } from "./spec.ts";
import { gen } from "../mod.ts";

Deno.test("createTypeGuard(shape) object specs", async (t) => {
  await t.step("builds a guard and a matching object spec automatically", () => {
    const isUser = createTypeGuard({ id: isNumber, name: isString });
    assert(isUser({ id: 1, name: "Alice" }));
    assertEquals(resolveSpec(isUser)?.kind, "object");
  });

  await t.step("generate() produces an object with typed fields", () => {
    const isUser = createTypeGuard({ id: isNumber, name: isString });
    const sample = isUser.generate();
    assertEquals(typeof sample.id, "number");
    assertEquals(typeof sample.name, "string");
  });
});

Deno.test("createTypeGuard(shape) relational properties", async (t) => {
  await t.step("derive function computes a property from its siblings", () => {
    const isUser = createTypeGuard({
      firstName: isString,
      lastName: isString,
      companyName: isString,
      email: isEmail,
    });
    const user = isUser.generate({
      props: {
        email: (props) => `${props.firstName}.${props.lastName}@${props.companyName}.com`,
      },
    });
    assert(user.email.startsWith(`${user.firstName}.${user.lastName}@`));
    assert(user.email.endsWith(`@${user.companyName}.com`));
  });

  await t.step("zero-arg generate() still works unchanged", () => {
    const isUser = createTypeGuard({ firstName: isString, lastName: isString, email: isEmail });
    const user = isUser.generate();
    assertEquals(typeof user.firstName, "string");
  });

  await t.step("chains: a relational property can derive from another relational property", () => {
    const isPerson = createTypeGuard({
      firstName: isString,
      lastName: isString,
      fullName: isString,
      email: isEmail,
    });
    const person = isPerson.generate({
      props: {
        fullName: (props) => `${props.firstName} ${props.lastName}`,
        email: (props) => `${props.fullName.replace(" ", ".")}@example.com`,
      },
    });
    assertEquals(person.fullName, `${person.firstName} ${person.lastName}`);
    assert(person.email.startsWith(person.fullName.replace(" ", ".")));
  });

  await t.step("memoization: a property read by multiple siblings resolves exactly once", () => {
    let fullNameCalls = 0;
    const isPerson = createTypeGuard({
      firstName: isString,
      lastName: isString,
      fullName: isString,
      email: isEmail,
      username: isString,
    });
    const person = isPerson.generate({
      props: {
        fullName: (props) => {
          fullNameCalls++;
          return `${props.firstName}-${props.lastName}`;
        },
        email: (props) => `${props.fullName}@example.com`,
        username: (props) => props.fullName,
      },
    });
    assertEquals(fullNameCalls, 1);
    assertEquals(person.username, person.fullName);
    assert(person.email.startsWith(person.fullName));
  });

  await t.step("cycle detection: mutually-dependent relational properties throw", () => {
    const isCyclic = createTypeGuard({ a: isString, b: isString });
    assertThrows(
      () =>
        isCyclic.generate({
          props: {
            a: (props) => props.b,
            b: (props) => props.a,
          },
        }),
      Error,
      "circular dependency in relational properties",
    );
  });

  await t.step(
    "validation: a derive function producing an invalid value throws immediately",
    () => {
      const isValidated = createTypeGuard({ email: isEmail });
      assertThrows(
        () => isValidated.generate({ props: { email: () => "not-an-email" } }),
        TypeError,
        "the generated object fails its own guard",
      );
    },
  );

  await t.step("nested object property: relational options recurse", () => {
    const isAddress = createTypeGuard({ street: isString, city: isString });
    const isCompany = createTypeGuard({ name: isString, address: isAddress, slogan: isString });
    const company = isCompany.generate({
      props: {
        slogan: (props) => `${props.name} is great, located in ${props.address.city}`,
      },
    });
    assert(company.slogan.includes(company.name));
    assert(company.slogan.includes(company.address.city));
  });
});

Deno.test("createTypeGuard(shape).extend(shape) relational properties", async (t) => {
  await t.step("resolveSpec reflects the full merged field set", () => {
    const isPerson = createTypeGuard({ firstName: isString, companyName: isString });
    const isCustomer = isPerson.extend({ customerId: isString });
    const spec = resolveSpec(isCustomer);
    assertEquals(spec?.kind, "object");
    assertEquals(
      Object.keys(spec && "fields" in spec ? spec.fields : {}).sort(),
      ["companyName", "customerId", "firstName"],
    );
  });

  await t.step("a derive function on the new field can read inherited base fields", () => {
    const isPerson = createTypeGuard({ firstName: isString, companyName: isString });
    const isCustomer = isPerson.extend({ customerId: isString });
    const customer = isCustomer.generate({
      props: {
        customerId: (props) => `${props.companyName}-CUST`,
      },
    });
    assertEquals(customer.customerId, `${customer.companyName}-CUST`);
    assertEquals(typeof customer.firstName, "string");
  });

  await t.step("two-level extend chain merges fields cumulatively", () => {
    const isPerson = createTypeGuard({ firstName: isString, companyName: isString });
    const isCustomer = isPerson.extend({ customerId: isString });
    const isVip = isCustomer.extend({ vipTier: isString });
    const vip = isVip.generate({
      props: {
        customerId: (props) => `${props.companyName}-CUST`,
        vipTier: (props) => `${props.customerId}-VIP`,
      },
    });
    assertEquals(typeof vip.firstName, "string");
    assertEquals(vip.customerId, `${vip.companyName}-CUST`);
    assertEquals(vip.vipTier, `${vip.customerId}-VIP`);
  });

  await t.step("validation uses the extended guard, not the parent's", () => {
    const isPerson = createTypeGuard({ firstName: isString });
    const isCustomer = isPerson.extend({ email: isEmail });
    assertThrows(
      () => isCustomer.generate({ props: { email: () => "not-an-email" } }),
      TypeError,
      "the generated object fails its own guard",
    );
  });

  await t.step("parser-based extend still inherits the parent's spec unmodified", () => {
    const isPerson = createTypeGuard({ firstName: isString, companyName: isString });
    const isVerified = isPerson.extend((v) => v.firstName.length > 0 ? v : null);
    const spec = resolveSpec(isVerified);
    assertEquals(spec?.kind, "object");
    assertEquals(
      Object.keys(spec && "fields" in spec ? spec.fields : {}).sort(),
      ["companyName", "firstName"],
    );
  });
});

Deno.test("cross-level relational properties", async (t) => {
  const isCompany = createTypeGuard({ name: isString });
  const isTeamMember = createTypeGuard({ name: isString, email: isString });

  await t.step("every array element derives from the object that owns the array", () => {
    const isTeam = createTypeGuard({
      company: isCompany,
      members: isArray.of(isTeamMember).ofLength(3),
    });

    const team = isTeam.generate({
      props: {
        members: {
          props: { email: (m, ctx) => `${m.name}@${ctx.parent.company.name.toLowerCase()}.com` },
        },
      },
    });

    assertEquals(team.members.length, 3);
    for (const member of team.members) {
      assertEquals(member.email, `${member.name}@${team.company.name.toLowerCase()}.com`);
    }
    assert(isTeam(team), "the generated team should satisfy its own guard");
  });

  await t.step(
    "both directions at once: children derive from the parent, parent aggregates them",
    () => {
      const isTeam = createTypeGuard({
        company: isCompany,
        members: isArray.of(isTeamMember).ofLength(4),
        headcount: isNumber,
      });

      const team = isTeam.generate({
        props: {
          members: { props: { email: (m, ctx) => `${m.name}@${ctx.parent.company.name}` } },
          headcount: (p) => p.members.length,
        },
      });

      assertEquals(team.headcount, 4);
      for (const member of team.members) {
        assertEquals(member.email, `${member.name}@${team.company.name}`);
      }
    },
  );

  await t.step("a nested object derives from an outer sibling", () => {
    const isNamedCompanyUser = createTypeGuard({ firstName: isString, company: isCompany });
    const user = isNamedCompanyUser.generate({
      props: { company: { props: { name: (_c, ctx) => `${ctx.parent.firstName}'s Company` } } },
    });
    assertEquals(user.company.name, `${user.firstName}'s Company`);
  });

  await t.step("ctx.index differentiates elements of the same array", () => {
    const isTeam = createTypeGuard({ members: isArray.of(isTeamMember).ofLength(3) });
    const team = isTeam.generate({
      props: { members: { props: { name: (_m, ctx) => `member-${ctx.index}` } } },
    });
    assertEquals(team.members.map((m) => m.name), ["member-0", "member-1", "member-2"]);
  });

  await t.step("a cycle that only closes across levels throws rather than looping", () => {
    const isOuter = createTypeGuard({
      summary: isString,
      child: createTypeGuard({ note: isString }),
    });
    assertThrows(
      () =>
        isOuter.generate({
          props: {
            summary: (p) => p.child.note,
            child: { props: { note: (_c, ctx) => ctx.parent.summary } },
          },
        }),
      Error,
      "circular dependency in relational properties",
    );
  });

  await t.step(
    "guard validation still fires when a cross-level deriver produces a bad value",
    () => {
      const isOuter = createTypeGuard({
        tag: isString,
        child: createTypeGuard({ note: isString }),
      });
      assertThrows(
        () =>
          isOuter.generate({
            // A number where the guard demands a string.
            props: { child: { props: { note: (() => 42) as unknown as () => string } } },
          }),
        TypeError,
        "fails its own guard",
      );
    },
  );
});

Deno.test("registered defaults apply only where registered", async (t) => {
  await t.step(
    "a child object guard's registered props apply at its own generate(), not nested",
    () => {
      const isChild = createTypeGuard({ label: isString });
      isChild.defineGenerator({ props: { label: () => "registered" } });
      const isParent = createTypeGuard({ child: isChild });

      assertEquals(isChild.generate().label, "registered");
      assert(
        isParent.generate().child.label !== "registered",
        "the child's registered default must not apply when it is nested as a field",
      );
    },
  );

  await t.step(
    "a child primitive guard's registered bounds apply at its own generate(), not nested",
    () => {
      const isBoundedNumber = isNumber.gte(0);
      // Primitives get no typed defineGenerator options overload (see
      // define-generator.test.ts) -- same untyped `unknown` dispatch as always.
      (isBoundedNumber as unknown as { defineGenerator(defaults: unknown): void })
        .defineGenerator({ min: 5000, max: 5001 });
      const isContainer = createTypeGuard({ n: isBoundedNumber });

      assert(isBoundedNumber.generate() >= 5000, "registered bounds apply at its own call");
      assert(
        isContainer.generate().n < 5000,
        "registered bounds must not apply when nested as a field",
      );
    },
  );

  await t.step(
    "the root guard's registered defaults are still applied by a bare generate()",
    () => {
      const isRoot = createTypeGuard({ label: isString });
      isRoot.defineGenerator({ props: { label: () => "root-registered" } });
      assertEquals(isRoot.generate().label, "root-registered");
    },
  );

  await t.step("a call-time option still overrides the root's registered default", () => {
    const isRoot = createTypeGuard({ label: isString });
    isRoot.defineGenerator({ props: { label: () => "registered" } });
    assertEquals(
      isRoot.generate({ props: { label: () => "call-time" } }).label,
      "call-time",
    );
  });

  await t.step(
    "a child's .defineGenerator(fn) -- the function overload -- IS honored when nested",
    () => {
      const isChild = createTypeGuard({ label: isString });
      isChild.defineGenerator(() => ({ label: "from-fn" }));
      const isParent = createTypeGuard({ child: isChild });

      assertEquals(isParent.generate().child.label, "from-fn");
    },
  );
});

// Every composed position (object field, array/set/map element, tuple
// position, union branch) points at its guard rather than snapshotting a
// spec at composition time, so registering a generator AFTER the enclosing
// guard was built is still honored at generation time. Each step below
// composes first and registers second, which is exactly what late binding
// is for.
Deno.test("late-bound spec resolution", async (t) => {
  const noSpecString = (name: string) =>
    createTypeGuard(name, (v: unknown): string | null => typeof v === "string" ? v : null);

  await t.step(
    "1. defineGenerator(fn) on a child registered AFTER the parent, with no prior spec, is honored",
    () => {
      const isChild = noSpecString("no-prior-spec");
      const isParent = createTypeGuard({ child: isChild });
      isChild.defineGenerator(() => "late-bound");
      assertEquals(isParent.generate().child, "late-bound");
    },
  );

  await t.step(
    "2. defineGenerator(fn) on a child that HAD a prior spec, registered after the parent, wins",
    () => {
      const isChild = isString.min(3);
      const isParent = createTypeGuard({ child: isChild });
      isChild.defineGenerator(() => "overridden");
      assertEquals(isParent.generate().child, "overridden");
    },
  );

  await t.step("3. isArray.of(child) honors a defineGenerator() registered afterward", () => {
    const isChild = noSpecString("array-child");
    const isRow = isArray.of(isChild).ofLength(2);
    isChild.defineGenerator(() => "array-late");
    assertEquals(isRow.generate(), ["array-late", "array-late"]);
  });

  await t.step(
    "4. isSet.of(child) and isMap.of(k, v) honor registration made afterward",
    () => {
      const isSetChild = noSpecString("set-child");
      const isSetRow = isSet.of(isSetChild).ofSize(1);
      isSetChild.defineGenerator(() => "set-late");
      assertEquals([...isSetRow.generate()], ["set-late"]);

      const isKey = noSpecString("map-key");
      const isValue = noSpecString("map-value");
      const isMapRow = isMap.of(isKey, isValue).ofSize(1);
      isKey.defineGenerator(() => "key-late");
      isValue.defineGenerator(() => "value-late");
      assertEquals([...isMapRow.generate().entries()], [["key-late", "value-late"]]);
    },
  );

  await t.step("5. gen.tuple(child) honors registration made afterward", () => {
    const isChild = noSpecString("tuple-child");
    const isRow = gen.tuple(isChild, isChild);
    isChild.defineGenerator(() => "tuple-late");
    assertEquals(isRow.generate(), ["tuple-late", "tuple-late"]);
  });

  await t.step("6. a.or(b) then b.defineGenerator(fn) is honored", () => {
    const isA = noSpecString("or-a");
    // isA needs SOME generator too: an unresolvable branch throws when picked
    // (see self-guard-violations.test.ts's unresolvable-guard test) rather
    // than silently fabricating a string, so it can't be left unresolved for
    // this test.
    isA.defineGenerator(() => "a-value");
    const isB = noSpecString("or-b");
    const isEither = isA.or(isB);
    isB.defineGenerator(() => "b-late");
    const seen = new Set<unknown>();
    for (let i = 0; i < 50; i++) seen.add(isEither.generate());
    assert(seen.has("b-late"), "the b branch's late-registered generator was never observed");
  });

  await t.step("7. registerGen(child, ...) after the parent is constructed is honored", () => {
    const isChild = noSpecString("registered-after");
    const isParent = createTypeGuard({ child: isChild });
    registerGen(isChild, { kind: "string", constraints: { ofLength: 9 } });
    assertEquals(isParent.generate().child.length, 9);
  });

  await t.step(
    "8. two levels deep: registering on a grandchild after both ancestors exist is honored",
    () => {
      const isGrandchild = noSpecString("grandchild");
      const isChild = createTypeGuard({ grandchild: isGrandchild });
      const isParent = createTypeGuard({ child: isChild });
      isGrandchild.defineGenerator(() => "deep-late");
      assertEquals(isParent.generate().child.grandchild, "deep-late");
    },
  );

  await t.step(
    "9. .extend() inherits a field ref, so a later defineGenerator on that guard is honored",
    () => {
      const isShared = noSpecString("shared-field");
      const isBase = createTypeGuard({ shared: isShared });
      const isExtended = isBase.extend({ extra: isString });
      isShared.defineGenerator(() => "extend-late");
      assertEquals(isExtended.generate().shared, "extend-late");
    },
  );

  await t.step(
    "10. isArray.of(child).min(2) -- the mergeConstraint carry-forward -- late binding survives",
    () => {
      const isChild = noSpecString("array-min-child");
      const isRow = isArray.of(isChild).min(2);
      isChild.defineGenerator(() => "min-late");
      const value = isRow.generate();
      assert(value.length >= 2, `length ${value.length} below the min(2) bound`);
      for (const v of value) assertEquals(v, "min-late");
    },
  );

  await t.step(
    "11. a props deriver fills a field whose guard has no resolvable spec",
    () => {
      const isBarePredicateField = (v: unknown): v is number => typeof v === "number";
      const isParent = createTypeGuard({ n: isBarePredicateField });
      const result = isParent.generate({ props: { n: () => 42 } });
      assertEquals(result.n, 42);
    },
  );
});

// A shape constant (core compiles it to isExactly) has no guard of its own
// to name, so `specForField` gives it a fixed spec instead of dropping it --
// without that, the generated object would fail its own guard. A
// bare-predicate field similarly has no plugin bag; generating one produces
// the useful "fails its own guard" TypeError rather than crashing on a
// property read of undefined.
Deno.test("shape constant fields", async (t) => {
  await t.step("a constant field generates the constant and passes its own guard", () => {
    const isUser = createTypeGuard({ kind: "user", name: isString });
    const user = isUser.generate();
    assertEquals(user.kind, "user");
    assertEquals(typeof user.name, "string");
    assert(isUser(user), "the generated object should satisfy its own guard");
  });

  await t.step(
    "a constant field alongside guard fields generates correctly across repeated samples",
    () => {
      const isEvent = createTypeGuard({ type: "click", x: isNumber, y: isNumber });
      for (let i = 0; i < 10; i++) {
        const event = isEvent.generate();
        assertEquals(event.type, "click");
        assert(isEvent(event), "the generated object should satisfy its own guard");
      }
    },
  );

  await t.step("a numeric constant field", () => {
    const isRow = createTypeGuard({ version: 2, label: isString });
    const row = isRow.generate();
    assertEquals(row.version, 2);
    assert(isRow(row));
  });

  await t.step("a boolean constant field", () => {
    const isRow = createTypeGuard({ active: true, label: isString });
    const row = isRow.generate();
    assertEquals(row.active, true);
    assert(isRow(row));
  });

  await t.step("a null constant field", () => {
    const isRow = createTypeGuard({ deletedAt: null, label: isString });
    const row = isRow.generate();
    assertEquals(row.deletedAt, null);
    assert(isRow(row));
  });
});

Deno.test("bare-predicate shape fields", async (t) => {
  await t.step(
    "constructs without throwing (see spec.test.ts for resolveSpec's own coverage)",
    () => {
      const isParent = createTypeGuard({
        n: (v: unknown): v is number => typeof v === "number",
        name: isString,
      });
      assertEquals(typeof isParent, "function");
    },
  );

  await t.step(
    "spec.fields includes the spec-less field's key, but generate() still drops it",
    () => {
      // Accepts `undefined` too, so the object still passes its own guard
      // with `n` entirely absent -- isolates the drop from the separate
      // "fails its own guard" case covered below.
      const isParent = createTypeGuard({
        n: (v: unknown): v is number | undefined => v === undefined || typeof v === "number",
        name: isString,
      });
      const spec = resolveSpec(isParent);
      assert(
        spec && "fields" in spec && "n" in spec.fields,
        "field key must survive into spec.fields",
      );

      const result = isParent.generate() as Record<string, unknown>;
      assertEquals(
        "n" in result,
        false,
        "a field with no resolvable spec and no deriver drops entirely",
      );
    },
  );

  await t.step(
    "with no deriver to fill it, generate() throws the useful 'fails its own guard' error, not a crash",
    () => {
      const isParent = createTypeGuard({
        n: (v: unknown): v is number => typeof v === "number",
        name: isString,
      });
      assertThrows(
        () => isParent.generate(),
        TypeError,
        "the generated object fails its own guard",
      );
    },
  );
});

// Side-effect imports: registers the automatic object-spec construction
// hook, stamps base specs/patches chain methods, and binds isEmail's real
// generator. Must all run before a createTypeGuard(shape) guard can have
// an object spec + `.generate()` attached (registration hooks into guard
// construction globally) and before isEmail.generate() produces an actual
// email shape instead of inheriting isString's plain spec.
import "./object.ts";
import "./modules/primitives.ts";
import "./modules/strings.ts";

import { assert, assertEquals, assertThrows } from "@std/assert";
import { createTypeGuard, isNumber, isString } from "@spudlabs/guardis";
import { isEmail } from "@spudlabs/guardis/strings";
import { resolveSpec } from "./spec.ts";

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
      "Circular dependency in relational properties",
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

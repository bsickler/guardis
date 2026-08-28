import "./object.ts";
import "./modules/primitives.ts";
import "./modules/strings.ts";

import { assert, assertEquals, assertThrows } from "@std/assert";
import { createTypeGuard, isNumber, isString } from "@spudlabs/guardis";
import { isInternationalPhone } from "@spudlabs/guardis/strings-branded";

Deno.test("guard.defineGenerator() options overload", async (t) => {
  await t.step("sets defaults an object guard's zero-arg generate() reflects", () => {
    const isUser = createTypeGuard({ id: isNumber, email: isString });
    isUser.defineGenerator({ props: { email: () => "default@example.com" } });

    const sample = isUser.generate();
    assertEquals(sample.email, "default@example.com");
  });

  await t.step("props merge per-field: overriding one field keeps the other default", () => {
    const isUser = createTypeGuard({ id: isNumber, email: isString, name: isString });
    isUser.defineGenerator({
      props: {
        email: () => "default@example.com",
        name: () => "Default Name",
      },
    });

    const sample = isUser.generate({ props: { name: () => "Overridden" } });
    assertEquals(sample.name, "Overridden");
    assertEquals(sample.email, "default@example.com");
  });

  await t.step("primitive constraints merge across default and call-time bounds", () => {
    // Primitives (isString/isNumber/etc.) don't get a typed defineGenerator
    // options overload -- see spec.ts's "Known, explicit non-goal" doc --
    // since .min()/.max() chain methods already cover registering default
    // constraints. This still exercises interpret()'s 3-way mergeConstraints
    // path (spec constraints -> defaults -> call-time options) directly,
    // via the same untyped `unknown` dispatch defineGenerator always uses
    // at runtime regardless of what the public type surface allows.
    const isCode = isString.min(10) as unknown as {
      defineGenerator(defaults: unknown): void;
      generate(options?: unknown): string;
    };
    isCode.defineGenerator({ max: 20 });

    for (let i = 0; i < 20; i++) {
      const sample = isCode.generate();
      assert(
        sample.length >= 10 && sample.length <= 20,
        `expected length in [10,20], got ${sample.length}`,
      );
    }
  });

  await t.step("defineGenerator() returns the guard for chaining", () => {
    const isUser = createTypeGuard({ id: isNumber, name: isString })
      .defineGenerator({ props: { name: () => "Chained" } });

    assertEquals(isUser.generate().name, "Chained");
  });

  await t.step("a branded guard's registry-typed options become the real default", () => {
    isInternationalPhone.defineGenerator({ countryCode: "44" });

    const value = isInternationalPhone.generate();
    assert(value.startsWith("+44"), `expected ${value} to start with +44`);
  });

  await t.step(
    "a second chained call is a compile error, but generate()/extend() still work",
    () => {
      const isUser = createTypeGuard({ id: isNumber, name: isString })
        .defineGenerator({ props: { name: () => "Chained" } });

      assertEquals(isUser.generate().name, "Chained");
      const isEmployee = isUser.extend({ role: isString });
      assert(isEmployee({ id: 1, name: "a", role: "eng" }));

      // @ts-expect-error defineGenerator() shouldn't be chainable a second time
      isUser.defineGenerator({ props: {} });
    },
  );
});

Deno.test("guard.defineGenerator() function overload", async (t) => {
  await t.step("binds a generator directly to a custom guard", () => {
    const isProductSku = createTypeGuard(
      "product-sku",
      (v: unknown): string | null => typeof v === "string" && /^SKU-\d{4,}$/.test(v) ? v : null,
    );
    isProductSku.defineGenerator(() => `SKU-${1000 + Math.floor(Math.random() * 9000)}`);

    isProductSku.generate();
  });

  await t.step("throws immediately if the generator's own output fails its guard", () => {
    const isStrictlyLowercase = createTypeGuard(
      "lowercase",
      (v: unknown): string | null => typeof v === "string" && v === v.toLowerCase() ? v : null,
    );
    isStrictlyLowercase.defineGenerator(() => "NOT-LOWERCASE");

    assertThrows(
      () => isStrictlyLowercase.generate(),
      TypeError,
      "produced a value that fails its own guard",
    );
  });

  await t.step("resolves to the function overload even on an object-shaped guard", () => {
    const isUser = createTypeGuard({ id: isNumber, name: isString });
    isUser.defineGenerator(() => ({ id: 1, name: "Alice" }));

    assertEquals(isUser.generate(), { id: 1, name: "Alice" });
  });
});

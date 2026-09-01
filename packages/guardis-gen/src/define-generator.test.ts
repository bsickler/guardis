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
    // options overload -- .min()/.max() chain methods already cover
    // registering default constraints, so there's no separate typed path
    // for it. This still exercises the full precedence chain (spec
    // constraints -> registered defaults -> call-time options) end to end,
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

  await t.step(
    "the own-guard-failure message survives a BigInt output, instead of crashing on it",
    () => {
      // JSON.stringify(1n) throws "Do not know how to serialize a BigInt" --
      // straight in that message would destroy the diagnostic (and the guard
      // name) while trying to report it.
      const isStrictlyLowercase = createTypeGuard(
        "lowercase-bigint",
        (v: unknown): string | null => typeof v === "string" && v === v.toLowerCase() ? v : null,
      );
      (isStrictlyLowercase as unknown as { defineGenerator(fn: () => unknown): void })
        .defineGenerator(() => 1n);

      const error = assertThrows(
        () => isStrictlyLowercase.generate(),
        TypeError,
        "produced a value that fails its own guard",
      );
      assert(error.message.includes("lowercase-bigint"), `message was: ${error.message}`);
      assert(!error.message.includes("Do not know how to serialize"), error.message);
    },
  );

  await t.step(
    "the own-guard-failure message survives a live props proxy leaked inside an array",
    () => {
      // "computed" reads "tag" via a sibling deriver, forcing it while it's
      // still resolving -- this is what makes the embedded proxy's own
      // traversal hit lazy-record's circular-dependency error mid-JSON.stringify
      // (caught internally by safeStringify), rather than just an omitted
      // in-flight field. Before the fix this masked the real diagnostic with
      // "Cannot convert undefined or null to object".
      const isTag = createTypeGuard(
        "tag",
        (v: unknown): string | null => typeof v === "string" ? v : null,
      );
      isTag.defineGenerator((_options, ctx) => [ctx?.parent] as unknown as string);
      const isPost = createTypeGuard({ title: isString, computed: isString, tag: isTag });

      const error = assertThrows(
        () =>
          (isPost.generate as (o?: unknown) => unknown)({
            props: { computed: (p: Record<string, unknown>) => p.tag },
          }),
        TypeError,
        "produced a value that fails its own guard",
      );
      assert(error.message.includes("tag"), `message was: ${error.message}`);
      assert(
        !error.message.includes("Cannot convert undefined or null to object"),
        error.message,
      );
    },
  );
});

Deno.test("guard.defineGenerator() receives the generation context", async (t) => {
  await t.step("a custom generator used as a nested field can read ctx.parent", () => {
    const isSlug = createTypeGuard("slug", (v) => typeof v === "string" ? v : null);
    isSlug.defineGenerator((_options, ctx) => {
      const owner = ctx?.parent as { title: string } | undefined;
      return owner ? owner.title.toLowerCase().replaceAll(" ", "-") : "no-parent";
    });

    const isPost = createTypeGuard({ title: isString, slug: isSlug });
    const post = isPost.generate({ props: { title: () => "Hello There World" } });
    assertEquals(post.slug, "hello-there-world");
  });

  await t.step("at the root there is no enclosing object, so ctx is undefined", () => {
    const isThing = createTypeGuard("thing", (v) => typeof v === "string" ? v : null);
    let sawCtx: unknown = "unset";
    isThing.defineGenerator((_options, ctx) => {
      sawCtx = ctx;
      return "x";
    });
    isThing.generate();
    assertEquals(sawCtx, undefined);
  });

  await t.step("an existing zero-argument generator is unaffected by the extra parameter", () => {
    const isConst = createTypeGuard("const", (v) => v === "fixed" ? v : null);
    isConst.defineGenerator(() => "fixed");
    assertEquals(isConst.generate(), "fixed");
  });
});

import { assertType, type Equals } from "./test-utils.ts";
import type { GuardPlugin, MergePluginData, MergePluginOptions } from "./plugin.ts";
import type { GuardMeta, Parser, TypeGuardShape } from "./types.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { createTypeGuard, isNumber, isString } from "./guard.ts";

Deno.test("plugin types", async (t) => {
  await t.step("GuardPlugin with id, init returning string data compiles and infers TData", () => {
    const plugin: GuardPlugin<"test", string> = {
      id: "test",
      init(_name, args, _options) {
        return { args, data: "hello" };
      },
    };
    assertType<Equals<typeof plugin.id, "test">>();

    const result = plugin.init(undefined, ((v: unknown) => v) as Parser, undefined as void);
    assertType<Equals<typeof result.data, string>>();
  });

  await t.step("GuardPlugin with options compiles", () => {
    const plugin: GuardPlugin<"desc", Record<string, string>, { description: string }> = {
      id: "desc",
      init(_name, args, options) {
        return { args, data: { field: options.description } };
      },
    };

    const result = plugin.init("test", ((v: unknown) => v) as Parser, {
      description: "a description",
    });
    assertType<Equals<typeof result.data, Record<string, string>>>();
  });

  await t.step("GuardPlugin init accepts TypeGuardShape args", () => {
    const plugin: GuardPlugin<"meta", string> = {
      id: "meta",
      init(_name, args, _options) {
        // Plugin can check if args is a shape or parser
        if (typeof args === "object") {
          return { args, data: "shape" };
        }
        return { args, data: "parser" };
      },
    };

    const shape: TypeGuardShape = { name: (_v: unknown): _v is string => typeof _v === "string" };
    const result = plugin.init(undefined, shape, undefined as void);
    assertType<Equals<typeof result.data, string>>();
  });

  await t.step("MergePluginData produces correct keyed structure from two plugins", () => {
    type PluginA = GuardPlugin<"a", string>;
    type PluginB = GuardPlugin<"b", number>;
    type Merged = MergePluginData<[PluginA, PluginB]>;

    assertType<Equals<Merged, { a: string; b: number }>>();
  });

  await t.step("MergePluginData works with a single plugin", () => {
    type PluginA = GuardPlugin<"only", boolean>;
    type Merged = MergePluginData<[PluginA]>;

    assertType<Equals<Merged, { only: boolean }>>();
  });

  await t.step("MergePluginOptions merges options from two plugins", () => {
    type PluginA = GuardPlugin<"a", string, { fieldA: string }>;
    type PluginB = GuardPlugin<"b", number, { fieldB: number }>;
    type Merged = MergePluginOptions<[PluginA, PluginB]>;

    assertType<Equals<Merged, { fieldA: string } & { fieldB: number }>>();
  });

  await t.step("MergePluginOptions omits void options plugins", () => {
    type PluginNoOpts = GuardPlugin<"noOpts", string>;
    type PluginWithOpts = GuardPlugin<"withOpts", number, { setting: boolean }>;
    type Merged = MergePluginOptions<[PluginNoOpts, PluginWithOpts]>;

    assertType<Equals<Merged, { setting: boolean }>>();
  });

  await t.step("MergePluginOptions with all void options produces empty object", () => {
    type PluginA = GuardPlugin<"a", string>;
    type PluginB = GuardPlugin<"b", number>;
    type Merged = MergePluginOptions<[PluginA, PluginB]>;

    // deno-lint-ignore ban-types
    assertType<Equals<Merged, {}>>();
  });

  await t.step("GuardMeta plugins field is optional and typed as Record<string, unknown>", () => {
    type Meta = GuardMeta<string>;

    // plugins is optional
    assertType<Equals<Meta["plugins"], Record<string, unknown> | undefined>>();

    // GuardMeta without plugins set is valid
    const meta: Meta = {
      name: "test",
      parser: (_v: unknown) => null,
      context: (_v: unknown) => ({ value: "" as string, issues: undefined }),
    };
    assertType<Equals<typeof meta.plugins, Record<string, unknown> | undefined>>();
  });

  await t.step("GuardMeta with plugins set infers correctly", () => {
    const meta: GuardMeta<string> = {
      name: "test",
      parser: (_v: unknown) => null,
      context: (_v: unknown) => ({ value: "" as string, issues: undefined }),
      plugins: { desc: "hello", schema: { type: "string" } },
    };

    // plugins is present and is Record<string, unknown>
    assertType<Equals<typeof meta.plugins, Record<string, unknown> | undefined>>();
    // At runtime, it's set
    if (meta.plugins) {
      const _desc: unknown = meta.plugins["desc"];
    }
  });
});

// -- Unit 2: withPlugins runtime tests --

/** Simple plugin that records creation metadata */
function createMetaPlugin(): GuardPlugin<"meta", { createdWith: string }> {
  return {
    id: "meta",
    init(name, args, _options) {
      return { args, data: { createdWith: name ?? "anonymous" } };
    },
  };
}

/** Plugin that accepts options */
function createLabelPlugin(): GuardPlugin<"label", string, { label: string }> {
  return {
    id: "label",
    init(_name, args, options) {
      return { args, data: options?.label ?? "unlabeled" };
    },
  };
}

Deno.test("withPlugins - single plugin", async (t) => {
  await t.step("returns a function", () => {
    const metaPlugin = createMetaPlugin();
    const factory = createTypeGuard.withPlugins(metaPlugin);
    assertEquals(typeof factory, "function");
  });

  await t.step("extended factory creates guard with plugin data from parser", () => {
    const metaPlugin = createMetaPlugin();
    const factory = createTypeGuard.withPlugins(metaPlugin);
    const guard = factory((v: unknown): string | null => typeof v === "string" ? v : null);

    assert(guard("hello"));
    assert(!guard(42));
    assertEquals(guard._.plugins?.meta, { createdWith: "anonymous" });
  });

  await t.step("extended factory with named guard passes name to init", () => {
    const metaPlugin = createMetaPlugin();
    const factory = createTypeGuard.withPlugins(metaPlugin);
    const guard = factory("myGuard", (v: unknown): string | null => typeof v === "string" ? v : null);

    assert(guard("hello"));
    assertEquals(guard._.plugins?.meta, { createdWith: "myGuard" });
    assertEquals(guard._.name, "myGuard");
  });

  await t.step("extended factory with shape creates working guard with plugin data", () => {
    const metaPlugin = createMetaPlugin();
    const factory = createTypeGuard.withPlugins(metaPlugin);
    const guard = factory({ name: isString, age: isNumber });

    assert(guard({ name: "Alice", age: 30 }));
    assert(!guard({ name: "Alice" }));
    assert(!guard("not an object"));
    assertEquals(guard._.plugins?.meta, { createdWith: "anonymous" });
  });

  await t.step("extended factory with named shape", () => {
    const metaPlugin = createMetaPlugin();
    const factory = createTypeGuard.withPlugins(metaPlugin);
    const guard = factory("Person", { name: isString, age: isNumber });

    assert(guard({ name: "Bob", age: 25 }));
    assertEquals(guard._.plugins?.meta, { createdWith: "Person" });
    assertEquals(guard._.name, "Person");
  });

  await t.step("plugin options passed as last arg are forwarded to init", () => {
    const labelPlugin = createLabelPlugin();
    const factory = createTypeGuard.withPlugins(labelPlugin);
    const guard = factory(
      (v: unknown): string | null => typeof v === "string" ? v : null,
      { label: "my-label" },
    );

    assert(guard("hello"));
    assertEquals(guard._.plugins?.label, "my-label");
  });

  await t.step("extended factory without plugin options — init receives undefined", () => {
    const labelPlugin = createLabelPlugin();
    const factory = createTypeGuard.withPlugins(labelPlugin);
    const guard = factory((v: unknown): string | null => typeof v === "string" ? v : null);

    assert(guard("test"));
    assertEquals(guard._.plugins?.label, "unlabeled");
  });

  await t.step("guard has all standard properties", () => {
    const metaPlugin = createMetaPlugin();
    const factory = createTypeGuard.withPlugins(metaPlugin);
    const guard = factory({ name: isString });

    // Check all standard methods exist
    assertEquals(typeof guard.strict, "function");
    assertEquals(typeof guard.assert, "function");
    assertEquals(typeof guard.validate, "function");
    assertEquals(typeof guard.or, "function");
    assertEquals(typeof guard.extend, "function");
    assertEquals(typeof guard.optional, "function");
    assert("notEmpty" in guard);
  });

  await t.step("guard validates identically to base createTypeGuard", () => {
    const metaPlugin = createMetaPlugin();
    const factory = createTypeGuard.withPlugins(metaPlugin);

    const baseGuard = createTypeGuard({ name: isString, age: isNumber });
    const pluginGuard = factory({ name: isString, age: isNumber });

    const testValues = [
      { name: "Alice", age: 30 },
      { name: "Alice" },
      { age: 30 },
      "not an object",
      null,
      42,
      { name: 123, age: "thirty" },
    ];

    for (const val of testValues) {
      assertEquals(
        pluginGuard(val),
        baseGuard(val),
        `Mismatch for value: ${JSON.stringify(val)}`,
      );
    }
  });
});

Deno.test("withPlugins - multi-plugin composition", async (t) => {
  await t.step("two plugins produce both keyed slots with correct data", () => {
    const metaPlugin = createMetaPlugin();
    const labelPlugin = createLabelPlugin();
    const factory = createTypeGuard.withPlugins(metaPlugin, labelPlugin);

    const guard = factory(
      "test",
      (v: unknown): string | null => typeof v === "string" ? v : null,
      { label: "composed" },
    );

    assert(guard("hello"));
    assertEquals(guard._.plugins?.meta, { createdWith: "test" });
    assertEquals(guard._.plugins?.label, "composed");
  });

  await t.step("options forwarded to respective plugin init calls", () => {
    const labelPlugin = createLabelPlugin();
    const metaPlugin = createMetaPlugin();
    const factory = createTypeGuard.withPlugins(labelPlugin, metaPlugin);

    const guard = factory(
      (v: unknown): number | null => typeof v === "number" ? v : null,
      { label: "num-guard" },
    );

    assert(guard(42));
    assert(!guard("nope"));
    assertEquals(guard._.plugins?.label, "num-guard");
    assertEquals(guard._.plugins?.meta, { createdWith: "anonymous" });
  });

  await t.step("duplicate plugin id throws TypeError at withPlugins call time", () => {
    const plugin1: GuardPlugin<"dup", string> = {
      id: "dup",
      init(_n, args) { return { args, data: "a" }; },
    };
    const plugin2: GuardPlugin<"dup", number> = {
      id: "dup",
      init(_n, args) { return { args, data: 1 }; },
    };

    assertThrows(
      () => createTypeGuard.withPlugins(plugin1, plugin2),
      TypeError,
      'Duplicate plugin id: "dup"',
    );
  });
});

Deno.test("withPlugins - shape transformation via init", async (t) => {
  /** Plugin that extracts "description" metadata from enriched shape fields */
  const descriptionPlugin: GuardPlugin<"descriptions", Record<string, string>> = {
    id: "descriptions",
    init(_name, args, _options) {
      if (typeof args === "function") {
        // Parser — pass through unchanged, return empty data
        return { args, data: {} };
      }

      // Shape — extract descriptions and normalize the shape
      const descriptions: Record<string, string> = {};
      const normalizedShape: TypeGuardShape = {};

      for (const [key, value] of Object.entries(args)) {
        if (
          typeof value === "object" && value !== null && !Array.isArray(value) &&
          "type" in value && "description" in value
        ) {
          const enriched = value as { type: (v: unknown) => boolean; description: string };
          descriptions[key] = enriched.description;
          normalizedShape[key] = enriched.type as (v: unknown) => v is unknown;
        } else {
          normalizedShape[key] = value as TypeGuardShape[string];
        }
      }

      return { args: normalizedShape, data: descriptions };
    },
  };

  await t.step("description plugin extracts metadata and normalizes shape", () => {
    const factory = createTypeGuard.withPlugins(descriptionPlugin);

    const guard = factory({
      name: { type: isString, description: "Display name" },
      age: { type: isNumber, description: "Age in years" },
    } as unknown as TypeGuardShape);

    assert(guard({ name: "Alice", age: 30 }));
    assert(!guard({ name: "Alice" }));
    assert(!guard({ name: 123, age: 30 }));

    assertEquals(guard._.plugins?.descriptions, {
      name: "Display name",
      age: "Age in years",
    });
  });

  await t.step("guard from enriched shape validates values correctly", () => {
    const factory = createTypeGuard.withPlugins(descriptionPlugin);

    const guard = factory({
      title: { type: isString, description: "Title of the item" },
    } as unknown as TypeGuardShape);

    assert(guard({ title: "Hello" }));
    assert(!guard({ title: 42 }));
    assert(!guard({}));
    assert(!guard(null));
  });

  await t.step("two transforming plugins chained — second receives first's output", () => {
    let secondPluginReceivedArgs: Parser | TypeGuardShape | undefined;

    const firstPlugin: GuardPlugin<"first", string> = {
      id: "first",
      init(_name, args, _options) {
        if (typeof args === "object") {
          // Transform by adding a marker
          return { args: { ...args, _marker: isString }, data: "first-ran" };
        }
        return { args, data: "first-ran" };
      },
    };

    const secondPlugin: GuardPlugin<"second", string> = {
      id: "second",
      init(_name, args, _options) {
        secondPluginReceivedArgs = args;
        return { args, data: "second-ran" };
      },
    };

    const factory = createTypeGuard.withPlugins(firstPlugin, secondPlugin);
    const guard = factory({ name: isString });

    // Second plugin should have received the transformed args from first
    assert(typeof secondPluginReceivedArgs === "object");
    assert("_marker" in (secondPluginReceivedArgs as TypeGuardShape));

    assertEquals(guard._.plugins?.first, "first-ran");
    assertEquals(guard._.plugins?.second, "second-ran");
  });

  await t.step("transforming plugin receiving a parser passes args through", () => {
    const factory = createTypeGuard.withPlugins(descriptionPlugin);
    const guard = factory((v: unknown): string | null => typeof v === "string" ? v : null);

    assert(guard("hello"));
    assert(!guard(42));
    // Parser path — descriptions should be empty
    assertEquals(guard._.plugins?.descriptions, {});
  });

  await t.step("end-to-end: description plugin with guard creation and validation", () => {
    const factory = createTypeGuard.withPlugins(descriptionPlugin);

    const isUser = factory("User", {
      name: { type: isString, description: "User's display name" },
      email: { type: isString, description: "Email address" },
    } as unknown as TypeGuardShape);

    // Validates correctly
    assert(isUser({ name: "Alice", email: "alice@example.com" }));
    assert(!isUser({ name: "Alice" }));
    assert(!isUser({ email: "alice@example.com" }));

    // Plugin data is present
    assertEquals(isUser._.plugins?.descriptions, {
      name: "User's display name",
      email: "Email address",
    });

    // Guard name is set
    assertEquals(isUser._.name, "User");

    // validate() works
    const result = isUser.validate({ name: "Bob", email: "bob@test.com" });
    assert("value" in result);

    const failResult = isUser.validate({ name: 123 });
    assert("issues" in failResult);
  });
});

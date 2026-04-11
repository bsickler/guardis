import { assertType, type Equals } from "./test-utils.ts";
import type { GuardPlugin, MergePluginData, MergePluginOptions } from "./plugin.ts";
import type { GuardMeta, Parser, TypeGuardShape } from "./types.ts";

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

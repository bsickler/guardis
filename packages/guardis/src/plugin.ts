import type { InferShape, Parser, TypeGuard, TypeGuardShape } from "./types.ts";

/**
 * A plugin that enriches type guards with metadata at creation time.
 *
 * @template TId - String literal identifying this plugin (used as key in `_.plugins`)
 * @template TData - The metadata type this plugin produces
 * @template TOptions - Options this plugin accepts (void if no options needed)
 */
export interface GuardPlugin<TId extends string, TData, TOptions = void> {
  /** Unique identifier for this plugin, used as key in `_.plugins` */
  readonly id: TId;
  /**
   * Called once at guard creation time. Receives the guard name, parser/shape args,
   * and plugin-specific options. Returns the (potentially transformed) args and
   * the plugin's metadata.
   */
  init(
    name: string | undefined,
    args: Parser | TypeGuardShape,
    options: TOptions,
  ): { args: Parser | TypeGuardShape; data: TData };
}

/** Internal shorthand exported for cross-module use in guard.ts. */
// deno-lint-ignore no-explicit-any
export type AnyPlugin = GuardPlugin<string, any, any>;

/** Extracts the merged plugin data record from a tuple of plugins. */
export type MergePluginData<Plugins extends readonly AnyPlugin[]> = {
  [P in Plugins[number] as P["id"]]: P extends GuardPlugin<string, infer TData, infer _TOpts>
    ? TData
    : never;
};

/** Extracts and merges plugin options, omitting plugins with void options. */
export type MergePluginOptions<Plugins extends readonly AnyPlugin[]> = MergePluginOptionsInner<
  Plugins,
  // deno-lint-ignore ban-types
  {}
>;

type MergePluginOptionsInner<
  Plugins extends readonly AnyPlugin[],
  Acc,
> = Plugins extends readonly [infer Head extends AnyPlugin, ...infer Tail extends AnyPlugin[]]
  ? Head extends GuardPlugin<string, infer _TData, infer TOpts>
    ? MergePluginOptionsInner<Tail, TOpts extends void ? Acc : Acc & TOpts>
  : Acc
  : Acc;

/**
 * Type for the extended factory function returned by `withPlugins`.
 */
// deno-lint-ignore no-explicit-any
type PluginOpts<Plugins extends readonly AnyPlugin[]> = MergePluginOptions<Plugins> extends infer O ? [keyof O] extends [never] ? void : O : void;

export type PluginGuard<T, Plugins extends readonly AnyPlugin[]> = TypeGuard<T> & {
  _: TypeGuard<T>["_"] & { plugins: MergePluginData<Plugins> };
};

export interface ExtendedFactory<Plugins extends readonly AnyPlugin[]> {
  <T>(parser: Parser<T>): PluginGuard<T, Plugins>;
  <T>(name: string, parser: Parser<T>): PluginGuard<T, Plugins>;
  <const S extends TypeGuardShape>(shape: S): PluginGuard<InferShape<S>, Plugins>;
  <const S extends TypeGuardShape>(name: string, shape: S): PluginGuard<InferShape<S>, Plugins>;
  <T>(parser: Parser<T>, options: PluginOpts<Plugins>): PluginGuard<T, Plugins>;
  <T>(name: string, parser: Parser<T>, options: PluginOpts<Plugins>): PluginGuard<T, Plugins>;
  <const S extends TypeGuardShape>(shape: S, options: PluginOpts<Plugins>): PluginGuard<InferShape<S>, Plugins>;
  <const S extends TypeGuardShape>(name: string, shape: S, options: PluginOpts<Plugins>): PluginGuard<InferShape<S>, Plugins>;
}

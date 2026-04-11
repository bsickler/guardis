import type { Parser, TypeGuardShape } from "./types.ts";

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

// deno-lint-ignore no-explicit-any
type AnyPlugin = GuardPlugin<string, any, any>;

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

/**
 * plugin.ts - The generic extension surface plugins attach to. Guardis core
 * has no knowledge of what any plugin stores here — it only reserves the
 * slots and drains the construction-hook list.
 * @module
 */
import type { OptionalTypeGuard, TypeGuard } from "./types.ts";

/**
 * Well-known symbol for the per-guard plugin data bag. `Symbol.for` (the
 * global registry) is used instead of `Symbol()` so that separate installs
 * of guardis in the same process still interoperate.
 */
export const GUARDIS_EXT: unique symbol = Symbol.for("guardis.ext");

/**
 * Well-known symbol for the parent-guard reference stamped at derivation
 * sites (`.extend()`, `.optional`, `.notEmpty`). Plugins that want
 * "inherit unless overridden" semantics for their own bag data walk this
 * chain themselves — guardis never reads or interprets it.
 */
export const GUARDIS_PARENT: unique symbol = Symbol.for("guardis.parent");

/**
 * Empty extension point. Plugins augment this via declaration merging:
 *
 * @example
 * ```typescript
 * declare module "@spudlabs/guardis" {
 *   interface GuardisPlugins<T> {
 *     gen: Spec<T>;
 *   }
 * }
 * ```
 */
// deno-lint-ignore no-empty-interface
export interface GuardisPlugins<T> {}

/**
 * The plugin-facing shape every constructed guard actually carries at
 * runtime -- the GUARDIS_EXT bag and GUARDIS_PARENT pointer that
 * `TypeGuard<T>` itself doesn't declare, since ordinary consumers never
 * need them. Kept private to this module -- `pluginBag`/`guardParent`
 * below are the public way to reach these slots, so no other file needs
 * to name this type directly.
 */
interface GuardisPluginCarrier<T> {
  [GUARDIS_EXT]: GuardisPlugins<T>;
  [GUARDIS_PARENT]?: TypeGuard<unknown>;
}

/**
 * Reads a guard's reserved plugin data bag. Every guard `createTypeGuard`
 * builds has one (empty by default, never written to by guardis itself) --
 * see `GuardisPlugins`'s doc for how plugins augment it via declaration
 * merging.
 */
export function pluginBag<T>(guard: TypeGuard<T> | OptionalTypeGuard<T>): GuardisPlugins<T> {
  return (guard as unknown as GuardisPluginCarrier<T>)[GUARDIS_EXT];
}

/**
 * Reads the guard a given guard was derived from (stamped by `.extend()`,
 * `.optional`, `.notEmpty`). Undefined for guards with no derivation parent
 * (base guards, `.or()` results). Plugins use this for "inherit unless
 * overridden" semantics over their own bag data -- guardis itself never
 * reads it.
 */
export function guardParent<T>(
  guard: TypeGuard<T> | OptionalTypeGuard<T>,
): TypeGuard<unknown> | undefined {
  return (guard as unknown as GuardisPluginCarrier<T>)[GUARDIS_PARENT];
}

/**
 * The minimal shape every guard genuinely has by the time construction
 * hooks run — deliberately narrower than TypeGuard<T> (which also demands
 * _TYPE, brand, extend, optional, notEmpty, "~standard"). Guards mid-
 * construction (e.g. inside createOptionalTypeGuard/createNotEmptyTypeGuard)
 * satisfy this without a cast; hooks that need more can narrow further
 * themselves, same as they already do today.
 */
export type ConstructedGuard = {
  (value: unknown): boolean;
  readonly _: { readonly name: string | undefined };
};

type ConstructionHook = (guard: ConstructedGuard) => void;

const constructionHooks: ConstructionHook[] = [];

/**
 * Registers a hook that runs once for every guard `createTypeGuard` builds,
 * after the guard's standard properties are attached. Lets a plugin assign
 * its own capability (e.g. a `.generate()` method) as a plain own-property,
 * so it's available even on guards constructed after the plugin loads —
 * without guardis needing any knowledge of what the hook does.
 *
 * A hook only ever runs for guards built *after* it's registered — there's
 * no retroactive pass over guards that already exist. Plugins that add a
 * capability this way should document that they must be imported before
 * any guard they need to cover (including your own application's guards)
 * is constructed.
 */
export function registerConstructionHook(hook: ConstructionHook): void {
  constructionHooks.push(hook);
}

/** Internal: drains the hook list against a newly constructed guard. */
export function runConstructionHooks(guard: ConstructedGuard): void {
  for (let i = 0; i < constructionHooks.length; i++) {
    constructionHooks[i](guard);
  }
}

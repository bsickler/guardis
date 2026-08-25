/**
 * plugin.ts - The generic extension surface plugins attach to. Guardis core
 * has no knowledge of what any plugin stores here — it only reserves the
 * slots and drains the construction-hook list.
 * @module
 */

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

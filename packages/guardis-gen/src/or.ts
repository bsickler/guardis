/**
 * or.ts - The `.or()` union-spec capability. `.or()` is a real instance
 * method on EVERY constructed guard (unlike `.of()`, which only exists on
 * isArray/isMap/isSet), so this can't be a per-singleton monkeypatch the
 * way modules/*.ts's chain-method patches are -- it has to hook into guard
 * CONSTRUCTION itself, wrapping `.or()` on every guard as it's built.
 *
 * No manual re-patch is needed for chaining (`a.or(b).or(c)`): `.or()`'s
 * result is itself built via `createTypeGuard`, which runs construction
 * hooks for it too, so the SAME hook wraps its `.or()` automatically.
 * @module
 */
import {
  type ConstructedGuard,
  pluginBag,
  type Predicate,
  type TypeGuard,
} from "@spudlabs/guardis";
import { fixedSpec, registerGen, specRef, type SpecSource, unresolvedSpec } from "./spec.ts";
import { attachMethod } from "./utilities/attach.ts";

type OrFn = (...branches: Predicate<unknown>[]) => TypeGuard<unknown>;
type OrCarrier = { or?: OrFn };

/**
 * A constructed guard branch is late-bound via `specRef`. A bare predicate has
 * no plugin bag to point at, so it can't be a `specRef` either -- but it's
 * still a legal `.or()` branch per core's API, and dropping it isn't an
 * option (`pick` draws against `branches.length`). It gets a fixed spec that
 * throws a useful message naming it if generation ever actually picks it,
 * rather than silently fabricating a value of the wrong type for whatever
 * that predicate checks.
 */
function branchSpec(guard: Predicate<unknown>): SpecSource {
  const guardLike = guard as unknown as TypeGuard<unknown>;
  return typeof guard === "function" && pluginBag(guardLike)
    ? specRef(guardLike)
    : fixedSpec(unresolvedSpec(".or() branch", guard));
}

/**
 * Fires for EVERY guard `createTypeGuard` builds -- wraps its `.or()` so
 * the guard it returns gets a "union" spec registered, one branch per
 * argument plus the guard `.or()` was called on.
 */
export function attachOrSpec(guard: ConstructedGuard): void {
  const originalOr = (guard as unknown as OrCarrier).or;
  if (typeof originalOr !== "function") return;

  attachMethod(guard, "or", (...others: Predicate<unknown>[]) => {
    const child = originalOr(...others);
    registerGen(child, {
      kind: "union",
      branches: [guard as unknown as Predicate<unknown>, ...others].map(branchSpec),
    });
    return child;
  });
}

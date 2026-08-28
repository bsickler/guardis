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
  type Predicate,
  registerConstructionHook,
  type TypeGuard,
} from "@spudlabs/guardis";
import { DEFAULT_ELEMENT_SPEC, registerGen, resolveSpec, type Spec } from "./spec.ts";
import { attachMethod } from "./utilities/attach.ts";

type OrFn = (...branches: Predicate<unknown>[]) => TypeGuard<unknown>;
type OrCarrier = { or?: OrFn };

/**
 * Resolves a `.or()` branch's spec, falling back to `DEFAULT_ELEMENT_SPEC`
 * for a branch that isn't a real constructed guard -- `.or()`'s own type
 * signature accepts a bare `(v: unknown) => v is T` predicate, which has no
 * `._` meta for `resolveSpec` to read (and would throw if handed to it).
 */
function branchSpec(guard: Predicate<unknown>): Spec {
  const meta = (guard as { _?: unknown })._;
  const hasMeta = typeof guard === "function" && !!meta && typeof meta === "object";
  return (hasMeta ? resolveSpec(guard as unknown as TypeGuard<unknown>) : undefined) ??
    DEFAULT_ELEMENT_SPEC;
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

let hookRegistered = false;

/** Idempotent -- safe to call more than once. */
export function ensureOrCapability(): void {
  if (hookRegistered) return;
  hookRegistered = true;
  registerConstructionHook(attachOrSpec);
}

/**
 * chain.ts - Patches a guard's core chain methods (min/max/range, plus a
 * caller-named exact-value shorthand -- isString/isArray's `ofLength`,
 * isMap/isSet's `ofSize`) so each result also carries a matching generation
 * spec. The generation-spec-layer counterpart to core's `withSizeMethods`.
 * @module
 */
import type { TypeGuard } from "@spudlabs/guardis";
import { type LengthConstraints, registerGen, type Spec } from "../spec.ts";

/** The chain-method shape every kind this patches exposes: min/max/range. The
 * exact-value shorthand is attached under a caller-chosen key instead, since
 * its name differs by kind. */
export type ChainMethodGuard = TypeGuard<unknown> & {
  min: (n: number) => TypeGuard<unknown>;
  max: (n: number) => TypeGuard<unknown>;
  range: (min: number, max: number) => TypeGuard<unknown>;
};

/** Wraps `guard`'s min/max/range/[exactName] so each result also gets
 * `registerGen`-ed with a matching spec, built by `buildSpec`. Only
 * `min`/`max` re-patch their own result for further chaining, matching
 * core's own type-level restriction; all four call `patchOf`, if given, so
 * a guard-specific `.of()` (which core keeps reachable after every size
 * method) stays spec-aware too. */
export function patchChainMethods(
  guard: ChainMethodGuard,
  exactName: string,
  buildSpec: (parent: TypeGuard<unknown>, patch: LengthConstraints) => Spec,
  patchOf?: (guard: ChainMethodGuard) => void,
): void {
  const dynamic = guard as unknown as Record<string, (n: number) => TypeGuard<unknown>>;
  const originalMin = guard.min;
  const originalMax = guard.max;
  const originalExact = dynamic[exactName];
  const originalRange = guard.range;

  guard.min = (n) => {
    const child = originalMin(n) as ChainMethodGuard;
    registerGen(child, buildSpec(guard, { min: n }));
    patchChainMethods(child, exactName, buildSpec, patchOf);
    patchOf?.(child);
    return child;
  };
  guard.max = (n) => {
    const child = originalMax(n) as ChainMethodGuard;
    registerGen(child, buildSpec(guard, { max: n }));
    patchChainMethods(child, exactName, buildSpec, patchOf);
    patchOf?.(child);
    return child;
  };
  dynamic[exactName] = (n) => {
    const child = originalExact(n);
    registerGen(child, buildSpec(guard, { min: n, max: n }));
    patchOf?.(child as unknown as ChainMethodGuard);
    return child;
  };
  guard.range = (min, max) => {
    const child = originalRange(min, max);
    registerGen(child, buildSpec(guard, { min, max }));
    patchOf?.(child as unknown as ChainMethodGuard);
    return child;
  };
}

/**
 * modules/primitives.ts - Side-effect entry point for guardis' primitive
 * guards (isString, isNumber, isBoolean, isDate, isArray — the default,
 * always-available surface of @spudlabs/guardis, not a subpath). Import
 * this (via the "@spudlabs/guardis-gen/modules/primitives" subpath) BEFORE
 * defining schemas that chain off these primitives — it stamps base specs
 * and monkey-patches the known chain methods (.min/.max/.range/.ofLength,
 * .gt/.gte/.lt/.lte/.finite) so derived guards carry constraint-aware specs
 * instead of a blind inherited default.
 * @module
 */
import { isArray, isBoolean, isDate, isNumber, isString, type TypeGuard } from "@spudlabs/guardis";
import type {
  DateConstraints,
  DictionaryOption,
  ElementOptions,
  LengthConstraints,
  NumberConstraints,
  Spec,
  SpecSource,
} from "../spec.ts";
import { registerGen, resolveSpec, specRef } from "../spec.ts";
import { attachToVariants, ensureGenerateCapability } from "../shared.ts";
import { type ChainMethodGuard, patchChainMethods } from "../utilities/chain.ts";

declare module "@spudlabs/guardis" {
  interface StringTypeGuard {
    /** Overrides this call's length bounds/dictionary; both ends stay optional. */
    generate(options?: LengthConstraints & DictionaryOption<string>): string;
  }
  interface NumberTypeGuard {
    /** Overrides this call's numeric bounds/int-ness/dictionary; all optional. */
    generate(options?: NumberConstraints & DictionaryOption<number>): number;
  }
  interface DateTypeGuard {
    /** Overrides this call's gte/lte bounds/dictionary; both ends stay optional. */
    generate(options?: DateConstraints & DictionaryOption<Date>): Date;
  }
  interface ArrayTypeGuard {
    /** Overrides this call's length bounds/dictionary; both ends stay optional. A bare
     * isArray has no element type, so there are no element options to pass. */
    generate(options?: LengthConstraints & DictionaryOption<unknown[]>): unknown[];
  }
  // `.of()` returns ArraySizeGuard<T>, not ArrayTypeGuard (core keeps `.of()`
  // terminal -- see collections.types.ts's doc on the same restriction for
  // Map/Set) -- needs its own override, or a `.of()` result's
  // `.generate(options)` would resolve through the untyped
  // `GenerateOptionsFor<T1>` fallback (`never`, since arrays don't satisfy
  // any of its branches) and reject any options argument at all.
  interface ArraySizeGuard<T> {
    /**
     * Overrides this call's length bounds; both ends stay optional. Anything
     * beyond the size keys is forwarded to each element -- so an array of
     * objects takes `props` here, and its derive functions see the object
     * that owns the array as `ctx.parent`. A `dictionary` here is the
     * ELEMENT's (via `ElementOptions<T>`, e.g. `Dictionary<T>`), not a
     * pool of whole arrays -- there's no separate option for that.
     */
    generate(options?: LengthConstraints & ElementOptions<T>): T[];
  }
}

ensureGenerateCapability();

// guardis' primitive singletons (and their .optional/.notEmpty variants)
// already exist by the time this module runs (they're built at
// @spudlabs/guardis's own module-load time, which always happens before
// this side-effect entry point is imported) — the construction hook above
// never touch them, so they need the same treatment applied directly.
attachToVariants(isString);
attachToVariants(isNumber);
attachToVariants(isBoolean);
attachToVariants(isDate);
attachToVariants(isArray);

// --- base primitive specs ---------------------------------------------------

registerGen(isString, { kind: "string", constraints: {} });
registerGen(isNumber, { kind: "number", constraints: {} });
registerGen(isBoolean, { kind: "boolean" });
registerGen(isDate, { kind: "date", constraints: {} });
registerGen(isArray, { kind: "array", constraints: {} });

// --- .notEmpty min:1 ---------------------------------------------------
//
// core's `.notEmpty` rejects an empty value at VALIDATION time, but nothing
// taught GENERATION that: isArray's default min is 0, so `isArray.notEmpty`
// generated an empty array (and then failed its own guard) a meaningful
// fraction of the time -- a satisfiable schema failing at random, not a
// contradiction. Registered directly on each singleton's `.notEmpty`
// (`.notEmpty`'s own type is an anonymous inline shape in core, not the
// named TypeGuard<T> these overloads target, hence the cast) rather than
// derived from the base spec, so `min: 1` holds regardless of chaining.
// isString's default min already happens to be 3, so this was passing by
// accident there -- made explicit for the same reason.
registerGen(isString.notEmpty as unknown as TypeGuard<unknown>, {
  kind: "string",
  constraints: { min: 1 },
});
registerGen(isArray.notEmpty as unknown as TypeGuard<unknown>, {
  kind: "array",
  constraints: { min: 1 },
});

// --- chain-method monkeypatching --------------------------------------------

function mergeConstraint(
  parent: TypeGuard<unknown>,
  kind: "string" | "array",
  patch: LengthConstraints,
): Spec;
function mergeConstraint(
  parent: TypeGuard<unknown>,
  kind: "number",
  patch: NumberConstraints,
): Spec;
function mergeConstraint(parent: TypeGuard<unknown>, kind: "date", patch: DateConstraints): Spec;
// `patch` is snapshotted, not late-bound: `.min(3)` means "at least 3" as of
// the call, and a later registration on `parent` must not rewrite it. Only
// composed child positions use `SpecSource`.
function mergeConstraint(
  parent: TypeGuard<unknown>,
  kind: "string" | "number" | "date" | "array",
  patch: LengthConstraints | NumberConstraints | DateConstraints,
): Spec {
  const parentSpec = resolveSpec(parent);
  const existing = parentSpec && "constraints" in parentSpec ? parentSpec.constraints : undefined;
  // The overloads above pair each `kind` with its matching constraint shape;
  // this implementation signature just merges whichever shape it's handed,
  // so the cast reflects a pairing already enforced at every call site.
  const merged = { kind, constraints: { ...existing, ...patch } } as Spec;
  // Chaining off an isArray.of(elementGuard) result (e.g. .of(isNumber).min(2))
  // must not silently drop back to the default element spec -- carry the
  // parent's `element` forward the same way `constraints` already is. A
  // reference copy, not a deref -- late binding on the element guard survives
  // the chain.
  if (kind === "array" && parentSpec && "element" in parentSpec) {
    (merged as { element?: SpecSource }).element = parentSpec.element;
  }
  return merged;
}

const buildStringSpec = (parent: TypeGuard<unknown>, patch: LengthConstraints): Spec =>
  mergeConstraint(parent, "string", patch);
const buildArraySpec = (parent: TypeGuard<unknown>, patch: LengthConstraints): Spec =>
  mergeConstraint(parent, "array", patch);

/** The chain-method shape isNumber exposes: gt/gte/lt/lte. */
type NumberChainable = TypeGuard<unknown> & {
  gt: (n: number) => TypeGuard<unknown>;
  gte: (n: number) => TypeGuard<unknown>;
  lt: (n: number) => TypeGuard<unknown>;
  lte: (n: number) => TypeGuard<unknown>;
};

/** isNumber's gt/gte/lt/lte/finite chain. */
function patchNumberMethods(guard: NumberChainable): void {
  const originalGt = guard.gt;
  const originalGte = guard.gte;
  const originalLt = guard.lt;
  const originalLte = guard.lte;

  guard.gt = (n: number) => {
    const child = originalGt(n);
    registerGen(child, mergeConstraint(guard, "number", { min: n }));
    patchNumberMethods(child as typeof guard);
    return child;
  };
  guard.gte = (n: number) => {
    const child = originalGte(n);
    registerGen(child, mergeConstraint(guard, "number", { min: n }));
    patchNumberMethods(child as typeof guard);
    return child;
  };
  guard.lt = (n: number) => {
    const child = originalLt(n);
    registerGen(child, mergeConstraint(guard, "number", { max: n }));
    patchNumberMethods(child as typeof guard);
    return child;
  };
  guard.lte = (n: number) => {
    const child = originalLte(n);
    registerGen(child, mergeConstraint(guard, "number", { max: n }));
    patchNumberMethods(child as typeof guard);
    return child;
  };
  // .finite is a getter (see primitives.ts withComparisons), not a plain
  // method -- it doesn't narrow generation constraints, so the child just
  // gets the default inherited spec via the parent-pointer walk. It still
  // needs re-patching so further chaining (.finite.gt(0)) stays constraint-aware.
  const descriptor = Object.getOwnPropertyDescriptor(guard, "finite");
  if (descriptor?.get) {
    const originalGetter = descriptor.get;
    Object.defineProperty(guard, "finite", {
      get() {
        const child = originalGetter.call(guard);
        patchNumberMethods(child as typeof guard);
        return child;
      },
      enumerable: true,
      configurable: true,
    });
  }
}

/** The chain-method shape isDate exposes: gt/gte/lt/lte. */
type DateChainable = TypeGuard<unknown> & {
  gt: (threshold: Date) => TypeGuard<unknown>;
  gte: (threshold: Date) => TypeGuard<unknown>;
  lt: (threshold: Date) => TypeGuard<unknown>;
  lte: (threshold: Date) => TypeGuard<unknown>;
};

/** isDate's gt/gte/lt/lte chain. */
function patchDateMethods(guard: DateChainable): void {
  const originalGt = guard.gt;
  const originalGte = guard.gte;
  const originalLt = guard.lt;
  const originalLte = guard.lte;

  guard.gt = (threshold: Date) => {
    const child = originalGt(threshold);
    registerGen(child, mergeConstraint(guard, "date", { gte: threshold }));
    patchDateMethods(child as typeof guard);
    return child;
  };
  guard.gte = (threshold: Date) => {
    const child = originalGte(threshold);
    registerGen(child, mergeConstraint(guard, "date", { gte: threshold }));
    patchDateMethods(child as typeof guard);
    return child;
  };
  guard.lt = (threshold: Date) => {
    const child = originalLt(threshold);
    registerGen(child, mergeConstraint(guard, "date", { lte: threshold }));
    patchDateMethods(child as typeof guard);
    return child;
  };
  guard.lte = (threshold: Date) => {
    const child = originalLte(threshold);
    registerGen(child, mergeConstraint(guard, "date", { lte: threshold }));
    patchDateMethods(child as typeof guard);
    return child;
  };
}

patchNumberMethods(isNumber as unknown as NumberChainable);
patchDateMethods(isDate as unknown as DateChainable);

// --- .of() monkeypatching ----------------------------------------------------
//
// Mirrors modules/collections.ts's isMap.of()/isSet.of() patches, carrying
// forward whatever length constraint `guard` already has so generated
// values don't violate it.

function patchArrayOf(guard: ChainMethodGuard): void {
  const typed = guard as unknown as { of: typeof isArray.of };
  const originalOf = typed.of;
  typed.of = ((elementGuard: TypeGuard<unknown>) => {
    const child = originalOf(elementGuard);
    const parentSpec = resolveSpec(guard);
    registerGen(child, {
      kind: "array",
      element: specRef(elementGuard),
      constraints: parentSpec?.kind === "array" ? parentSpec.constraints ?? {} : {},
    });
    patchChainMethods(child as unknown as ChainMethodGuard, "ofLength", buildArraySpec);
    return child;
  }) as typeof isArray.of;
}

patchChainMethods(isString as unknown as ChainMethodGuard, "ofLength", buildStringSpec);
patchArrayOf(isArray as unknown as ChainMethodGuard);
patchChainMethods(isArray as unknown as ChainMethodGuard, "ofLength", buildArraySpec, patchArrayOf);

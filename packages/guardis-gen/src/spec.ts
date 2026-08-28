/**
 * spec.ts - The data-generation descriptor model. This is the ONLY place in
 * the entire plugin that defines what a generation "spec" looks like —
 * guardis core has no knowledge of any of this.
 * @module
 */
import {
  type Brand,
  guardParent,
  type OptionalTypeGuard,
  pluginBag,
  type TypeGuard,
} from "@spudlabs/guardis";

/** Registry of per-brand `generate()` options shapes, extended via `declare module` (e.g. `modules/strings.ts` for `InternationalPhone`). */
// deno-lint-ignore no-empty-interface
export interface GeneratorOptionsRegistry {}

/** Per-property derive functions for an object-shaped `T1` -- one optional function per key, reading the other generated properties. */
type RelationalOptions<T1> = T1 extends Record<string, unknown>
  ? { [K in keyof T1]?: (props: T1) => T1[K] }
  : never;

/**
 * Options type for `TypeGuard<T1>.generate()`: a registered brand's shape,
 * `LengthConstraints` for a Map/Set (covers `.of()` results too, since
 * they're still `TypeGuard<Map<K, V>>`/`TypeGuard<Set<T>>`, not a distinct
 * nominal type), `{ props?: RelationalOptions<T1> }` for a plain object
 * shape, or `never` otherwise -- `never`, not `unknown`, so this doesn't
 * swallow a sibling chain-interface overload (`StringTypeGuard.generate`
 * etc.) it's intersected with.
 */
export type GenerateOptionsFor<T1> = T1 extends Brand<unknown, infer B>
  ? (B extends keyof GeneratorOptionsRegistry ? GeneratorOptionsRegistry[B] : never)
  : T1 extends Map<unknown, unknown> ? LengthConstraints
  : T1 extends Set<unknown> ? LengthConstraints
  : T1 extends Record<string, unknown> ? { props?: RelationalOptions<T1> }
  : never;

/**
 * Length bounds shared by string and array specs. `ofLength` is a shorthand
 * for an exact length (equivalent to `min`/`max` both set to the same
 * value) -- mirrors the guard's own `.ofLength()` chain method, and lets a
 * call-time override ask for an exact length without repeating the number.
 */
export type LengthConstraints = { min?: number; max?: number; ofLength?: number };

/** Numeric bounds for number specs, plus whether the value must be an integer. */
export type NumberConstraints = { min?: number; max?: number; int?: boolean };

/** Inclusive date bounds for date specs. */
export type DateConstraints = { gte?: Date; lte?: Date };

/**
 * The closed set of structural specs, one per guardis primitive -- each
 * kind gets its own constraint shape rather than one shared untyped bag, so
 * e.g. `{ int: true }` can't attach to a string spec unnoticed. `array`'s
 * `element` mirrors `MapSpec`/`SetSpec`'s key/value/element: absent for
 * bare `isArray`, present for `isArray.of(elementGuard)`.
 */
export type PrimitiveSpec =
  | { kind: "string"; constraints?: LengthConstraints }
  | { kind: "number"; constraints?: NumberConstraints }
  | { kind: "boolean" }
  | { kind: "date"; constraints?: DateConstraints }
  | { kind: "array"; element?: Spec; constraints?: LengthConstraints };

/** Shared fallback element spec for array/map/set guards with no resolvable element type. */
export const DEFAULT_ELEMENT_SPEC: Spec = { kind: "string", constraints: {} };

/**
 * One nested spec per field, plus (optionally) the guard that validates the
 * assembled object as a whole -- lets a relational derive function's output
 * be validated without a separate per-field guard map. `guard` is optional
 * so a hand-built spec via the `registerGen` escape hatch still type-checks
 * with no guard to offer; validation is just skipped then.
 */
export type ObjectSpec = {
  kind: "object";
  fields: Record<string, Spec>;
  guard?: TypeGuard<unknown>;
};

/** One spec for the keys, one for the values -- mirrors `isMap.of(keyGuard, valueGuard)`. */
export type MapSpec = { kind: "map"; key: Spec; value: Spec; constraints?: LengthConstraints };

/** One spec shared by every generated element, mirroring `isSet.of(elementGuard)`. */
export type SetSpec = { kind: "set"; element: Spec; constraints?: LengthConstraints };

/** One spec per position, in order -- unlike `array`, length and per-position types are fixed. */
export type TupleSpec = { kind: "tuple"; elements: Spec[] };

/** Wraps another spec to mark it as optional; generation just defers to `inner`. */
export type OptionalSpec = { kind: "optional"; inner: Spec };

/**
 * `a.or(b, c, ...)`'s branches, one entry per argument plus `a` itself --
 * generation picks one branch at random each call. Built automatically by
 * every guard's `.or()` -- see `or.ts`.
 */
export type UnionSpec = { kind: "union"; branches: Spec[] };

/**
 * A generator function bound directly to a guard (email, UUID, or any
 * custom guard -- see `defineGenerator()`/`registerGen()`). Dispatch is by
 * presence of `generate`, not `kind` -- `kind` is just a descriptive label,
 * not a fixed enum. `options` is untyped: real type safety comes from
 * `GenerateOptionsFor<T1>` on `TypeGuard<T1>.generate`, not from `Spec`.
 */
export type CustomSpec = {
  kind: string;
  generate: (options?: unknown) => unknown;
};

/** A generation descriptor for a single guard. */
export type Spec =
  | PrimitiveSpec
  | ObjectSpec
  | MapSpec
  | SetSpec
  | TupleSpec
  | OptionalSpec
  | UnionSpec
  | CustomSpec;

/**
 * `G` with `defineGenerator` removed, so chaining a second call is a
 * compile error -- type-level only, a cast can still call it again (it
 * just re-registers). `Omit` alone would also strip the call signature, so
 * it's re-added via intersection with `R`, `G`'s own predicate return type.
 */
type WithoutDefineGenerator<G, R> = Omit<G, "defineGenerator"> & ((v: unknown) => v is R);

declare module "@spudlabs/guardis" {
  interface GuardisPlugins<T> {
    gen?: Spec;
    /** Default `.generate()` options, registered via `.defineGenerator(defaults)`. Untyped for the same reason `CustomSpec.generate`'s `options` is. */
    genDefaults?: unknown;
  }
  interface TypeGuard<T1> {
    /**
     * Produces a sample value satisfying this guard. Requires importing a
     * "@spudlabs/guardis-gen/modules/*" entry point first -- see mod.ts.
     * `options` resolves via `GenerateOptionsFor<T1>`; a guard whose kind
     * supports call-time constraints gets a matching overload merged in via
     * its own chain-method interface instead (see modules/primitives.ts).
     * Falls back to `.defineGenerator()`-registered defaults when omitted.
     */
    generate(options?: GenerateOptionsFor<T1>): T1;
    /** Binds a generator directly to this guard, validated on every `.generate()` call. */
    defineGenerator<O = unknown>(
      generator: (options?: O) => T1,
    ): WithoutDefineGenerator<TypeGuard<T1>, T1>;
    /**
     * Registers `defaults` as this guard's default `.generate()` options --
     * a call passing its own options merges over them, not a full replace.
     *
     * `T1_` (defaulting to `T1`) instead of `GenerateOptionsFor<T1>`
     * directly is load-bearing: written directly, it breaks `TypeGuard<T>
     * extends TypeGuard<unknown>` checks program-wide (`resolveSpec`,
     * `CanBeEmpty`, `isExactly`). Don't remove it without re-verifying those.
     */
    defineGenerator<T1_ = T1>(
      defaults: GenerateOptionsFor<T1_>,
    ): WithoutDefineGenerator<TypeGuard<T1>, T1>;
  }
  /** `OptionalTypeGuard<T1>` is standalone, not `TypeGuard<T1 | undefined>`, so the augmentation above doesn't reach it -- mirrored here, same `T1_` workaround, same reason. */
  interface OptionalTypeGuard<T1> {
    generate(options?: GenerateOptionsFor<T1>): T1 | undefined;
    defineGenerator<O = unknown>(
      generator: (options?: O) => T1 | undefined,
    ): WithoutDefineGenerator<OptionalTypeGuard<T1>, T1 | undefined>;
    defineGenerator<T1_ = T1>(
      defaults: GenerateOptionsFor<T1_>,
    ): WithoutDefineGenerator<OptionalTypeGuard<T1>, T1 | undefined>;
  }
}

/**
 * Resolves the effective spec for a guard: its own spec if it has one,
 * otherwise the nearest ancestor's via the parent-pointer chain -- an own
 * spec always wins outright, skipping the wrap below entirely. Wraps the
 * result in `{ kind: "optional", inner: ... }` if `guard` is itself
 * `.optional`-derived (`_.optional`). Returns undefined if neither the
 * guard nor any ancestor has a spec registered.
 *
 * Takes `OptionalTypeGuard<unknown>` too, not just `TypeGuard<unknown>` --
 * it's a standalone, non-augmentable interface (see the `declare module`
 * doc above), so `guard.optional` itself needs this to type-check.
 */
export function resolveSpec(
  guard: TypeGuard<unknown> | OptionalTypeGuard<unknown> | undefined,
): Spec | undefined {
  if (!guard) return undefined;
  const own = pluginBag(guard).gen;
  if (own) return own;
  const inner = resolveSpec(guardParent(guard));
  return guard._.optional && inner ? { kind: "optional", inner } : inner;
}

/**
 * Registers a spec directly on a guard, overriding whatever it would
 * otherwise inherit via the parent chain. Use this for guards built from
 * fully custom parsers that can't be reverse-engineered structurally.
 *
 * @example
 * ```typescript
 * const isZipCode = createTypeGuard("zip", (v) =>
 *   typeof v === "string" && /^\d{5}$/.test(v) ? v : null
 * );
 * registerGen(isZipCode, { kind: "string", constraints: { min: 5, max: 5 } });
 * ```
 *
 * Accepts `OptionalTypeGuard<T>` too -- see `resolveSpec`'s doc for why.
 */
export function registerGen<T>(guard: TypeGuard<T> | OptionalTypeGuard<T>, spec: Spec): void {
  pluginBag(guard).gen = spec;
}

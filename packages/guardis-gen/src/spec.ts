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

/**
 * The objects enclosing the value being generated -- a derive function's
 * second argument. `parent` is a live proxy, so reading a field off it
 * generates that field on demand, whatever order fields were declared in.
 * A collection is a position, not a level: an array element's `parent` is
 * the object that owns the array.
 */
export type GenContext<P = Record<string, unknown> | undefined> = {
  /** The enclosing object's props proxy; `undefined` at the root. */
  readonly parent: P;
  /** Every enclosing object's proxy, root first -- `parent === ancestors.at(-1)`. */
  readonly ancestors: readonly Record<string, unknown>[];
  /**
   * `ancestors`, unwrapped to the plain object each proxy wraps -- safe to
   * embed in a returned/derived value, unlike `ancestors` itself. Same
   * order and length as `ancestors`.
   */
  readonly ancestorValues: readonly Record<string, unknown>[];
  /** `ancestors[0]` -- the outermost object; `undefined` at the root. */
  readonly root?: Record<string, unknown>;
  /**
   * Position within the nearest enclosing array/set/map/tuple, if any.
   * Inherited by an element's own nested fields, so a field three levels
   * inside `members[2]` still sees `index === 2`.
   */
  readonly index?: number;
  /** Key/index path from the root to the value being generated. */
  readonly path: readonly (string | number)[];
};

/**
 * Per-property options: a derive function, or a nested options bag forwarded
 * to that field. A deriver's `ctx` belongs to the object it sits in, not to
 * its own field, so `ctx.parent` is the level above; `Parent` threads down as
 * `T1` to type it without a cast.
 */
type RelationalOptions<T1, Parent = Record<string, unknown> | undefined> = T1 extends
  Record<string, unknown> ? {
    [K in keyof T1]?:
      | ((props: T1, ctx: GenContext<Parent>) => T1[K])
      | NestedOptionsFor<T1[K], T1>;
  }
  : never;

/** `X & never` is `never`, which would annihilate a collection's size constraints. */
type OrEmpty<T> = [T] extends [never] ? unknown : T;

/**
 * A collection element's options, safe to intersect onto `LengthConstraints`
 * in a `generate()` overload -- `unknown` rather than `never` when the
 * element type has no options of its own, so it never annihilates the size
 * constraints it sits beside. See `NestedOptionsFor`.
 */
export type ElementOptions<T> = OrEmpty<NestedOptionsFor<T>>;

export type NestedOptionsFor<T, Parent = Record<string, unknown> | undefined> = T extends
  Brand<unknown, string> ? GenerateOptionsFor<T>
  : T extends string ? LengthConstraints
  : T extends number ? NumberConstraints
  : T extends boolean ? never
  : T extends Date ? DateConstraints
  : T extends readonly unknown[] ? LengthConstraints & OrEmpty<NestedOptionsFor<T[number], Parent>>
  : T extends Map<infer K, infer V> ?
      & LengthConstraints
      & OrEmpty<NestedOptionsFor<K, Parent>>
      & OrEmpty<NestedOptionsFor<V, Parent>>
  : T extends Set<infer E> ? LengthConstraints & OrEmpty<NestedOptionsFor<E, Parent>>
  : T extends Record<string, unknown> ? { props?: RelationalOptions<T, Parent> }
  : never;

/**
 * Options for `TypeGuard<T1>.generate()`. The fallback is `never`, not
 * `unknown`, so it doesn't swallow the chain-interface overloads it is
 * intersected with; arrays stay on that branch for the same reason, since
 * modules/primitives.ts declares their overloads.
 */
export type GenerateOptionsFor<T1> = T1 extends Brand<unknown, infer B>
  ? (B extends keyof GeneratorOptionsRegistry ? GeneratorOptionsRegistry[B] : never)
  : T1 extends Map<infer K, infer V>
    ? LengthConstraints & OrEmpty<NestedOptionsFor<K>> & OrEmpty<NestedOptionsFor<V>>
  : T1 extends Set<infer E> ? LengthConstraints & OrEmpty<NestedOptionsFor<E>>
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
  | { kind: "array"; element?: SpecSource; constraints?: LengthConstraints };

/** Shared fallback element spec for array/map/set guards with no resolvable element type. */
export const DEFAULT_ELEMENT_SPEC: Spec = { kind: "string", constraints: {} };

/**
 * A Spec that throws rather than fabricating a value, for a position naming a
 * guard that has no generator. `context` describes the position ("array
 * element", ".or() branch"). See `DEFAULT_ELEMENT_SPEC` for the other case,
 * where no element type was given at all.
 *
 * `guard` may be a bare `(v) => v is T` predicate (a legal `.or()` branch,
 * routed here from `or.ts`) rather than a constructed guard -- it has no
 * plugin bag, so neither `.defineGenerator()` nor `registerGen()` is an
 * option for it, and the advice below says so instead of naming dead ends.
 */
export function unresolvedSpec(context: string, guard?: unknown): Spec {
  const asGuard = guard as { _?: { name?: string } } | undefined;
  const asFn = guard as { name?: string } | undefined;
  const label = asGuard?._?.name || asFn?.name || "this guard";
  const hasPluginBag = typeof guard === "function" &&
    !!pluginBag(guard as TypeGuard<unknown>);
  const advice = hasPluginBag
    ? "register one with .defineGenerator() or registerGen() before calling .generate()"
    : "it's a bare predicate with no plugin data to register a generator on -- give this position a constructed guard instead";
  return {
    kind: "custom",
    generate: () => {
      throw new Error(`${context} has no registered generator for "${label}" -- ${advice}.`);
    },
  };
}

/**
 * One nested spec per field, plus (optionally) the guard that validates the
 * assembled object as a whole -- lets a relational derive function's output
 * be validated without a separate per-field guard map. `guard` is optional
 * so a hand-built spec via the `registerGen` escape hatch still type-checks
 * with no guard to offer; validation is just skipped then.
 */
export type ObjectSpec = {
  kind: "object";
  fields: Record<string, SpecSource>;
  guard?: TypeGuard<unknown>;
};

/** One spec for the keys, one for the values -- mirrors `isMap.of(keyGuard, valueGuard)`. */
export type MapSpec = {
  kind: "map";
  key: SpecSource;
  value: SpecSource;
  constraints?: LengthConstraints;
};

/** One spec shared by every generated element, mirroring `isSet.of(elementGuard)`. */
export type SetSpec = { kind: "set"; element: SpecSource; constraints?: LengthConstraints };

/** One spec per position, in order -- unlike `array`, length and per-position types are fixed. */
export type TupleSpec = { kind: "tuple"; elements: SpecSource[] };

/** Wraps another spec to mark it as optional; generation just defers to `inner`. */
export type OptionalSpec = { kind: "optional"; inner: Spec };

/**
 * `a.or(b, c, ...)`'s branches, one entry per argument plus `a` itself --
 * generation picks one branch at random each call. Built automatically by
 * every guard's `.or()` -- see `or.ts`.
 */
export type UnionSpec = { kind: "union"; branches: SpecSource[] };

/**
 * A generator bound directly to a guard. `interpret` dispatches on
 * `"generate" in spec` before the switch, so `kind` exists only to keep
 * `Spec` a discriminated union. Type safety comes from
 * `GenerateOptionsFor<T1>`, not from here.
 */
export type CustomSpec = {
  kind: "custom";
  generate: (options?: unknown, ctx?: GenContext) => unknown;
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

/** Anything `resolveSpec` can be handed -- a guard or its `.optional` derivative. */
export type GuardLike = TypeGuard<unknown> | OptionalTypeGuard<unknown>;

/**
 * A child position in a composed spec. `{ ref }` resolves at generation time,
 * so a generator registered after composition is still honored; `{ spec }` is
 * for positions with no guard to point at. Not `Spec | { ref }` — spelling
 * snapshots explicitly keeps them greppable.
 */
export type SpecSource = { readonly ref: GuardLike } | { readonly spec: Spec };

export const specRef = (guard: GuardLike): SpecSource => ({ ref: guard });
export const fixedSpec = (spec: Spec): SpecSource => ({ spec });

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
    /**
     * Default `.generate()` options from `.defineGenerator(defaults)`. Read
     * only by `attachGenerate` in shared.ts, at the outermost call — these
     * apply where registered, never to a nested position. (The `fn` overload
     * registers a `CustomSpec` instead, and does compose.)
     */
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
    /**
     * Binds a generator directly to this guard, validated on every
     * `.generate()` call. `ctx` is where the value sits in the tree being
     * generated -- `undefined` at the root, populated when this guard is a
     * field or element of a larger one.
     */
    defineGenerator<O = unknown>(
      generator: (options?: O, ctx?: GenContext) => T1,
    ): WithoutDefineGenerator<TypeGuard<T1>, T1>;
    /**
     * Default `.generate()` options; a call's own options merge over them.
     * `T1_` rather than `GenerateOptionsFor<T1>` directly: written directly it
     * breaks `TypeGuard<T> extends TypeGuard<unknown>` program-wide.
     */
    defineGenerator<T1_ = T1>(
      defaults: GenerateOptionsFor<T1_>,
    ): WithoutDefineGenerator<TypeGuard<T1>, T1>;
  }
  /** `OptionalTypeGuard<T1>` is standalone, not `TypeGuard<T1 | undefined>`, so the augmentation above doesn't reach it -- mirrored here, same `T1_` workaround, same reason. */
  interface OptionalTypeGuard<T1> {
    generate(options?: GenerateOptionsFor<T1>): T1 | undefined;
    defineGenerator<O = unknown>(
      generator: (options?: O, ctx?: GenContext) => T1 | undefined,
    ): WithoutDefineGenerator<OptionalTypeGuard<T1>, T1 | undefined>;
    defineGenerator<T1_ = T1>(
      defaults: GenerateOptionsFor<T1_>,
    ): WithoutDefineGenerator<OptionalTypeGuard<T1>, T1 | undefined>;
  }
}

/**
 * A guard's own spec, else the nearest ancestor's via the parent chain,
 * wrapped in `{ kind: "optional" }` if the guard is `.optional`-derived.
 * Undefined when nothing up the chain has one, including for a bare
 * predicate with no plugin bag.
 *
 * Exported so a self-referential schema's placeholder guard can be wired up
 * after the fact: `registerGen(placeholder, resolveSpec(real)!)` copies the
 * real guard's spec onto it (see self-guard-violations.test.ts's recursive
 * schema test).
 */
export function resolveSpec(guard: GuardLike | undefined): Spec | undefined {
  if (!guard) return undefined;
  // A bare `(v) => v is T` predicate is a legal shape field (core compiles it
  // as kind: "typePredicate") and a legal .or() branch, but has no plugin bag
  // to read `.gen` off -- guarded here rather than at each call site, since
  // callers should see a clean `undefined`, not a crash on `undefined.gen`.
  const bag = pluginBag(guard);
  if (!bag) return undefined;
  if (bag.gen) return bag.gen;
  const inner = resolveSpec(guardParent(guard));
  return guard._?.optional && inner ? { kind: "optional", inner } : inner;
}

/**
 * Resolves one child position, at generation time -- this is what makes
 * composition late-bound. Shallow: the result's own children stay
 * `SpecSource`s until generation descends into them, so a self-referential
 * spec hits interpret's depth cap rather than recursing here.
 */
export function deref(source: SpecSource | undefined): Spec | undefined {
  if (!source) return undefined;
  return "ref" in source ? resolveSpec(source.ref) : source.spec;
}

/**
 * Registers a spec directly on a guard, overriding what it would inherit via
 * the parent chain. For guards built from custom parsers that can't be
 * reverse-engineered structurally.
 *
 * Takes a leaf spec, or a whole spec copied from another guard via
 * `resolveSpec` (how a self-referential schema wires up its placeholder).
 * Composite specs aren't hand-authored — build those with a shape object,
 * `.of()`, `.or()`, or `gen.tuple()`.
 *
 * @example
 * ```typescript
 * const isZipCode = createTypeGuard("zip", (v) =>
 *   typeof v === "string" && /^\d{5}$/.test(v) ? v : null
 * );
 * registerGen(isZipCode, { kind: "string", constraints: { min: 5, max: 5 } });
 * ```
 */
export function registerGen<T>(guard: TypeGuard<T> | OptionalTypeGuard<T>, spec: Spec): void {
  pluginBag(guard).gen = spec;
}

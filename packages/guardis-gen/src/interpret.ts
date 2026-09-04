/**
 * interpret.ts - Turns a resolved Spec into sample data. A spec carrying
 * `generate` dispatches to it; everything else falls to the structural set.
 *
 * Within an object, every field is a thunk resolved through a memoizing
 * proxy, so a field can be pulled forward by whatever depends on it -- that
 * is what lets values relate across nesting levels. One cycle stack is
 * shared down the tree, so a loop closing across levels is still caught.
 * Fields force in declaration order, then derivers, which keeps the PRNG
 * draw sequence stable (see seed.test.ts).
 * @module
 */
import {
  type DateConstraints,
  DEFAULT_ELEMENT_SPEC,
  deref,
  type GenContext,
  type LengthConstraints,
  type NumberConstraints,
  type Spec,
  type SpecSource,
  unresolvedSpec,
} from "./spec.ts";
import type { Dictionary } from "./dictionary.ts";
import { extractDictionary, extractProps, mergeOptions, residual } from "./options.ts";
import { lazyRecord, type ResolvingEntry } from "./utilities/lazy-record.ts";
import { randomDate, randomLength, randomNumber, randomString } from "./utilities/random.ts";
import { pick, randomBoolean } from "./utilities/rng.ts";
import { safeStringify } from "./utilities/safe-stringify.ts";

/**
 * `GenContext` plus the cycle-detection stack, one array shared by reference
 * down the tree so a cycle closing across levels is caught. Created at the
 * root. `visitedSpecs` is the descent path's spec identities, growing one
 * entry per `interpret` call -- see `recursionAwareSpread`.
 *
 * Don't cache spec resolution beyond a single `generate()` call: `registerGen`
 * is a plain property write this context can't observe, so anything
 * longer-lived would go stale.
 */
type ActiveContext = GenContext & {
  readonly resolving: ResolvingEntry[];
  readonly depth: number;
  readonly visitedSpecs: readonly Spec[];
};

/** Materializes the root context, or adopts one already carrying a stack. */
function activeContext(ctx: GenContext | undefined): ActiveContext {
  if (!ctx) {
    return {
      parent: undefined,
      ancestors: [],
      ancestorValues: [],
      path: [],
      resolving: [],
      depth: 0,
      visitedSpecs: [],
    };
  }
  return "resolving" in ctx
    ? ctx as ActiveContext
    : { ...ctx, resolving: [], depth: 0, visitedSpecs: [] };
}

/**
 * The context for the i-th element of an enclosing array/set/map/tuple. A
 * collection introduces a POSITION, not an object level, so `parent`,
 * `root` and `ancestors` pass straight through -- which is exactly what
 * lets `members[i].email` read the `company` sibling of `members`.
 */
function elementContext(ctx: ActiveContext, index: number): ActiveContext {
  return { ...ctx, index, path: [...ctx.path, index], depth: ctx.depth + 1 };
}

/**
 * Bumps the recursion-depth counter without touching `path`, for `optional`
 * and `union` (which otherwise forward `ctx` unchanged) -- `path` alone never
 * grows across a union/optional-only cycle, so MAX_GENERATION_DEPTH needs
 * `depth` to count those recursions too.
 */
function deeper(ctx: ActiveContext): ActiveContext {
  return { ...ctx, depth: ctx.depth + 1 };
}

/**
 * Joins path segments for DISPLAY only -- `[i]` for a numeric segment,
 * `.key` otherwise. Ambiguous (a field literally named `x.y` reads the same
 * as nested field `y` under field `x`), so this must never be used as the
 * cycle-detection identity; see `pathKey`.
 */
function joinPath(path: readonly (string | number)[]): string {
  let out = "";
  for (const segment of path) {
    out += typeof segment === "number" ? `[${segment}]` : (out ? `.${segment}` : segment);
  }
  return out;
}

/** `members[1].email` -- cycle-error DISPLAY only. `pathLabel([], key)` is just `key`. */
function pathLabel(path: readonly (string | number)[], key: string): string {
  const joined = joinPath(path);
  return joined ? `${joined}.${key}` : key;
}

/** Collision-free identity for the cycle-detection stack -- unlike `pathLabel`'s joined string, JSON-encoding the raw segments can't collide across differently-shaped paths. */
function pathKey(path: readonly (string | number)[], key: string): string {
  return JSON.stringify([...path, key]);
}

/**
 * Maps each props proxy to the plain object it wraps, so a deriver returning
 * one (its own, or an ancestor's) embeds the object rather than a live view.
 */
const proxyTargets = new WeakMap<object, Record<string, unknown>>();

/** The plain object a known props proxy wraps, or undefined for anything else. */
function knownProxyTarget(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? proxyTargets.get(value) : undefined;
}

/** A `{}`/`Object.create(null)` object -- excludes Map/Set/Date/class instances. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Substitutes the plain object for any known props proxy, one level into an
 * array or plain object too (`[props]`, `{ snapshot: props }`). Deeper
 * nesting is out of scope -- use `ctx.ancestorValues` for that instead.
 */
function unwrapProps(value: unknown): unknown {
  const direct = knownProxyTarget(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    let changed = false;
    const mapped = value.map((item) => {
      const target = knownProxyTarget(item);
      if (target) changed = true;
      return target ?? item;
    });
    return changed ? mapped : value;
  }

  if (isPlainObject(value)) {
    let changed = false;
    const mapped: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const target = knownProxyTarget(item);
      if (target) changed = true;
      mapped[key] = target ?? item;
    }
    return changed ? mapped : value;
  }

  return value;
}

/**
 * Backstop for a self-referential spec with no collection in the cycle to
 * shrink — `recursionAwareSpread` handles the rest. Counted on
 * `ActiveContext.depth` rather than `path.length`, which doesn't grow across a
 * union/optional cycle.
 */
const MAX_GENERATION_DEPTH = 32;

/** How many times a collection's own spec can recur before its default spread starts shrinking. */
const SAFE_RECURSIONS = 1;
/** Default length spread for a collection at `SAFE_RECURSIONS` or below. */
const BASE_SPREAD = 3;

/**
 * Default length spread for a collection, shrinking with how many times its
 * OWN spec already appears on the current descent path -- not absolute
 * nesting depth, so an ordinary (non-recursive) schema generates populated
 * collections at every level, however deep, while a genuine cycle
 * (`recursionCount` growing each time the cycle closes) still shrinks toward
 * zero at `recursionCount` 4 and terminates. Only consulted when neither
 * `max` nor `ofLength` was given, so an explicit constraint always wins.
 */
function recursionAwareSpread(recursionCount: number): number {
  return Math.max(0, BASE_SPREAD - Math.max(0, recursionCount - SAFE_RECURSIONS));
}

/** Retry bound for Set/Map dedup: high enough for a satisfiable size, low enough that an impossible one fails fast. */
const DEDUP_RETRY_MULTIPLIER = 25;
const DEDUP_RETRY_FLOOR = 50;

/**
 * Fills a Set/Map toward `length` distinct entries, retrying on collision up
 * to `pinnedMin` -- the size the caller actually pinned down (`ofLength` or
 * `min`), not the heuristic target. Above `pinnedMin` it's best-effort: a
 * small domain that can't reach `length` is fine as long as it already hit
 * `pinnedMin`. `pinnedMin` undefined means nothing was pinned at all, so
 * undershooting `length` never retries or throws. `subject`/`unit` (e.g.
 * "Map"/"key") name the collection and its entries in the stuck-retry error.
 */
function fillDeduped(
  length: number,
  pinnedMin: number | undefined,
  currentSize: () => number,
  addOne: (attempt: number) => void,
  subject: string,
  unit: string,
): void {
  if (pinnedMin === undefined) {
    for (let i = 0; i < length; i++) addOne(i);
    return;
  }
  let i = 0;
  let attempts = 0;
  const maxAttempts = pinnedMin * DEDUP_RETRY_MULTIPLIER + DEDUP_RETRY_FLOOR;
  for (; currentSize() < pinnedMin; i++) {
    if (attempts++ >= maxAttempts) {
      throw new RangeError(
        `could not generate a ${subject} of size ${length}: stuck at ${currentSize()} distinct ` +
          `${unit}(s) after ${attempts} attempts -- the ${unit} guard's domain is likely too ` +
          `small to produce ${length} distinct ${unit}s. Widen it, or reduce the requested size.`,
      );
    }
    addOne(i);
  }
  for (; currentSize() < length && attempts < maxAttempts; i++, attempts++) {
    addOne(i);
  }
}

/** The size the caller actually pinned down (`ofLength` or `min`), or undefined if neither was given. */
function pinnedMinSize(constraints: LengthConstraints | undefined): number | undefined {
  return constraints?.ofLength ?? constraints?.min;
}

/**
 * Resolves a position that names a concrete guard, throwing rather than
 * fabricating a value when that guard has no generator.
 */
function requiredSpec(source: SpecSource, context: string): Spec {
  return deref(source) ?? unresolvedSpec(context, "ref" in source ? source.ref : undefined);
}

/**
 * Interprets a resolved Spec into sample data. `options` overrides the spec's
 * registered constraints for this call; registered defaults are already
 * merged in by `attachGenerate` before the outermost call. `ctx` is the
 * position in the value being built — omitted at the root, threaded down
 * from there, and what lets a derive function read outward.
 */
export function interpret(
  spec: Spec | undefined,
  options?: unknown,
  ctx?: GenContext,
): unknown {
  if (!spec) return undefined;

  const base = activeContext(ctx);
  if (base.depth > MAX_GENERATION_DEPTH) {
    throw new RangeError(
      `generation exceeded max depth (${MAX_GENERATION_DEPTH}) at ${
        joinPath(base.path) || "(root)"
      }: this spec is self-referential with no array/map/set in the cycle, so nothing shrinks ` +
        `it toward a base case -- put a collection in the cycle, or give the recursive field a ` +
        `non-recursive branch.`,
    );
  }

  // An explicit dictionary always wins, even over a registered
  // `defineGenerator(fn)` and (for an object-typed position) a sibling
  // `props` -- same "call-time option overrides everything" rule every
  // other option already follows. A picked value is never re-validated
  // against the guard's own refinements (`.gt()`, `.min()`, a custom
  // predicate) the way a normally-generated value isn't either -- only the
  // TYPE match is enforced, at compile time (see README). Checked before the `generate`
  // dispatch below so it applies uniformly to every non-collection,
  // non-optional spec kind, including ones with no registered generator at
  // all. A `.of()` array/map/set/tuple's own `dictionary` option is its
  // ELEMENT's, not a "canned whole collection" -- there's no typed option
  // for the latter (see spec.ts's DictionaryOption usage) -- so it's left
  // for `residual()` to forward down to each element's own `interpret()`
  // call instead. A BARE array (`spec.element` unset, no `.of()`) is the
  // one array case that DOES have a typed whole-value option
  // (`DictionaryOption<unknown[]>` in modules/primitives.ts), so it short-
  // circuits here like any scalar. `optional` also isn't short-circuited
  // here -- its own `randomBoolean()` coin flip has to run first, so the
  // dictionary is forwarded, unconsumed, to the `case "optional"` branch
  // below, which re-enters `interpret()` on the inner spec (hitting this
  // same check again) only when the flip lands on "present".
  const dictionary = extractDictionary(options) as Dictionary<unknown> | undefined;
  const isElementDictionary = spec.kind === "map" || spec.kind === "set" ||
    spec.kind === "tuple" || (spec.kind === "array" && spec.element !== undefined);
  if (dictionary !== undefined && !isElementDictionary && spec.kind !== "optional") {
    return dictionary.pick();
  }

  if ("generate" in spec) return spec.generate(options, ctx);

  // How many times THIS spec object already sits on the current descent path
  // -- 0 for anything not part of a cycle, regardless of how deeply nested,
  // since a non-recursive schema never revisits the same spec reference. Only
  // array/map/set consult it (see `recursionAwareSpread`); computed once here
  // since every kind pushes itself onto the path children see.
  const recursionCount = base.visitedSpecs.filter((s) => s === spec).length;
  const descended: ActiveContext = { ...base, visitedSpecs: [...base.visitedSpecs, spec] };

  switch (spec.kind) {
    case "string":
      return randomString(mergeOptions(spec.constraints, options) as LengthConstraints | undefined);
    case "number":
      return randomNumber(mergeOptions(spec.constraints, options) as NumberConstraints | undefined);
    case "boolean":
      return randomBoolean();
    case "date":
      return randomDate(mergeOptions(spec.constraints, options) as DateConstraints | undefined);
    case "array": {
      const length = randomLength(
        mergeOptions(spec.constraints, options) as LengthConstraints | undefined,
        0,
        (min) => min + recursionAwareSpread(recursionCount),
        "array length",
      );
      // A bare `isArray` (no `.of()`) names no element guard -- the one
      // legitimate use of DEFAULT_ELEMENT_SPEC.
      const elementSpec = spec.element
        ? requiredSpec(spec.element, "array element")
        : DEFAULT_ELEMENT_SPEC;
      const elementOptions = residual(options);
      return Array.from(
        { length },
        (_, i) => interpret(elementSpec, elementOptions, elementContext(descended, i)),
      );
    }
    case "optional":
      return randomBoolean() ? undefined : interpret(spec.inner, options, deeper(descended));
    case "union": {
      // Pick first, then deref -- exactly one PRNG draw either way.
      const branch = requiredSpec(pick(spec.branches), ".or() branch");
      return interpret(branch, options, deeper(descended));
    }
    case "object": {
      const propOptions = extractProps(options);
      const structural: string[] = [];
      const derived: string[] = [];
      // Fields dropped because their guard has no resolvable spec and no
      // deriver filled them -- tracked only so the self-guard failure
      // message below can name them, if the omission turns out to matter.
      const missing: string[] = [];

      const record = lazyRecord({
        resolving: descended.resolving,
        identity: (key) => pathKey(descended.path, key),
        label: (key) => pathLabel(descended.path, key),
      });
      proxyTargets.set(record.props, record.result);
      const childAncestors: readonly Record<string, unknown>[] = [
        ...descended.ancestors,
        record.props,
      ];
      // Parallel to `childAncestors`, plain-object equivalents -- see
      // `GenContext.ancestorValues`. `record.result` IS the plain value
      // (`record.props` just views it), so no separate unwrap step is needed.
      const childAncestorValues: readonly Record<string, unknown>[] = [
        ...descended.ancestorValues,
        record.result,
      ];

      const fieldContext = (key: string): ActiveContext => ({
        parent: record.props,
        ancestors: childAncestors,
        ancestorValues: childAncestorValues,
        root: childAncestors[0],
        index: descended.index, // nearest enclosing collection position, inherited
        path: [...descended.path, key],
        resolving: descended.resolving,
        depth: descended.depth + 1,
        visitedSpecs: descended.visitedSpecs,
      });

      // EVERY field is a thunk, structural and derived alike, so any of them
      // can be pulled forward on demand by a descendant reaching up through
      // `ctx.parent` -- regardless of declaration order.
      for (const [key, source] of Object.entries(spec.fields)) {
        // Bracket access alone would resolve to an inherited Object.prototype
        // member (toString, constructor, ...) for a field named after one,
        // silently misreading it as a user-supplied deriver.
        const opt = Object.hasOwn(propOptions, key) ? propOptions[key] : undefined;
        if (typeof opt === "function") {
          const derive = opt as (props: unknown, ctx: GenContext) => unknown;
          // A deriver gets the context THIS object was called with, not a
          // per-field child one: `props` is already this object, so
          // `ctx.parent` is usefully the object one level up. Checked BEFORE
          // deref'ing the field's own spec, so a deriver fills a field whose
          // guard has no resolvable spec of its own.
          record.define(key, () => unwrapProps(derive(record.props, descended)));
          derived.push(key);
          continue;
        }
        // Resolved here, once per generate() -- NOT inside the thunk below --
        // so the structural/derived split, and therefore the PRNG draw
        // order, is fixed before any thunk runs.
        const propSpec = deref(source);
        if (!propSpec) {
          // The field is dropped by omitting its key -- unlike an array
          // element or .or() branch, there's no value that MUST be produced
          // here, so the object's own guard gets to decide whether the
          // omission is acceptable.
          missing.push(key);
          continue;
        }
        record.define(key, () => unwrapProps(interpret(propSpec, opt, fieldContext(key))));
        structural.push(key);
      }

      // Structural fields force in declaration order, then derivers, which
      // fixes the PRNG draw sequence (see seed.test.ts). Forcing through the
      // record rather than generating inline is what makes pull-forward
      // possible for anything that reaches across levels.
      for (const key of structural) record.force(key);
      for (const key of derived) record.force(key);

      if (spec.guard && !spec.guard(record.result)) {
        // Name what actually happened -- a missing field, an invalid
        // deriver output, or (rarely) both -- rather than always blaming a
        // deriver, which may not even be involved (see `missing`).
        const reasons: string[] = [];
        if (missing.length > 0) {
          reasons.push(
            `field${missing.length > 1 ? "s" : ""} ${
              missing.map((k) => `'${k}'`).join(", ")
            } could not be generated: no registered generator (register one with ` +
              `.defineGenerator()/registerGen()) and no props deriver was supplied for ${
                missing.length > 1 ? "them" : "it"
              }`,
          );
        }
        if (derived.length > 0) {
          reasons.push(
            `a relational derive function (${
              derived.map((k) => `'${k}'`).join(", ")
            }) may have produced an invalid value`,
          );
        }
        throw new TypeError(
          `the generated object fails its own guard: ${safeStringify(record.result)}. ${
            reasons.length > 0 ? reasons.join("; ") : "One of its fields has an invalid value"
          }.`,
        );
      }

      // The plain object, never the proxy -- and `unwrapProps` at each
      // `record.define` above keeps that true of every FIELD's value too, so
      // a deriver returning `props`/`ctx.parent`/`ctx.root` embeds the plain
      // object it wraps rather than a live view.
      return record.result;
    }
    case "map": {
      const mergedConstraints = mergeOptions(spec.constraints, options) as
        | LengthConstraints
        | undefined;
      const length = randomLength(
        mergedConstraints,
        0,
        (min) => min + recursionAwareSpread(recursionCount),
        "map size",
      );
      // One residual bag serves both key and value: a bag carrying `props`
      // means nothing to a string key spec and is ignored there, exactly as
      // any unrecognized option always has been.
      const entryOptions = residual(options);
      const result = new Map<unknown, unknown>();
      // Resolved once per generate(), not once per entry.
      const keySpec = requiredSpec(spec.key, "map key");
      const valueSpec = requiredSpec(spec.value, "map value");

      fillDeduped(
        length,
        pinnedMinSize(mergedConstraints),
        () => result.size,
        (i) => {
          const entry = elementContext(descended, i); // one context per ENTRY, shared by key and value
          const key = interpret(keySpec, entryOptions, entry);
          const value = interpret(valueSpec, entryOptions, entry);
          if (!result.has(key)) result.set(key, value);
        },
        "Map",
        "key",
      );

      return result;
    }
    case "set": {
      const mergedConstraints = mergeOptions(spec.constraints, options) as
        | LengthConstraints
        | undefined;
      const length = randomLength(
        mergedConstraints,
        0,
        (min) => min + recursionAwareSpread(recursionCount),
        "set size",
      );
      const elementOptions = residual(options);
      const result = new Set<unknown>();
      // Resolved once per generate(), not once per entry.
      const elementSpec = requiredSpec(spec.element, "set element");

      fillDeduped(
        length,
        pinnedMinSize(mergedConstraints),
        () => result.size,
        (i) => result.add(interpret(elementSpec, elementOptions, elementContext(descended, i))),
        "Set",
        "element",
      );

      return result;
    }
    case "tuple": {
      // A tuple has no size constraints of its own, so every option forwards.
      const positionOptions = residual(options);
      return spec.elements.map((source, i) =>
        interpret(
          requiredSpec(source, `tuple element at position ${i}`),
          positionOptions,
          elementContext(descended, i),
        )
      );
    }
  }
}

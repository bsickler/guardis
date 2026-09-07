/**
 * options.ts - Pure options-bag manipulation: merging call-time options over
 * registered defaults, and splitting a collection's bag between its own
 * size keys and what forwards to its elements. No dependency on `Spec` or
 * generation context.
 * @module
 */

/** A `{}`/`Object.create(null)` object -- excludes Map/Set/Date/class instances. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Merges registered defaults under call-time options. Shallow, except
 * `props`, which merges one level deeper because it holds per-field options
 * -- otherwise overriding field B would discard a registered default for
 * field A. Only attempted when BOTH sides are plain objects -- either side
 * being a `GeneratorConstraint` (a literal value, a `Dictionary`, a function)
 * wins outright instead, the same "non-object side wins" rule made symmetric.
 * Spreading a `Dictionary` instance as if it were a plain bag would otherwise
 * silently strip its `instanceof Dictionary`-ness (its `pick` method survives
 * the spread as an ordinary property, but the short-circuit in interpret.ts
 * that looks for `instanceof Dictionary` would no longer recognize it).
 */
export function mergeOptions(base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(override)) return override;

  const merged = { ...base, ...override };
  if ("props" in base || "props" in override) {
    merged.props = mergeOptions(base.props, override.props);
  }
  return merged;
}

/** Extracts the `props` sub-object from a `.generate()`-style options bag, if present. */
export function extractProps(options: unknown): Record<string, unknown> {
  const props = (options && typeof options === "object")
    ? (options as { props?: unknown }).props
    : undefined;
  return (props && typeof props === "object") ? props as Record<string, unknown> : {};
}

/**
 * The option keys a collection consumes for its own length/size rather than
 * forwarding to its elements -- see `residual`.
 */
export const SIZE_KEYS = ["min", "max", "ofLength"] as const;

/**
 * A collection's options bag is its elements' bag minus the size keys it
 * consumes. Returns undefined when nothing is left, so an unconfigured
 * collection's elements recurse with no options of their own.
 */
export function residual(options: unknown): unknown {
  if (!options || typeof options !== "object") return undefined;

  const out: Record<string, unknown> = {};
  let any = false;
  for (const [key, value] of Object.entries(options as Record<string, unknown>)) {
    if ((SIZE_KEYS as readonly string[]).includes(key)) continue;
    out[key] = value;
    any = true;
  }
  return any ? out : undefined;
}

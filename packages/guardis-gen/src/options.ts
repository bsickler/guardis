/**
 * options.ts - Pure options-bag manipulation: merging call-time options over
 * registered defaults, and splitting a collection's bag between its own
 * size keys and what forwards to its elements. No dependency on `Spec` or
 * generation context.
 * @module
 */

/**
 * Merges registered defaults under call-time options. Shallow, except
 * `props`, which merges one level deeper because it holds per-field options
 * -- otherwise overriding field B would discard a registered default for
 * field A. A non-object override wins outright over an object base.
 */
export function mergeOptions(base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (base && typeof base === "object" && typeof override === "object") {
    const merged = { ...base, ...override } as Record<string, unknown>;
    if ("props" in base || (override !== null && "props" in override)) {
      merged.props = mergeOptions(
        (base as { props?: unknown }).props,
        (override as { props?: unknown } | null)?.props,
      );
    }
    return merged;
  }
  return override;
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

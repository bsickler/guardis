/**
 * interpret.ts - Turns a resolved Spec into sample data. Any spec carrying
 * `generate` (a generator bound directly to its guard via
 * `guard.defineGenerator()`, validated on every call) dispatches straight to
 * that function regardless of its `kind` label. Everything else falls back
 * to the closed structural set: string, number, boolean, date, array,
 * object, optional.
 * @module
 */
import { DEFAULT_ELEMENT_SPEC, type Spec } from "./spec.ts";
import { randomDate, randomLength, randomNumber, randomString } from "./utilities/random.ts";

/**
 * Shallow-merges `override` onto `base`; either may be absent or a
 * non-object (in which case `override` simply wins outright, matching how
 * call-time options have always fully replaced an undefined/non-object
 * base). The one shared primitive both `mergeConstraints` and the
 * `CustomSpec` dispatch below build on.
 */
function shallowMerge(base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (base && typeof base === "object" && typeof override === "object") {
    return { ...base, ...override };
  }
  return override;
}

/**
 * Merges call-time options over a spec's registered constraints, for this
 * call only, with registered `.defineGenerator()` defaults sitting between
 * the two: `{ ...base, ...defaults, ...options }`. All three are optional
 * and shallow -- a call-time key always wins over a default, which always
 * wins over the spec's own registered constraints.
 */
function mergeConstraints<C extends object>(
  base: C | undefined,
  defaults: unknown,
  options: unknown,
): C | undefined {
  return shallowMerge(shallowMerge(base, defaults), options) as C | undefined;
}

/** Extracts the `props` sub-object from a `.generate()`-style options bag, if present. */
function extractProps(options: unknown): Record<string, unknown> {
  const props = (options && typeof options === "object")
    ? (options as { props?: unknown }).props
    : undefined;
  return (props && typeof props === "object") ? props as Record<string, unknown> : {};
}

/**
 * Interprets a resolved Spec into sample data. Returns undefined if the spec
 * is undefined. `options`, when the spec's kind supports it, overrides its
 * registered constraints for this call only; `defaults`, registered via
 * `.defineGenerator()`, sits between the spec's own constraints and
 * call-time `options` in precedence -- see `mergeConstraints`. `defaults`
 * is only ever meaningful at the outermost call: nested/recursive
 * `interpret()` calls for sub-properties already only ever receive a single
 * per-field extracted option, never a whole options bag, so there's nothing
 * for a nested call to merge defaults into.
 */
export function interpret(spec: Spec | undefined, options?: unknown, defaults?: unknown): unknown {
  if (!spec) return undefined;

  if ("generate" in spec) return spec.generate(shallowMerge(defaults, options));

  switch (spec.kind) {
    case "string":
      return randomString(mergeConstraints(spec.constraints, defaults, options));
    case "number":
      return randomNumber(mergeConstraints(spec.constraints, defaults, options));
    case "boolean":
      return Math.random() < 0.5;
    case "date":
      return randomDate(mergeConstraints(spec.constraints, defaults, options));
    case "array": {
      const length = randomLength(
        mergeConstraints(spec.constraints, defaults, options),
        0,
        (min) => min + 3,
      );
      const elementSpec = spec.element ?? DEFAULT_ELEMENT_SPEC;
      return Array.from({ length }, () => interpret(elementSpec));
    }
    case "optional":
      return Math.random() < 0.5 ? undefined : interpret(spec.inner, options, defaults);
    case "union": {
      const branch = spec.branches[Math.floor(Math.random() * spec.branches.length)];
      return interpret(branch, options, defaults);
    }
    case "object": {
      const propOptions = { ...extractProps(defaults), ...extractProps(options) };
      const result: Record<string, unknown> = {};
      const derivers: Record<string, (props: unknown) => unknown> = {};

      for (const [key, propSpec] of Object.entries(spec.fields)) {
        const opt = propOptions[key];
        if (typeof opt === "function") {
          derivers[key] = opt as (props: unknown) => unknown;
        } else {
          result[key] = interpret(propSpec, opt);
        }
      }

      const resolving: string[] = [];
      const props: Record<string, unknown> = new Proxy(result, {
        get(target, key: string) {
          if (key in target) return target[key];
          if (!(key in derivers)) return undefined;
          if (resolving.includes(key)) {
            throw new Error(
              `Circular dependency in relational properties: ${[...resolving, key].join(" -> ")}`,
            );
          }
          resolving.push(key);
          const value = derivers[key](props);
          resolving.pop();
          target[key] = value; // memoize -- every other reader hits the `key in target` fast path
          return value;
        },
      });

      for (const key of Object.keys(derivers)) {
        result[key] = props[key]; // force resolution; no-op if already resolved via another read
      }

      if (spec.guard && !spec.guard(result)) {
        throw new TypeError(
          `the generated object fails its own guard: ${JSON.stringify(result)}. ` +
            `This usually means a relational derive function produced an invalid value.`,
        );
      }

      return result;
    }
    case "map": {
      const length = randomLength(
        mergeConstraints(spec.constraints, defaults, options),
        0,
        (min) => min + 3,
      );
      const result = new Map<unknown, unknown>();

      for (let i = 0; i < length; i++) result.set(interpret(spec.key), interpret(spec.value));

      return result;
    }
    case "set": {
      const length = randomLength(
        mergeConstraints(spec.constraints, defaults, options),
        0,
        (min) => min + 3,
      );
      const result = new Set<unknown>();

      for (let i = 0; i < length; i++) result.add(interpret(spec.element));

      return result;
    }
    case "tuple":
      return spec.elements.map((s) => interpret(s));
  }
}

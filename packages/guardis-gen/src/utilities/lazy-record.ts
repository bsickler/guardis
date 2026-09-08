/**
 * guardis-gen's lazy props record: fields compute on demand from thunks,
 * memoize once, detect cycles against a caller-supplied stack, and stay
 * honest under Proxy reflection (spread, `in`, freeze/seal all see real
 * field state).
 * @module
 */

/** One in-flight field: `key` is the collision-free cycle identity, `label` is what a cycle error displays. */
export type ResolvingEntry = { readonly key: string; readonly label: string };

export interface LazyRecordConfig {
  /** Cycle-detection stack, shared by reference with whatever else pushes onto it. */
  resolving: ResolvingEntry[];
  /** Collision-free identity for a key, checked against `resolving`. */
  identity: (key: string) => string;
  /** Human-readable name for a key, used in a cycle error's message. */
  label: (key: string) => string;
}

export interface LazyRecord {
  /** The plain object backing the record. */
  readonly result: Record<string, unknown>;
  /** Live view over `result`: reading a field forces and memoizes it. */
  readonly props: Record<string, unknown>;
  /** Registers a field's thunk. */
  define(key: string, thunk: () => unknown): void;
  /** Forces a field if not already resolved. */
  force(key: string): unknown;
}

export function lazyRecord(config: LazyRecordConfig): LazyRecord {
  const result: Record<string, unknown> = {};
  // No prototype: `thunks['constructor']`/`['valueOf']`/etc. must be
  // undefined for an undeclared key, not an inherited Object.prototype
  // member that reads as a truthy (bogus) thunk.
  const thunks: Record<string, () => unknown> = Object.create(null);

  const resolve = (key: string): unknown => {
    if (Object.hasOwn(result, key)) return result[key];
    const thunk = thunks[key];
    if (!thunk) return undefined;

    const identity = config.identity(key);
    if (config.resolving.some((entry) => entry.key === identity)) {
      throw new Error(
        `circular dependency in relational properties: ` +
          `${
            [...config.resolving.map((entry) => entry.label), config.label(key)].join(" -> ")
          } -- break the cycle by having one of these fields' derive functions stop depending on the other.`,
      );
    }
    config.resolving.push({ key: identity, label: config.label(key) });
    try {
      const value = thunk();
      // Object.defineProperty, not `result[key] = value`: a key literally
      // named "__proto__" would otherwise hit Object.prototype's accessor
      // and set the object's actual prototype instead of memoizing a field.
      Object.defineProperty(result, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      return value; // memoize -- later reads hit the `key in result` fast path
    } finally {
      config.resolving.pop();
    }
  };

  const props: Record<string, unknown> = new Proxy(result, {
    get(target, key) {
      // Symbols (Symbol.toPrimitive, inspect hooks, `then` if a result is
      // ever awaited) reach this trap too and have no field behind them.
      // A key that's neither a declared field nor already memoized falls
      // through to the real target -- `props.constructor`/`.toString`/etc.
      // read as the genuine inherited Object.prototype member (matching a
      // real plain object) instead of being force-resolved to undefined.
      if (typeof key !== "string") return Reflect.get(target, key);
      return Object.hasOwn(thunks, key) || Object.hasOwn(result, key)
        ? resolve(key)
        : Reflect.get(target, key);
    },
    // `"x" in props` has to answer for a field that exists but hasn't been
    // forced yet, or laziness leaks out as a missing key.
    has(target, key) {
      return (typeof key === "string" && Object.hasOwn(thunks, key)) ||
        Reflect.has(target, key);
    },
    // Listing only: a spread reads ownKeys, then getOwnPropertyDescriptor
    // per key for enumerability, then get. Without both traps, `{ ...props }`
    // mid-generation would see only whichever fields were already forced.
    ownKeys(target) {
      return [...new Set([...Object.keys(thunks), ...Reflect.ownKeys(target)])];
    },
    getOwnPropertyDescriptor(target, key) {
      if (
        typeof key === "string" && !Object.hasOwn(target, key) && Object.hasOwn(thunks, key)
      ) {
        // A spread is reflection over the object, not a declared dependency
        // on any one key -- so quietly omit whichever key is mid-flight
        // rather than reporting the spread itself as a cycle.
        if (config.resolving.some((entry) => entry.key === config.identity(key))) {
          return undefined;
        }
        resolve(key);
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    // A write would fall through to `result` unnoticed, and the sibling it
    // clobbers would then hit the memoized fast path in `resolve` and never
    // run its own thunk -- silently skipping a field AND shifting every
    // later PRNG draw. Rejecting is the only safe option.
    set(_target, key) {
      throw new TypeError(
        `props.${String(key)} = ... is not allowed: props is a live view of the object ` +
          `being generated, not a place to write. Return the value for '${
            String(key)
          }' from that field's own deriver instead.`,
      );
    },
    deleteProperty(_target, key) {
      throw new TypeError(
        `delete props.${String(key)} is not allowed: props is a live view of the object ` +
          `being generated, not a place to mutate.`,
      );
    },
    defineProperty(_target, key) {
      throw new TypeError(
        `Object.defineProperty(props, '${
          String(key)
        }', ...) is not allowed: props is a live view of the object being generated, not a ` +
          `place to mutate.`,
      );
    },
    // Object.freeze/seal calls this first, then re-reads ownKeys to verify it
    // matches exactly -- forwarding to the real (extensible) `result` target
    // would pass the freeze through to it, and the very next `ownKeys` call
    // (a field still to force) would then violate the invariant that a
    // non-extensible target's keys can't grow.
    preventExtensions() {
      throw new TypeError(
        `props cannot be frozen or sealed: it's a live view of the object being generated, ` +
          `not the finished value. Freeze the object generate() returns instead.`,
      );
    },
  });

  return {
    result,
    props,
    define(key, thunk) {
      thunks[key] = thunk;
    },
    force(key) {
      return resolve(key);
    },
  };
}

import { createTypeGuard, type TypeGuard } from "../guard.ts";

/**
 * Returns true if input is an async function.
 * @param {unknown} t
 * @return {boolean}
 */
export const isAsyncFunction: TypeGuard<(...args: unknown[]) => Promise<unknown>> = createTypeGuard<
  (...args: unknown[]) => Promise<unknown>
>(
  (t: unknown) => {
    return typeof t === "function" && t.constructor.name === "AsyncFunction"
      ? (t as (...args: unknown[]) => Promise<unknown>)
      : null;
  },
);

/**
 * Returns true if input is a Promise.
 * @param {unknown} t
 * @return {boolean}
 */
export const isPromise: TypeGuard<Promise<unknown>> = createTypeGuard(<T>(t: unknown) =>
  t instanceof Promise ? t as Promise<T> : null
);

/**
 * Returns true if input is Promise-like (i.e. has a `then` method).
 * @param {unknown} t
 * @return {boolean}
 */
export const isPromiseLike: TypeGuard<PromiseLike<unknown>> = createTypeGuard(<T>(t: unknown) => {
  if (
    t &&
    typeof t === "object" &&
    "then" in t &&
    typeof t.then === "function"
  ) {
    return t as PromiseLike<T>;
  }
  return null;
});

/**
 * Returns true if input is thenable (i.e. has a `then` method).
 * Alias for isPromiseLike.
 * @param {unknown} t
 * @return {boolean}
 */
export const isThenable = isPromiseLike; // alias

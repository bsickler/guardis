/** Strict compile-time equality check. Uses the function signature trick to detect exact type matches. */
export type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

/** Compile error if T is not exactly `true`. Rejects `false`. */
export function assertType<T extends true>(): [T] extends [never] ? never : void {
  return undefined as [T] extends [never] ? never : void;
}

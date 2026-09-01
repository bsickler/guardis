/**
 * safe-stringify.ts - A stringifier for error messages, which must never
 * throw themselves. `JSON.stringify` throws on a circular value (e.g. a
 * deriver that returns the live `props` proxy) and on a BigInt, which would
 * destroy the diagnostic while reporting it.
 * @module
 */

/**
 * `JSON.stringify(value)`, falling back to `String(value)` on any failure --
 * circular references and BigInts included. `undefined` is spelled out
 * explicitly, since `JSON.stringify` returns `undefined` (not a string) for
 * it and for values like functions or symbols.
 *
 * `String(value)` isn't itself total: a live props proxy (its `toString`/
 * `valueOf` resolve to no field and produce nothing callable) or an
 * `Object.create(null)` value throws too, via `ToPrimitive`. A final fallback
 * to `Object.prototype.toString.call` guarantees this function never throws.
 */
export function safeStringify(value: unknown): string {
  if (value === undefined) return "undefined";
  try {
    const json = JSON.stringify(value);
    if (json !== undefined) return json;
  } catch {
    // circular reference, BigInt, etc. -- fall through to String()
  }
  try {
    return String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

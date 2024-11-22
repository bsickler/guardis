import type { ParserRecords } from "./types.ts";
import { createTypeGuard } from "./guard.ts";

type GuardRecords<E extends ParserRecords, K extends keyof E = keyof E> = {
  [key in K as `is${K & string}`]: ReturnType<
    typeof createTypeGuard<Exclude<ReturnType<E[key]>, null>>
  >;
};

/**
 * Batch generate a set of type guard functions. The returned record
 * will contain keys for each type, prefixed by `is`. These can be destructured
 * to the corresponding type guards.
 * @param config
 * @returns
 *
 * @example
 *
 * const { isMeatball } = batch({ Meatball: (v) => v === "meatball" ? v : null });
 */
export function batch<B extends ParserRecords>(config: B): GuardRecords<B> {
  const entries = Object.entries(config)
    .map(([name, parser]) => [`is${name}`, createTypeGuard(parser)]);

  return Object.fromEntries(entries);
}

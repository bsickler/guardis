import type { ParserRecords } from "./types.ts";
import { createTypeGuard } from "./guard.ts";
import { Is } from "./index.ts";

/** The return Is dictionary, merging both the definitions from the standard library
 * and the custom type guards generated from the GuardExtension record. */
type ExtendedIs<E extends ParserRecords> =
  & typeof Is
  & {
    [key in keyof E]: ReturnType<
      typeof createTypeGuard<Exclude<ReturnType<E[key]>, null>>
    >;
  };

/**
 * Generate a custom Is dictionary using an object with the names of your types
 * and the parsers to use to create type guards.
 * @param config
 * @returns
 */
export function extend<P extends ParserRecords>(config: P): ExtendedIs<P> {
  const entries = Object.entries(config)
    .map(([name, parser]) => [name, createTypeGuard(parser)]);

  return { ...Object.fromEntries(entries), ...Is } as ExtendedIs<P>;
}

import { createTypeGuard, type Parser } from "./guard.ts";
import { Is } from "./index.ts";

/** A record describing various types and their parsers. This can be used to generate
 * a customized Is dictionary. */
type GuardExtension = Record<string, Parser>;

/** The return Is dictionary, merging both the definitions from the standard library
 * and the custom type guards generated from the GuardExtension record. */
type ExtendedIs<E extends GuardExtension> =
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
export function extend<E extends GuardExtension>(config: E): ExtendedIs<E> {
  const mappedEntries = Object.fromEntries(
    Object.entries(config).map((
      [name, parser],
    ) => [name, createTypeGuard(parser)]),
  );

  return { ...mappedEntries, ...Is } as ExtendedIs<E>;
}

import type { Parser, ParserRecords } from "./types.ts";
import { createTypeGuard } from "./guard.ts";
import { Is } from "../mod.ts";

type GetParserReturnType<P> = P extends Parser<infer T> ? T
  : P extends { parse: Parser<infer T> } ? T
  : never;

/** The return Is dictionary, merging both the definitions from the standard library
 * and the custom type guards generated from the GuardExtension record. */
export type ExtendedIs<E extends ParserRecords, I extends typeof Is> = {
  [K in keyof I | keyof E]: K extends keyof I ? I[K] : K extends keyof E ? ReturnType<
      typeof createTypeGuard<GetParserReturnType<E[K]>>
    >
  : never;
};

/**
 * Generate a custom Is dictionary using an object with the names of your types
 * and the parsers to use to create type guards.
 * @param config
 * @returns
 */
export function extend<P extends ParserRecords>(
  config: P,
): ExtendedIs<P, typeof Is>;
/**
 * Clones the provided Is library and extends it by adding in your
 * new parsers.
 * @param Is The Is library to extend.
 * @param config The catalog of parsers to include in your library.
 * @returns
 */
export function extend<P extends ParserRecords, I extends typeof Is>(
  is: I,
  config: P,
): ExtendedIs<P, I>;
export function extend<P extends ParserRecords, I extends typeof Is>(
  ...args: [P] | [P, I]
): ExtendedIs<P, I> {
  const config = (1 in args ? args[1] : args[0]) as P;
  const is = 1 in args ? args[0] : Is;

  const entries = Object.entries(config)
    .map((
      [name, parser],
    ) => [
      name,
      typeof parser === "function"
        ? createTypeGuard(parser)
        : createTypeGuard(parser.name, parser.parse),
    ]);

  return { ...Object.fromEntries(entries), ...(is ?? Is) };
}

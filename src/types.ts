import type { Parser } from "./guard.ts";

/** A record describing various types and their parsers. This can be used to generate
 * a customized Is dictionary. */
export type ParserRecords = Record<string, Parser>;

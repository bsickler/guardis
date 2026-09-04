/**
 * dictionaries/internet/tlds.ts - A small, curated starter set of top-level
 * domains.
 * @module
 */
import { defineDictionary, type DictionarySet } from "../../dictionary.ts";

export const tlds: DictionarySet<string> = defineDictionary([
  "com",
  "net",
  "org",
  "io",
  "dev",
  "co",
  "app",
]);

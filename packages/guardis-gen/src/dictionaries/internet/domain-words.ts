/**
 * dictionaries/internet/domain-words.ts - A small, curated, English-only
 * starter set of domain-name words -- shaped to pair with
 * modules/strings.ts's `isEmail` generator.
 * @module
 */
import { defineDictionary, type DictionarySet } from "../../dictionary.ts";

export const domainWords: DictionarySet<string> = defineDictionary([
  "example",
  "acme",
  "globex",
  "initech",
  "mailhost",
  "webmail",
  "cloudbox",
  "notifier",
  "sandbox",
  "testlab",
  "devops",
  "gridworks",
]);

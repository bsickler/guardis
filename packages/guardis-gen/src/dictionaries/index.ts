/**
 * dictionaries/index.ts - Groups the built-in standard dictionaries for
 * discoverability. Each pool is independently typed (see `Dictionary<T>`),
 * so this is a plain namespace -- like `gen = { tuple }` in mod.ts -- not a
 * merged dictionary of its own. PascalCase all the way down to the dictionary
 * itself (`Dictionaries.Internet.DomainWords`) -- these are namespace
 * segments naming a fixed pool, not object properties -- matching the
 * exported dictionary instances' own PascalCase types/classes
 * (`DomainWords` reads as "the `DomainWords` dictionary" the same way
 * `Names`/`Companies`/`Countries` do).
 * @module
 */
import { Companies } from "./company.ts";
import { DomainWords } from "./internet/domain-words.ts";
import { Tlds } from "./internet/tlds.ts";
import { Cities } from "./location/cities.ts";
import { Countries } from "./location/countries.ts";
import { Names } from "./people/names.ts";

export const Dictionaries = {
  People: { Names },
  Companies,
  Location: { Cities, Countries },
  Internet: { DomainWords, Tlds },
};

/**
 * dictionaries/index.ts - Groups the built-in standard dictionaries for
 * discoverability. Each pool is independently typed (see `Dictionary<T>`),
 * so this is a plain namespace -- like `gen = { tuple }` in mod.ts -- not a
 * merged dictionary of its own.
 * @module
 */
import { companies } from "./company.ts";
import { domainWords } from "./internet/domain-words.ts";
import { tlds } from "./internet/tlds.ts";
import { cities } from "./location/cities.ts";
import { countries } from "./location/countries.ts";
import { names } from "./people/names.ts";

export const dictionaries = {
  people: { names },
  company: { companies },
  location: { cities, countries },
  internet: { domainWords, tlds },
};

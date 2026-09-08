/**
 * dictionaries/internet/tlds.ts - A small, curated starter set of top-level
 * domains, plus a separate `CountryTlds` pool of country-code TLDs (ccTLDs)
 * for a value that needs to look tied to a specific country (a localized
 * storefront, a country-scoped email) -- kept apart from `Tlds` so drawing
 * one never needs to filter "com"/"dev"/"app" back out.
 * @module
 */
import { Dictionary } from "../../dictionary.ts";

const tlds = [
  "com",
  "net",
  "org",
  "io",
  "dev",
  "co",
  "app",
];

const countryTlds = [
  "us",
  "ca",
  "uk",
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "se",
  "no",
  "jp",
  "cn",
  "in",
  "au",
  "nz",
  "br",
  "mx",
  "za",
  "ru",
  "kr",
];

/** Country-code TLDs (ccTLDs) alone, e.g. "de". */
const Countries = Dictionary.of(countryTlds);

export const Tlds = Dictionary.withChildren(
  Dictionary.of(tlds),
  { Countries } as const,
);

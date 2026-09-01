/**
 * modules/strings.ts - Side-effect entry point mirroring guardis'
 * "@spudlabs/guardis/strings" module. Binds a generator directly to each
 * string-format guard (email, phone, UUID, ULID, emoji, delimited lists)
 * via .defineGenerator() — validated against that same guard on every call,
 * not matched through a separate string registry. Independent of
 * modules/primitives — importing this alone does not patch isString's
 * chain methods, and vice versa, so each stays tree-shakeable on its own.
 * @module
 */
import {
  isCommaDelimited,
  isCommaDelimitedIntegers,
  isCommaDelimitedNumbers,
  isEmail,
  isEmoji,
  isInternationalPhone,
  isPeriodDelimited,
  isPhoneNumber,
  isUlid,
  isUSPhone,
  isUUIDv4,
  isUUIDv7,
} from "@spudlabs/guardis/strings";
import { randomDigits, randomHex, randomWord } from "../utilities/random.ts";
import { next, pick, randomInt } from "../utilities/rng.ts";
import { attachToVariants, ensureGenerateCapability } from "../shared.ts";

/**
 * Call-time options for `isInternationalPhone.generate()`. Lives here, next
 * to the generator it configures, rather than in the central `Spec` model --
 * a phone's country code has no relationship to any other guard's options
 * shape, unlike the structural constraints (`LengthConstraints` etc.) that
 * genuinely are shared across several primitive kinds.
 */
export type PhoneConstraints = { countryCode?: string };

/**
 * Registers `PhoneConstraints` for the `InternationalPhone` brand, so
 * `.generate(options)` is typed at every call site for anyone importing the
 * BRANDED `isInternationalPhone` from "@spudlabs/guardis/strings-branded" --
 * see `GenerateOptionsFor`/`GeneratorOptionsRegistry` in spec.ts for how this
 * resolves. The PLAIN (non-branded) import from "@spudlabs/guardis/strings"
 * is the exact same runtime guard but has no brand to key off of, so it
 * keeps the base (effectively zero-arg) `generate()` -- this is a real,
 * accepted limitation, not an oversight: guardis-gen can only guarantee
 * accurate `.generate()` option typing when the branded variant is in use.
 */
declare module "@spudlabs/guardis-gen" {
  interface GeneratorOptionsRegistry {
    InternationalPhone: PhoneConstraints;
  }
}

ensureGenerateCapability();

/** UUID variant field: must be one of 8, 9, a, b. */
function randomVariantNibble(): string {
  return "89ab"[randomInt(0, 3)];
}

function uuid(version: "4" | "7"): string {
  return `${randomHex(8)}-${randomHex(4)}-${version}${randomHex(3)}-${randomVariantNibble()}${
    randomHex(3)
  }-${randomHex(12)}`;
}

/** Total digit count `isInternationalPhone`'s regex accepts (country code + rest). */
const INTERNATIONAL_PHONE_MIN_DIGITS = 7;
/** Typical total digit count (e.g. a US number: 1-digit country code + 10-digit rest). */
const INTERNATIONAL_PHONE_TYPICAL_DIGITS = 11;
const INTERNATIONAL_PHONE_MAX_DIGITS = 15;

function internationalPhone(options?: PhoneConstraints): string {
  const countryCode = options?.countryCode ?? randomDigits(2);
  const restLength = Math.min(
    Math.max(
      INTERNATIONAL_PHONE_TYPICAL_DIGITS - countryCode.length,
      INTERNATIONAL_PHONE_MIN_DIGITS - countryCode.length,
    ),
    INTERNATIONAL_PHONE_MAX_DIGITS - countryCode.length,
  );
  return `+${countryCode}${randomDigits(restLength)}`;
}

function ulid(): string {
  // Crockford Base32: 0-9, A-H, J-K, M-N, P-T, V-Z (excludes I, L, O, U).
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let out = "";
  for (let i = 0; i < 26; i++) {
    out += alphabet[randomInt(0, alphabet.length - 1)];
  }
  return out;
}

// A small pool of known-valid RGI emoji -- generating an arbitrary valid
// Unicode emoji *sequence* generically isn't practical, so we pick from
// real ones instead of trying to synthesize codepoints.
const EMOJI_POOL = ["😀", "👍", "🎉", "❤️", "🔥", "🚀", "✨", "🐢", "🎈", "🌟"];

// These guards already exist by the time this module runs (built at
// @spudlabs/guardis's own module-load time) -- same reasoning as
// modules/primitives.ts's attach calls. .defineGenerator() binds each
// generator directly to its guard and validates against it on every call.
for (
  const guard of [
    isEmail,
    isInternationalPhone,
    isUSPhone,
    isPhoneNumber,
    isUUIDv4,
    isUUIDv7,
    isCommaDelimited,
    isPeriodDelimited,
    isCommaDelimitedIntegers,
    isCommaDelimitedNumbers,
    isUlid,
    isEmoji,
  ]
) {
  attachToVariants(guard);
}

isEmail.defineGenerator(() => `${randomWord()}@${randomWord()}.com`);
isInternationalPhone.defineGenerator(internationalPhone);
isUSPhone.defineGenerator(() => randomDigits(10));
isPhoneNumber.defineGenerator(() => randomDigits(10));
isUUIDv4.defineGenerator(() => uuid("4"));
isUUIDv7.defineGenerator(() => uuid("7"));
isUlid.defineGenerator(ulid);
isEmoji.defineGenerator(() => pick(EMOJI_POOL));
isCommaDelimited.defineGenerator(() => Array.from({ length: 3 }, () => randomWord(4)).join(","));
isPeriodDelimited.defineGenerator(() => Array.from({ length: 3 }, () => randomWord(4)).join("."));
isCommaDelimitedIntegers.defineGenerator(
  () => Array.from({ length: 3 }, () => randomInt(0, 99)).join(","),
);
isCommaDelimitedNumbers.defineGenerator(
  () => Array.from({ length: 3 }, () => (next() * 100).toFixed(1)).join(","),
);

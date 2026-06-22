/**
 * Type guards for common string formats such as email, phone numbers, and UUIDs.
 * These guards extend the basic string type guard to include regex-based validation.
 */
import { isString } from "./primitives.ts";
import type { TypeGuard } from "../types.ts";

/** A regex statement to detect _most_ email formats. */
const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+\'-]+@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Type guard that checks if the provided value is a valid email string.
 *
 * Uses the `EMAIL_REGEX` to test if the input is a string matching the email format.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5321 — RFC 5321: Simple Mail Transfer Protocol
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a valid email.
 */
export const isEmail: TypeGuard<string> = isString.extend(
  "email",
  (t) => EMAIL_REGEX.test(t) ? t : null,
);

/** Regex for validating international phone numbers. See
 * https://blog.stevenlevithan.com/archives/validate-phone-number#r4-3 for more
 * information. */
const INT_PHONE_REGEX = /^\+(?:[0-9] ?){6,14}[0-9]$/;

/**
 * Type guard that checks if the provided value is a valid international phone number.
 *
 * Uses the `INT_PHONE_REGEX` to test if the input is a string matching the international phone number format.
 *
 * @see https://www.itu.int/rec/T-REC-E.164 — ITU-T E.164: International telephone numbering plan
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a valid international phone number.
 */
export const isInternationalPhone: TypeGuard<string> = isString.extend(
  "international phone number",
  (t) => INT_PHONE_REGEX.test(t) ? t : null,
);

/** Regex for validating US phone numbers. See
 * https://blog.stevenlevithan.com/archives/validate-phone-number#r4-3 for more
 * information. */
const US_PHONE_REGEX = /^(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

/**
 * Type guard that checks if the provided value is a valid US phone number.
 *
 * Uses the `US_PHONE_REGEX` to test if the input is a string matching the US phone number format.
 *
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a valid US phone number.
 */
export const isUSPhone: TypeGuard<string> = isString.extend(
  "US phone number",
  (t) => US_PHONE_REGEX.test(t) ? t : null,
);

/**
 * Type guard that checks if the provided value is a valid phone number, either international or US format.
 *
 * Uses both `INT_PHONE_REGEX` and `US_PHONE_REGEX` to test if the input is a string matching either format.
 *
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a valid phone number.
 */
export const isPhoneNumber: TypeGuard<string> = isString.extend(
  "phone number",
  (t) => {
    if (INT_PHONE_REGEX.test(t) || US_PHONE_REGEX.test(t)) {
      return t;
    }
    return null;
  },
);

/** Regex for validating UUID v4 strings. */
const UUID_4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * A type guard function that checks if a given value is a valid UUID version 4 string.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc9562#section-5.4 — RFC 9562: UUID Version 4
 * @param t - The value to be checked.
 * @returns  Boolean indicating whether the input is a valid UUID v4 string.
 */
export const isUUIDv4: TypeGuard<string> = isString.extend(
  "UUIDv4",
  (t) => UUID_4_REGEX.test(t) ? t : null,
);

/** Regex for validating UUID v7 strings. */
const UUID_7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * A type guard function that checks if a given value is a valid UUID version 7 string.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc9562#section-5.7 — RFC 9562: UUID Version 7
 * @param t - The value to be checked.
 * @returns  Boolean indicating whether the input is a valid UUID v7 string.
 */
export const isUUIDv7: TypeGuard<string> = isString.extend(
  "UUIDv7",
  (t) => UUID_7_REGEX.test(t) ? t : null,
);

/**
 * A regular expression used to validate comma-delimited strings.
 *
 * - Matches strings enclosed in double quotes, allowing for escaped characters within the quotes.
 * - Matches unquoted segments that do not contain commas, double quotes, or backslashes.
 * - Useful for parsing CSV-like strings where fields may be quoted or unquoted.
 * - Validates the entire string structure, allowing empty strings, single values, or comma-separated values.
 *
 * Example:
 * Input: `"value1","value2,with,commas",unquotedValue`
 * Matches: entire string as valid comma-delimited format
 */
const COMMA_DELIMITED_REGEX =
  /^(?:(?:"(?:[^"\\]|\\.)*"|[^,"\\]+)(?:,(?:"(?:[^"\\]|\\.)*"|[^,"\\]+))*)?$/;

/**
 * A type guard function that checks if a given string matches the pattern of a comma-delimited string.
 *
 * This function extends the `isString` type guard and applies an additional validation
 * using the `COMMA_DELIMITED_REGEX` regular expression. If the string matches the pattern,
 * it is returned; otherwise, `null` is returned.
 *
 * @param t - The input value to be checked.
 * @returns  Boolean indicating whether the input is a valid comma-delimited string.
 */
export const isCommaDelimited: TypeGuard<string> = isString.extend(
  "comma-delimited string",
  (t) => COMMA_DELIMITED_REGEX.test(t) ? t : null,
);

const PERIOD_DELIMITED_REGEX =
  /^(?:(?:"(?:[^"\\]|\\.)*"|[^."\\""]+)(?:.(?:"(?:[^"\\]|\\.)*"|[^."\\""]+))*)?$/;

/**
 * Checks if a given string matches the period-delimited format.
 * This function extends the `isString` type guard to validate
 * whether the input string conforms to the `PERIOD_DELIMITED_REGEX`.
 *
 * @param t - The string to be validated.
 * @returns  Boolean indicating whether the input is a valid period-delimited string.
 */
export const isPeriodDelimited: TypeGuard<string> = isString.extend(
  "period-delimited string",
  (t) => PERIOD_DELIMITED_REGEX.test(t) ? t : null,
);

const COMMA_DELIMITED_INTEGERS_REGEX = /^-?\d+(?:,-?\d+)*$/;

/**
 * A type guard function that checks if a given string matches the pattern of a comma-delimited
 * string of integers.
 *
 * - Matches one or more integers (positive or negative) separated by commas.
 * - Does not allow empty values between commas.
 * - Does not allow any whitespace (between digits or after commas).
 * - Does not match empty strings.
 *
 * @param t - The value to test for comma-delimited integers validity.
 * @returns Boolean indicating whether the input is a valid comma-delimited string of integers.
 *
 * @example
 * - Valid: "1,2,3", "123,456,789", "-1,2,-3"
 * - Invalid: "1,,3", "1, 2, 3", "1 2,3", "", "1.5,2"
 */
export const isCommaDelimitedIntegers: TypeGuard<string> = isString.extend(
  "comma-delimited integers",
  (t) => COMMA_DELIMITED_INTEGERS_REGEX.test(t) ? t : null,
);

/**
 * Crockford Base32 alphabet: 0-9, A-H, J-K, M-N, P-T, V-Z (excludes I, L, O, U).
 * ULIDs are 26 characters long.
 */
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

/**
 * Type guard that checks if the provided value is a valid ULID string
 * (26-character Crockford Base32).
 *
 * @see https://github.com/ulid/spec — ULID Specification
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a valid ULID.
 *
 * @example
 * ```typescript
 * isUlid("01ARZ3NDEKTSV4RRFFQ69G5FAV")  // true
 * isUlid("not-a-ulid")                    // false
 * ```
 */
export const isUlid: TypeGuard<string> = isString.extend(
  "ULID",
  (t) => ULID_REGEX.test(t) ? t : null,
);

/**
 * Regex for matching a single emoji character or sequence, including:
 * - Simple emoji (👍)
 * - Emoji with skin tone modifiers (👍🏽)
 * - ZWJ sequences (🏳️‍🌈, 👨‍👩‍👧‍👦)
 * - Flag sequences (🇺🇸)
 * - Keycap sequences (#️⃣)
 *
 * Uses the Unicode `v` flag with the RGI_Emoji sequence property.
 */
const EMOJI_REGEX = /^\p{RGI_Emoji}$/v;

/**
 * Type guard that checks if the provided value is a single emoji character or sequence.
 *
 * @see https://www.unicode.org/reports/tr51/ — Unicode Technical Standard #51: Unicode Emoji
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a single emoji.
 *
 * @example
 * ```typescript
 * isEmoji("👍")    // true
 * isEmoji("🏳️‍🌈")  // true (multi-codepoint sequence)
 * isEmoji("hello") // false
 * isEmoji("")      // false
 * ```
 */
export const isEmoji: TypeGuard<string> = isString.extend(
  "emoji",
  (t) => EMOJI_REGEX.test(t) ? t : null,
);

const COMMA_DELIMITED_NUMBERS_REGEX = /^-?\d+(?:\.\d+)?%?(?:,-?\d+(?:\.\d+)?%?)*$/;

/**
 * A type guard function that checks if a given string matches the pattern of a comma-delimited
 * string of numbers.
 *
 * - Matches one or more numbers (integers, floats, decimals, or percentages) separated by commas.
 * - Supports positive and negative numbers.
 * - Supports decimal values (e.g., "1.5", "3.14159").
 * - Supports percentage values (e.g., "50%", "12.5%").
 * - Does not allow empty values between commas.
 * - Does not allow any whitespace (between digits or after commas).
 * - Does not match empty strings.
 *
 * @param t - The value to test for comma-delimited numbers validity.
 * @returns Boolean indicating whether the input is a valid comma-delimited string of numbers.
 *
 * @example
 * - Valid: "1,2,3", "1.5,2.5,3.5", "-1.5,2,3.14", "50%,75%,100%", "1.5%,2,3%"
 * - Invalid: "1,,3", "1, 2, 3", "1 2,3", "", "1..5,2", "1.5.5,2"
 */
export const isCommaDelimitedNumbers: TypeGuard<string> = isString.extend(
  "comma-delimited numbers",
  (t) => COMMA_DELIMITED_NUMBERS_REGEX.test(t) ? t : null,
);

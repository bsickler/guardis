/**
 * Type guards for common string formats such as email, phone numbers, and UUIDs.
 * These guards extend the basic string type guard to include regex-based validation.
 */
import { isString, type TypeGuard } from "../guard.ts";

/** A regex statement to detect _most_ email formats. */
const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Type guard that checks if the provided value is a valid email string.
 *
 * Uses the `EMAIL_REGEX` to test if the input is a string matching the email format.
 *
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a valid email.
 */
export const isEmail: TypeGuard<string> = isString.extend((t) => EMAIL_REGEX.test(t) ? t : null);

/** Regex for validating international phone numbers. See
 * https://blog.stevenlevithan.com/archives/validate-phone-number#r4-3 for more
 * information. */
const INT_PHONE_REGEX = /^\+(?:[0-9] ?){6,14}[0-9]$/;

/**
 * Type guard that checks if the provided value is a valid international phone number.
 *
 * Uses the `INT_PHONE_REGEX` to test if the input is a string matching the international phone number format.
 *
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a valid international phone number.
 */
export const isInternationalPhone: TypeGuard<string> = isString.extend((t) =>
  INT_PHONE_REGEX.test(t) ? t : null
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
export const isUSPhone: TypeGuard<string> = isString.extend((t) =>
  US_PHONE_REGEX.test(t) ? t : null
);

/**
 * Type guard that checks if the provided value is a valid phone number, either international or US format.
 *
 * Uses both `INT_PHONE_REGEX` and `US_PHONE_REGEX` to test if the input is a string matching either format.
 *
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a valid phone number.
 */
export const isPhoneNumber: TypeGuard<string> = isString.extend((t) => {
  if (INT_PHONE_REGEX.test(t) || US_PHONE_REGEX.test(t)) {
    return t;
  }
  return null;
});

/** Regex for validating UUID v4 strings. */
const UUID_4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * A type guard function that checks if a given value is a valid UUID version 4 string.
 *
 * @param t - The value to be checked.
 * @returns The input string if it is a valid UUID v4, otherwise `null`.
 */
export const isUUIDv4: TypeGuard<string> = isString.extend((t) => UUID_4_REGEX.test(t) ? t : null);

/**
 * A regular expression used to match individual components of a comma-delimited string.
 *
 * - Matches strings enclosed in double quotes, allowing for escaped characters within the quotes.
 * - Matches unquoted segments that do not contain commas, double quotes, or backslashes.
 * - Useful for parsing CSV-like strings where fields may be quoted or unquoted.
 *
 * Example:
 * Input: `"value1","value2,with,commas",unquotedValue`
 * Matches: ["value1", "value2,with,commas", "unquotedValue"]
 */
const COMMA_DELIMITED_REGEX = /(?:"(?:[^"\\]|\\.)*"|(?:[^,"\\]|\\.)*)/;

export const isCommaDelimited: TypeGuard<string> = isString.extend((t) =>
  COMMA_DELIMITED_REGEX.test(t) ? t : null
);

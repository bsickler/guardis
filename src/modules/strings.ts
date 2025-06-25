import { createTypeGuard } from "../guard.ts";

/** A regex statement to detect _most_ email formats. */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/** Regex for validating international phone numbers. See
 * https://blog.stevenlevithan.com/archives/validate-phone-number#r4-3 for more
 * information. */
const INT_PHONE_REGEX = /^\+(?:[0-9] ?){6,14}[0-9]$/;

/** Regex for validating US phone numbers. See
 * https://blog.stevenlevithan.com/archives/validate-phone-number#r4-3 for more
 * information. */
const US_PHONE_REGEX = /^(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

/**
 * Type guard that checks if the provided value is a valid email string.
 *
 * Uses the `EMAIL_REGEX` to test if the input is a string matching the email format.
 *
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a valid email.
 */
export const isEmail = createTypeGuard((t: unknown) => {
  if (typeof t === "string" && EMAIL_REGEX.test(t)) {
    return t;
  }
  return null;
});

/**
 * Type guard that checks if the provided value is a valid international phone number.
 *
 * Uses the `INT_PHONE_REGEX` to test if the input is a string matching the international phone number format.
 *
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a valid international phone number.
 */
export const isInternationalPhone = createTypeGuard((t: unknown) => {
  if (typeof t === "string" && INT_PHONE_REGEX.test(t)) {
    return t;
  }
  return null;
});

/**
 * Type guard that checks if the provided value is a valid US phone number.
 *
 * Uses the `US_PHONE_REGEX` to test if the input is a string matching the US phone number format.
 *
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a valid US phone number.
 */
export const isUSPhone = createTypeGuard((t: unknown) => {
  if (typeof t === "string" && US_PHONE_REGEX.test(t)) {
    return t;
  }
  return null;
});

/**
 * Type guard that checks if the provided value is a valid phone number, either international or US format.
 *
 * Uses both `INT_PHONE_REGEX` and `US_PHONE_REGEX` to test if the input is a string matching either format.
 *
 * @param t - The value to check.
 * @returns Boolean indicating whether the input is a valid phone number.
 */
export const isPhoneNumber = createTypeGuard((t: unknown) => {
  if (typeof t === "string" && (INT_PHONE_REGEX.test(t) || US_PHONE_REGEX.test(t))) {
    return t;
  }
  return null;
});

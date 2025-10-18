/**
 * This module provides type guards for common string patterns.
 */

import type { Brand } from "../brand.ts";
import type { TypeGuard } from "../guard.ts";
import {
  isCommaDelimited as _isCommaDelimited,
  isCommaDelimitedIntegers as _isCommaDelimitedIntegers,
  isCommaDelimitedNumbers as _isCommaDelimitedNumbers,
  isEmail as _isEmail,
  isInternationalPhone as _isInternationalPhone,
  isPeriodDelimited as _isPeriodDelimited,
  isPhoneNumber as _isPhoneNumber,
  isUSPhone as _isUSPhone,
  isUUIDv4 as _isUUIDv4,
} from "./strings.ts";

/**
 * Represents a branded type for an email address.
 * This type ensures that a string is explicitly marked as an "Email"
 * to provide additional type safety and clarity in the codebase.
 */
export type Email = Brand<string, "Email">;

/**
 * Type guard for validating whether a given value is a valid email string. Uses a
 * branded type to ensure type safety and distinguish it from other strings.
 *
 * Uses the `EMAIL_REGEX` to test if the input is a string that matches the email format.
 *
 * @param t - The value to test for email validity.
 * @returns Boolean indicating whether the input is a valid email.
 */
export const isEmail = _isEmail as TypeGuard<Email>;

/**
 * Represents a branded type for an International Phone number.
 * This type ensures that a string is explicitly marked as an "InternationalPhone"
 * to provide additional type safety and clarity in the codebase.
 */
export type InternationalPhone = Brand<string, "InternationalPhone">;

/**
 * Type guard for validating whether a given value is a valid international phone number string.
 * Uses a branded type to ensure type safety and distinguish it from other strings.
 *
 * Uses the `INT_PHONE_REGEX` to test if the input is a string that matches the international phone number format.
 *
 * @param t - The value to test for international phone number validity.
 * @returns Boolean indicating whether the input is a valid international phone number.
 */
export const isInternationalPhone = _isInternationalPhone as TypeGuard<InternationalPhone>;

/**
 * Represents a branded type for a US Phone number.
 * This type ensures that a string is explicitly marked as a "USPhone"
 * to provide additional type safety and clarity in the codebase.
 */
export type USPhone = Brand<string, "USPhone">;

/**
 * Type guard for validating whether a given value is a valid US phone number string.
 * Uses a branded type to ensure type safety and distinguish it from other strings.
 *
 * Uses the `US_PHONE_REGEX` to test if the input is a string that matches the US phone number format.
 *
 * @param t - The value to test for US phone number validity.
 * @returns Boolean indicating whether the input is a valid US phone number.
 */
export const isUSPhone = _isUSPhone as TypeGuard<USPhone>;

/**
 * Represents a branded type for a phone number.
 * This type ensures that a string is explicitly marked as a "PhoneNumber"
 * to provide additional type safety and clarity in the codebase.
 */
export type PhoneNumber = USPhone | InternationalPhone;

/**
 * Type guard for validating whether a given value is a valid phone number string,
 * either in international or US format. Uses a branded type to ensure type safety
 * and distinguish it from other strings.
 *
 * Uses both `INT_PHONE_REGEX` and `US_PHONE_REGEX` to test if the input is a string
 * that matches either format.
 *
 * @param t - The value to test for phone number validity.
 * @returns Boolean indicating whether the input is a valid phone number.
 */
export const isPhoneNumber = _isPhoneNumber as TypeGuard<PhoneNumber>;

/**
 * Represents a branded type for a UUIDv4.
 * This type ensures that a string is explicitly marked as a "UUIDv4"
 * to provide additional type safety and clarity in the codebase.
 */
export type UUIDv4 = Brand<string, "UUIDv4">;

/**
 * Type guard for validating whether a given value is a valid UUIDv4 string.
 * Uses a branded type to ensure type safety and distinguish it from other strings.
 *
 * Uses a regex pattern to test if the input is a string that matches the UUIDv4 format.
 *
 * @param t - The value to test for UUIDv4 validity.
 * @returns Boolean indicating whether the input is a valid UUIDv4.
 */
export const isUUIDv4 = _isUUIDv4 as TypeGuard<UUIDv4>;

/**
 * Represents a branded type for a comma-delimited string.
 * This type ensures that a string is explicitly marked as a "CommaDelimitedString"
 * to provide additional type safety and clarity in the codebase.
 */
export type CommaDelimitedString = Brand<string, "CommaDelimitedString">;

/**
 * Type guard for validating whether a given value is a valid comma-delimited string.
 * Uses a branded type to ensure type safety and distinguish it from other strings.
 *
 * Uses a regex pattern to test if the input is a string that matches the comma-delimited format.
 *
 * @param t - The value to test for comma-delimited string validity.
 * @returns Boolean indicating whether the input is a valid comma-delimited string.
 */
export const isCommaDelimited = _isCommaDelimited as TypeGuard<CommaDelimitedString>;

/**
 * Represents a branded type for a period-delimited string.
 * This type ensures that a string is explicitly marked as a "PeriodDelimitedString"
 * to provide additional type safety and clarity in the codebase.
 */
export type PeriodDelimitedString = Brand<string, "PeriodDelimitedString">;

/**
 * Type guard for validating whether a given value is a valid period-delimited string.
 * Uses a branded type to ensure type safety and distinguish it from other strings.
 *
 * Uses a regex pattern to test if the input is a string that matches the period-delimited format.
 *
 * @param t - The value to test for period-delimited string validity.
 * @returns Boolean indicating whether the input is a valid period-delimited string.
 */
export const isPeriodDelimited = _isPeriodDelimited as TypeGuard<PeriodDelimitedString>;

/**
 * Represents a branded type for a comma-delimited string of integers.
 * This type ensures that a string is explicitly marked as a "CommaDelimitedIntegers"
 * to provide additional type safety and clarity in the codebase.
 */
export type CommaDelimitedIntegers = Brand<string, "CommaDelimitedIntegers">;

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
export const isCommaDelimitedIntegers = _isCommaDelimitedIntegers as TypeGuard<CommaDelimitedIntegers>;

/**
 * Represents a branded type for a comma-delimited string of numbers.
 * This type ensures that a string is explicitly marked as a "CommaDelimitedNumbers"
 * to provide additional type safety and clarity in the codebase.
 */
export type CommaDelimitedNumbers = Brand<string, "CommaDelimitedNumbers">;

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
export const isCommaDelimitedNumbers = _isCommaDelimitedNumbers as TypeGuard<CommaDelimitedNumbers>;

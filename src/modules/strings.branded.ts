/**
 * This module provides type guards for common string patterns.
 */

import type { Brand } from "../brand.ts";
import type { TypeGuard } from "../guard.ts";
import {
  isEmail as _isEmail,
  isInternationalPhone as _isInternationalPhone,
  isPhoneNumber as _isPhoneNumber,
  isUSPhone as _isUSPhone,
} from "./strings.ts";

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

import type { Brand } from "../brand.ts";
import type { TypeGuard } from "../guard.ts";
import { isIpv4 as _isIpv4, isIpv6 as _isIpv6 } from "./http.ts";

/**
 * Represents a branded type for an IPv4 address.
 * This type ensures that a string is explicitly marked as an "IPv4"
 * to provide additional type safety and clarity in the codebase.
 */
export type IPv4 = Brand<string, "IPv4">;

/**
 * Determines if a given string is a valid IPv4 address.
 *
 * This function extends the `isString` validator to include additional checks
 * for IPv4 addresses. It ensures that the input string:
 * - Matches the `ipv4Regex` pattern.
 * - Each octet is between 0 and 255.
 */
export const isIpv4 = _isIpv4 as TypeGuard<IPv4>;

/**
 * Represents a branded type for an IPv6 address.
 * This type ensures that a string is explicitly marked as an "IPv6"
 */
export type IPv6 = Brand<string, "IPv6">;

/**
 * Determines if a given string is a valid IPv6 address.
 *
 * This function extends the `isString` validator to include additional checks
 * for IPv6 addresses. It ensures that the input string:
 * - Has a length of 45 characters or less.
 * - Matches the `ipv6Regex` pattern.
 */
export const isIpv6 = _isIpv6 as TypeGuard<IPv6>;

/**
 * Represents a branded type for an IP address, which can be either
 * an IPv4 or IPv6 address.
 */
export type IPAddress = IPv4 | IPv6;

/**
 * Type guard that checks if a value is either a valid IPv4 or IPv6 address.
 */
export const isIpAddress = isIpv4.or(isIpv6);

export { isNativeURL, isRequest, isResponse } from "./http.ts";

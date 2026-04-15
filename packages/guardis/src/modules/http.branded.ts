import type { Brand, TypeGuard } from "../types.ts";
import {
  isCidr as _isCidr,
  isCidrV4 as _isCidrV4,
  isCidrV6 as _isCidrV6,
  isIpAddress as _isIpAddress,
  isIpv4 as _isIpv4,
  isIpv6 as _isIpv6,
  isIpv6Compressed as _isIpv6Compressed,
  isIpv6Full as _isIpv6Full,
} from "./http.ts";

/**
 * Represents a branded type for an IPv4 address.
 */
export type IPv4 = Brand<string, "IPv4">;

/**
 * Determines if a given string is a valid IPv4 address.
 */
export const isIpv4 = _isIpv4 as TypeGuard<IPv4>;

/**
 * Represents a branded type for a full-form IPv6 address.
 */
export type IPv6Full = Brand<string, "IPv6Full">;

/**
 * Determines if a given string is a valid full-form IPv6 address
 * (exactly 8 hex groups, no :: compression).
 */
export const isIpv6Full = _isIpv6Full as TypeGuard<IPv6Full>;

/**
 * Represents a branded type for a compressed IPv6 address.
 */
export type IPv6Compressed = Brand<string, "IPv6Compressed">;

/**
 * Determines if a given string is a valid compressed IPv6 address
 * (uses :: notation).
 */
export const isIpv6Compressed = _isIpv6Compressed as TypeGuard<IPv6Compressed>;

/**
 * Represents a branded type for any IPv6 address (full or compressed).
 */
export type IPv6 = Brand<string, "IPv6">;

/**
 * Determines if a given string is a valid IPv6 address in either form.
 */
export const isIpv6 = _isIpv6 as TypeGuard<IPv6>;

/**
 * Represents a branded type for an IP address, which can be either
 * an IPv4 or IPv6 address.
 */
export type IPAddress = Brand<string, "IPAddress">;

/**
 * Type guard that checks if a value is either a valid IPv4 or IPv6 address.
 */
export const isIpAddress = _isIpAddress as TypeGuard<IPAddress>;

/**
 * Represents a branded type for an IPv4 CIDR notation string.
 */
export type CIDRv4 = Brand<string, "CIDRv4">;

/**
 * Validates IPv4 CIDR notation strings.
 */
export const isCidrV4 = _isCidrV4 as TypeGuard<CIDRv4>;

/**
 * Represents a branded type for an IPv6 CIDR notation string.
 */
export type CIDRv6 = Brand<string, "CIDRv6">;

/**
 * Validates IPv6 CIDR notation strings.
 */
export const isCidrV6 = _isCidrV6 as TypeGuard<CIDRv6>;

/**
 * Represents a branded type for any CIDR notation string.
 */
export type CIDR = Brand<string, "CIDR">;

/**
 * Validates CIDR notation strings (both IPv4 and IPv6).
 */
export const isCidr = _isCidr as TypeGuard<CIDR>;

export { isNativeURL, isRequest, isResponse } from "./http.ts";

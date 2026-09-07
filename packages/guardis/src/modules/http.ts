/**
 * Type guards for Web platform HTTP types (URL, Request, Response, Headers,
 * Blob, FormData) and IP/CIDR address formats (IPv4, IPv6, and their CIDR
 * notations).
 *
 * See `http.branded.ts` for branded variants of the IP/CIDR guards.
 * @module
 */

import { createTypeGuard } from "../guard.ts";
import { IPV4_REGEX, IPV6_COMPRESSED_REGEX, IPV6_FULL_REGEX } from "../helpers/http.helpers.ts";
import type { TypeGuard } from "../types.ts";

/**
 * Returns true if input is an instance of the native URL
 * class.
 * @param {unknown} t
 * @return {boolean}
 */
export const isNativeURL: TypeGuard<URL> = createTypeGuard(
  "URL",
  (t: unknown) => t instanceof URL ? t : null,
);

/**
 * Returns true if input is an instance of the native Request
 * class.
 * @param {unknown} t
 * @return {boolean}
 */
export const isRequest: TypeGuard<Request> = createTypeGuard(
  "Request",
  (t: unknown) => t instanceof Request ? t : null,
);

/**
 * Returns true if input is an instance of the native Response
 * class.
 * @param {unknown} t
 * @return {boolean}
 */
export const isResponse: TypeGuard<Response> = createTypeGuard(
  "Response",
  (t: unknown) => t instanceof Response ? t : null,
);

/**
 * Returns true if input is an instance of the native Headers class.
 * Completes the Fetch API triad with isRequest and isResponse.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Headers
 */
export const isHeaders: TypeGuard<Headers> = createTypeGuard(
  "Headers",
  (t: unknown) => t instanceof Headers ? t : null,
);

/**
 * Returns true if input is an instance of the native Blob class.
 * Note: File extends Blob, so File instances also pass.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Blob
 */
export const isBlob: TypeGuard<Blob> = createTypeGuard(
  "Blob",
  (t: unknown) => t instanceof Blob ? t : null,
);

/**
 * Returns true if input is an instance of the native FormData class.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FormData
 */
export const isFormData: TypeGuard<FormData> = createTypeGuard(
  "FormData",
  (t: unknown) => t instanceof FormData ? t : null,
);

/**
 * Determines if a given string is a valid IPv4 address.
 *
 * This function extends the `isString` validator to include additional checks
 * for IPv4 addresses. It ensures that the input string:
 * - Matches the `ipv4Regex` pattern.
 * - Each octet is between 0 and 255.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc791 — RFC 791: Internet Protocol
 */
export const isIpv4: TypeGuard<string> = createTypeGuard(
  "IPv4",
  (v) => {
    if (typeof v !== "string" || v.length > 15) return null; // Max IPv4 length is 15 characters

    const match = v.match(IPV4_REGEX);
    if (
      match && match.slice(1).every((octet) => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255 && octet === num.toString();
      })
    ) {
      return v;
    }

    return null;
  },
);

/**
 * Determines if a given string is a valid full-form IPv6 address
 * (exactly 8 hex groups separated by colons, no :: compression).
 *
 * @see https://datatracker.ietf.org/doc/html/rfc4291 — RFC 4291: IP Version 6 Addressing Architecture
 * @example
 * ```typescript
 * isIpv6Full("2001:0db8:85a3:0000:0000:8a2e:0370:7334") // true
 * isIpv6Full("2001:db8::")                                 // false
 * ```
 */
export const isIpv6Full: TypeGuard<string> = createTypeGuard(
  "IPv6 (full)",
  (v) => {
    return typeof v === "string" && v.length <= 39 && IPV6_FULL_REGEX.test(v) ? v : null;
  },
);

/**
 * Determines if a given string is a valid compressed IPv6 address
 * (uses :: notation to omit consecutive all-zero groups).
 *
 * @see https://datatracker.ietf.org/doc/html/rfc4291#section-2.2 — RFC 4291 Section 2.2: Text Representation of Addresses
 * @example
 * ```typescript
 * isIpv6Compressed("2001:db8::")    // true
 * isIpv6Compressed("::1")           // true
 * isIpv6Compressed("fe80::1")       // true
 * isIpv6Compressed("::")            // true
 * ```
 */
export const isIpv6Compressed: TypeGuard<string> = createTypeGuard(
  "IPv6 (compressed)",
  (v) => {
    return typeof v === "string" && v.length <= 45 && IPV6_COMPRESSED_REGEX.test(v) ? v : null;
  },
);

/**
 * Determines if a given string is a valid IPv6 address in either
 * full form or compressed (::) notation.
 */
export const isIpv6: TypeGuard<string> = isIpv6Full.or(isIpv6Compressed);
isIpv6._.name = "IPv6";

/**
 * Type guard that checks if a given string is either a valid IPv4 or IPv6 address.
 * Combines the `isIpv4` and `isIpv6` type guards using a logical OR operation.
 */
export const isIpAddress: TypeGuard<string> = isIpv4.or(isIpv6);

/** Regex for IPv4 CIDR notation: dotted-quad followed by /prefix */
const CIDR_V4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;

/**
 * Validates IPv4 CIDR notation strings (e.g. 192.168.1.0/24).
 * Prefix length must be 0–32.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc4632 — RFC 4632: CIDR: The Internet Address Assignment and Aggregation Plan
 */
export const isCidrV4: TypeGuard<string> = createTypeGuard(
  "CIDR (IPv4)",
  (v) => {
    if (typeof v !== "string") return null;
    const match = v.match(CIDR_V4_REGEX);
    if (!match) return null;
    const prefix = parseInt(match[5], 10);
    if (prefix > 32) return null;
    const valid = match.slice(1, 5).every((o) => {
      const n = parseInt(o, 10);
      return n >= 0 && n <= 255 && o === n.toString();
    });
    return valid ? v : null;
  },
);

/**
 * Validates IPv6 CIDR notation strings (e.g. 2001:db8::/32).
 * Prefix length must be 0–128. Accepts both full and compressed IPv6.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc4291#section-2.3 — RFC 4291 Section 2.3: Text Representation of Address Prefixes
 */
export const isCidrV6: TypeGuard<string> = createTypeGuard(
  "CIDR (IPv6)",
  (v) => {
    if (typeof v !== "string") return null;
    const slashIdx = v.lastIndexOf("/");
    if (slashIdx === -1) return null;
    const prefixStr = v.substring(slashIdx + 1);
    if (!/^\d{1,3}$/.test(prefixStr)) return null;
    const prefix = parseInt(prefixStr, 10);
    if (prefix > 128) return null;
    return isIpv6(v.substring(0, slashIdx)) ? v : null;
  },
);

/**
 * Validates CIDR notation strings (both IPv4 and IPv6).
 *
 * @example
 * ```typescript
 * isCidr("192.168.1.0/24")   // true
 * isCidr("2001:db8::/32")    // true
 * isCidr("192.168.1.0")      // false (no prefix length)
 * isCidr("192.168.1.0/33")   // false (invalid prefix)
 * ```
 */
export const isCidr: TypeGuard<string> = isCidrV4.or(isCidrV6);
isCidr._.name = "CIDR";

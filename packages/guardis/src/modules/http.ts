import { createTypeGuard } from "../guard.ts";
import { IPV4_REGEX, IPV6_REGEX } from "../helpers/http.helpers.ts";
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
 * Determines if a given string is a valid IPv4 address.
 *
 * This function extends the `isString` validator to include additional checks
 * for IPv4 addresses. It ensures that the input string:
 * - Matches the `ipv4Regex` pattern.
 * - Each octet is between 0 and 255.
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
 * Determines if a given string is a valid IPv6 address.
 *
 * This function extends the `isString` validator to include additional checks
 * for IPv6 addresses. It ensures that the input string:
 * - Has a length of 45 characters or less.
 * - Matches the `ipv6Regex` pattern.
 */
export const isIpv6: TypeGuard<string> = createTypeGuard(
  "IPv6",
  (v) => {
    return typeof v === "string" && v.length <= 45 && IPV6_REGEX.test(v) ? v : null;
  },
);

/**
 * Type guard that checks if a given string is either a valid IPv4 or IPv6 address.
 * Combines the `isIpv4` and `isIpv6` type guards using a logical OR operation.
 */
export const isIpAddress: TypeGuard<string> = isIpv4.or(isIpv6);

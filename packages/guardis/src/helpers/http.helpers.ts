export const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Matches full-form IPv6: exactly 8 hex groups separated by colons */
export const IPV6_FULL_REGEX = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

/**
 * Matches compressed IPv6 using :: notation. Covers all three positions:
 * - Leading:  ::1, ::ffff:1234:5678
 * - Middle:   2001:db8::8a2e:370:7334
 * - Trailing: 2001:db8::, fe80::
 * - Bare:     ::
 */
export const IPV6_COMPRESSED_REGEX =
  /^([0-9a-fA-F]{1,4}:)+:([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:)+:$|^::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^::$/;

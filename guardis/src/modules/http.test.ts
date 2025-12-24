import { assert, assertFalse, assertThrows } from "@std/assert";
import { isIpv4, isIpv6, isNativeURL, isRequest, isResponse } from "./http.ts";

// Standard test values for consistency across all type guard tests
const TEST_VALUES = {
  // HTTP-specific values
  url: new URL("https://example.com"),
  request: new Request("https://example.com"),
  response: new Response("Hello, world!"),

  // IP address values
  ipv4Valid: "192.168.1.1",
  ipv4Localhost: "127.0.0.1",
  ipv4Zero: "0.0.0.0",
  ipv4Max: "255.255.255.255",
  ipv6Valid: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
  ipv6Localhost: "::1",
  ipv6AllZeros: "::",
  ipv6Full: "2001:db8:0:0:1:0:0:1",

  // Common primitive values
  string: "test",
  urlString: "https://example.com",
  emptyString: "",
  number: 42,
  zero: 0,
  boolean: true,
  booleanFalse: false,
  nullValue: null,
  undefinedValue: undefined,

  // Complex values
  object: { a: 1, b: "test" },
  array: [1, 2, 3],
  function: () => {},
} as const;

Deno.test("isNativeURL", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isNativeURL(TEST_VALUES.url));
    assert(isNativeURL(new URL("https://google.com")));
    assert(isNativeURL(new URL("file:///path/to/file")));

    // Invalid inputs
    assertFalse(isNativeURL(TEST_VALUES.urlString));
    assertFalse(isNativeURL(TEST_VALUES.string));
    assertFalse(isNativeURL(TEST_VALUES.number));
    assertFalse(isNativeURL(TEST_VALUES.boolean));
    assertFalse(isNativeURL(TEST_VALUES.nullValue));
    assertFalse(isNativeURL(TEST_VALUES.undefinedValue));
    assertFalse(isNativeURL(TEST_VALUES.object));
    assertFalse(isNativeURL(TEST_VALUES.array));
    assertFalse(isNativeURL(TEST_VALUES.function));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isNativeURL.strict(TEST_VALUES.url);
    isNativeURL.strict(new URL("https://google.com"));

    // Invalid inputs throw
    assertThrows(() => isNativeURL.strict(TEST_VALUES.urlString));
    assertThrows(() => isNativeURL.strict(TEST_VALUES.string));
    assertThrows(() => isNativeURL.strict(TEST_VALUES.number));
    assertThrows(() => isNativeURL.strict(TEST_VALUES.nullValue));
    assertThrows(() => isNativeURL.strict(TEST_VALUES.undefinedValue));
  });

  await t.step("assert mode", () => {
    const assertIsNativeURL: typeof isNativeURL.assert = isNativeURL.assert;

    // Valid inputs don't throw
    assertIsNativeURL(TEST_VALUES.url);
    assertIsNativeURL(new URL("https://google.com"));

    // Invalid inputs throw
    assertThrows(() => assertIsNativeURL(TEST_VALUES.urlString));
    assertThrows(() => assertIsNativeURL(TEST_VALUES.string));
    assertThrows(() => assertIsNativeURL(TEST_VALUES.number));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isNativeURL.optional(TEST_VALUES.url));
    assert(isNativeURL.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isNativeURL.optional(TEST_VALUES.urlString));
    assertFalse(isNativeURL.optional(TEST_VALUES.nullValue));
    assertFalse(isNativeURL.optional(TEST_VALUES.string));
  });
});

Deno.test("isRequest", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isRequest(TEST_VALUES.request));
    assert(isRequest(new Request("https://google.com")));
    assert(isRequest(new Request("https://example.com", { method: "POST" })));

    // Invalid inputs
    assertFalse(isRequest(TEST_VALUES.urlString));
    assertFalse(isRequest(TEST_VALUES.url));
    assertFalse(isRequest(TEST_VALUES.response));
    assertFalse(isRequest(TEST_VALUES.string));
    assertFalse(isRequest(TEST_VALUES.number));
    assertFalse(isRequest(TEST_VALUES.boolean));
    assertFalse(isRequest(TEST_VALUES.nullValue));
    assertFalse(isRequest(TEST_VALUES.undefinedValue));
    assertFalse(isRequest(TEST_VALUES.object));
    assertFalse(isRequest(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isRequest.strict(TEST_VALUES.request);
    isRequest.strict(new Request("https://google.com"));

    // Invalid inputs throw
    assertThrows(() => isRequest.strict(TEST_VALUES.urlString));
    assertThrows(() => isRequest.strict(TEST_VALUES.url));
    assertThrows(() => isRequest.strict(TEST_VALUES.response));
    assertThrows(() => isRequest.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const assertIsRequest: typeof isRequest.assert = isRequest.assert;

    // Valid inputs don't throw
    assertIsRequest(TEST_VALUES.request);
    assertIsRequest(new Request("https://google.com"));

    // Invalid inputs throw
    assertThrows(() => assertIsRequest(TEST_VALUES.urlString));
    assertThrows(() => assertIsRequest(TEST_VALUES.url));
    assertThrows(() => assertIsRequest(TEST_VALUES.response));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isRequest.optional(TEST_VALUES.request));
    assert(isRequest.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isRequest.optional(TEST_VALUES.urlString));
    assertFalse(isRequest.optional(TEST_VALUES.url));
    assertFalse(isRequest.optional(TEST_VALUES.nullValue));
  });
});

Deno.test("isResponse", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isResponse(TEST_VALUES.response));
    assert(isResponse(new Response("Different content")));
    assert(isResponse(new Response(null, { status: 404 })));

    // Invalid inputs
    assertFalse(isResponse("Hello, world!"));
    assertFalse(isResponse(TEST_VALUES.request));
    assertFalse(isResponse(TEST_VALUES.url));
    assertFalse(isResponse(TEST_VALUES.string));
    assertFalse(isResponse(TEST_VALUES.number));
    assertFalse(isResponse(TEST_VALUES.boolean));
    assertFalse(isResponse(TEST_VALUES.nullValue));
    assertFalse(isResponse(TEST_VALUES.undefinedValue));
    assertFalse(isResponse(TEST_VALUES.object));
    assertFalse(isResponse(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isResponse.strict(TEST_VALUES.response);
    isResponse.strict(new Response("Different content"));

    // Invalid inputs throw
    assertThrows(() => isResponse.strict("Hello, world!"));
    assertThrows(() => isResponse.strict(TEST_VALUES.request));
    assertThrows(() => isResponse.strict(TEST_VALUES.url));
    assertThrows(() => isResponse.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const assertIsResponse: typeof isResponse.assert = isResponse.assert;

    // Valid inputs don't throw
    assertIsResponse(TEST_VALUES.response);
    assertIsResponse(new Response("Different content"));

    // Invalid inputs throw
    assertThrows(() => assertIsResponse("Hello, world!"));
    assertThrows(() => assertIsResponse(TEST_VALUES.request));
    assertThrows(() => assertIsResponse(TEST_VALUES.url));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isResponse.optional(TEST_VALUES.response));
    assert(isResponse.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isResponse.optional("Hello, world!"));
    assertFalse(isResponse.optional(TEST_VALUES.request));
    assertFalse(isResponse.optional(TEST_VALUES.nullValue));
  });
});

Deno.test("isIpv4", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isIpv4(TEST_VALUES.ipv4Valid));
    assert(isIpv4(TEST_VALUES.ipv4Localhost));
    assert(isIpv4(TEST_VALUES.ipv4Zero));
    assert(isIpv4(TEST_VALUES.ipv4Max));
    assert(isIpv4("10.0.0.1"));
    assert(isIpv4("172.16.0.1"));
    assert(isIpv4("1.2.3.4"));

    // Invalid IPv4 addresses
    assertFalse(isIpv4("256.1.1.1")); // Octet > 255
    assertFalse(isIpv4("1.256.1.1")); // Octet > 255
    assertFalse(isIpv4("1.1.1.256")); // Octet > 255
    assertFalse(isIpv4("1.1.1")); // Too few octets
    assertFalse(isIpv4("1.1.1.1.1")); // Too many octets
    assertFalse(isIpv4("abc.def.ghi.jkl")); // Non-numeric
    assertFalse(isIpv4("1.1.1.-1")); // Negative number
    assertFalse(isIpv4("01.1.1.1")); // Leading zeros (invalid per implementation)
    assertFalse(isIpv4("1.01.1.1")); // Leading zeros
    assertFalse(isIpv4("1.1.1.1 ")); // Trailing space
    assertFalse(isIpv4(" 1.1.1.1")); // Leading space
    assertFalse(isIpv4("1..1.1.1")); // Double dot
    assertFalse(isIpv4(".1.1.1.1")); // Leading dot
    assertFalse(isIpv4("1.1.1.1.")); // Trailing dot

    // Invalid types
    assertFalse(isIpv4(TEST_VALUES.number));
    assertFalse(isIpv4(TEST_VALUES.boolean));
    assertFalse(isIpv4(TEST_VALUES.nullValue));
    assertFalse(isIpv4(TEST_VALUES.undefinedValue));
    assertFalse(isIpv4(TEST_VALUES.object));
    assertFalse(isIpv4(TEST_VALUES.array));
    assertFalse(isIpv4(TEST_VALUES.function));
    assertFalse(isIpv4(TEST_VALUES.url));
    assertFalse(isIpv4(TEST_VALUES.emptyString));

    // IPv6 addresses should not be valid for IPv4
    assertFalse(isIpv4(TEST_VALUES.ipv6Valid));
    assertFalse(isIpv4(TEST_VALUES.ipv6Localhost));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isIpv4.strict(TEST_VALUES.ipv4Valid);
    isIpv4.strict(TEST_VALUES.ipv4Localhost);
    isIpv4.strict(TEST_VALUES.ipv4Max);

    // Invalid inputs throw
    assertThrows(() => isIpv4.strict("256.1.1.1"));
    assertThrows(() => isIpv4.strict("1.1.1"));
    assertThrows(() => isIpv4.strict(TEST_VALUES.string));
    assertThrows(() => isIpv4.strict(TEST_VALUES.number));
    assertThrows(() => isIpv4.strict(TEST_VALUES.nullValue));
    assertThrows(() => isIpv4.strict(TEST_VALUES.undefinedValue));
  });

  await t.step("assert mode", () => {
    const assertIsIpv4: typeof isIpv4.assert = isIpv4.assert;

    // Valid inputs don't throw
    assertIsIpv4(TEST_VALUES.ipv4Valid);
    assertIsIpv4(TEST_VALUES.ipv4Localhost);
    assertIsIpv4(TEST_VALUES.ipv4Max);

    // Invalid inputs throw
    assertThrows(() => assertIsIpv4("256.1.1.1"));
    assertThrows(() => assertIsIpv4("1.1.1"));
    assertThrows(() => assertIsIpv4(TEST_VALUES.string));
    assertThrows(() => assertIsIpv4(TEST_VALUES.number));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isIpv4.optional(TEST_VALUES.ipv4Valid));
    assert(isIpv4.optional(TEST_VALUES.ipv4Localhost));
    assert(isIpv4.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isIpv4.optional("256.1.1.1"));
    assertFalse(isIpv4.optional(TEST_VALUES.string));
    assertFalse(isIpv4.optional(TEST_VALUES.nullValue));
  });
});

Deno.test("isIpv6", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs (note: current regex is restrictive and only accepts full format, ::1, and ::)
    assert(isIpv6(TEST_VALUES.ipv6Valid));
    assert(isIpv6(TEST_VALUES.ipv6Localhost));
    assert(isIpv6(TEST_VALUES.ipv6AllZeros));
    assert(isIpv6(TEST_VALUES.ipv6Full));
    assert(isIpv6("2001:0db8:0000:0000:0000:ff00:0042:8329"));

    // Invalid IPv6 addresses - compressed formats not supported by current regex
    assertFalse(isIpv6("fe80::1")); // Compressed format
    assertFalse(isIpv6("2001:db8::1")); // Compressed format
    assertFalse(isIpv6("fe80::")); // Compressed format
    assertFalse(isIpv6("::ffff:192.0.2.1")); // IPv4-mapped IPv6

    // Invalid IPv6 addresses - malformed
    assertFalse(isIpv6("gggg::1")); // Invalid hex
    assertFalse(isIpv6(":::")); // Too many colons
    assertFalse(isIpv6("2001:db8::1::2")); // Multiple ::
    assertFalse(isIpv6("02001:db8::1")); // Group too long
    assertFalse(isIpv6("2001:db8:85a3::8a2e:370k:7334")); // Invalid character 'k'

    // String longer than 45 characters
    assertFalse(isIpv6("2001:0db8:85a3:0000:0000:8a2e:0370:7334:extra"));

    // Invalid types
    assertFalse(isIpv6(TEST_VALUES.number));
    assertFalse(isIpv6(TEST_VALUES.boolean));
    assertFalse(isIpv6(TEST_VALUES.nullValue));
    assertFalse(isIpv6(TEST_VALUES.undefinedValue));
    assertFalse(isIpv6(TEST_VALUES.object));
    assertFalse(isIpv6(TEST_VALUES.array));
    assertFalse(isIpv6(TEST_VALUES.function));
    assertFalse(isIpv6(TEST_VALUES.url));
    assertFalse(isIpv6(TEST_VALUES.emptyString));
    assertFalse(isIpv6(TEST_VALUES.string));

    // IPv4 addresses should not be valid for IPv6
    assertFalse(isIpv6(TEST_VALUES.ipv4Valid));
    assertFalse(isIpv6(TEST_VALUES.ipv4Localhost));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isIpv6.strict(TEST_VALUES.ipv6Valid);
    isIpv6.strict(TEST_VALUES.ipv6Localhost);
    isIpv6.strict(TEST_VALUES.ipv6AllZeros);

    // Invalid inputs throw
    assertThrows(() => isIpv6.strict("fe80::1"));
    assertThrows(() => isIpv6.strict("gggg::1"));
    assertThrows(() => isIpv6.strict(":::"));
    assertThrows(() => isIpv6.strict(TEST_VALUES.string));
    assertThrows(() => isIpv6.strict(TEST_VALUES.number));
    assertThrows(() => isIpv6.strict(TEST_VALUES.nullValue));
    assertThrows(() => isIpv6.strict(TEST_VALUES.undefinedValue));
  });

  await t.step("assert mode", () => {
    const assertIsIpv6: typeof isIpv6.assert = isIpv6.assert;

    // Valid inputs don't throw
    assertIsIpv6(TEST_VALUES.ipv6Valid);
    assertIsIpv6(TEST_VALUES.ipv6Localhost);
    assertIsIpv6(TEST_VALUES.ipv6AllZeros);

    // Invalid inputs throw
    assertThrows(() => assertIsIpv6("fe80::1"));
    assertThrows(() => assertIsIpv6("gggg::1"));
    assertThrows(() => assertIsIpv6(":::"));
    assertThrows(() => assertIsIpv6(TEST_VALUES.string));
    assertThrows(() => assertIsIpv6(TEST_VALUES.number));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isIpv6.optional(TEST_VALUES.ipv6Valid));
    assert(isIpv6.optional(TEST_VALUES.ipv6Localhost));
    assert(isIpv6.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isIpv6.optional("fe80::1"));
    assertFalse(isIpv6.optional("gggg::1"));
    assertFalse(isIpv6.optional(TEST_VALUES.string));
    assertFalse(isIpv6.optional(TEST_VALUES.nullValue));
  });
});

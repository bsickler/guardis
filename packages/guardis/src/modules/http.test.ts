import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import {
  isBlob,
  isCidr,
  isCidrV4,
  isCidrV6,
  isFormData,
  isHeaders,
  isIpv4,
  isIpv6,
  isIpv6Compressed,
  isIpv6Full,
  isNativeURL,
  isRequest,
  isResponse,
} from "./http.ts";

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

  await t.step("validate method", () => {
    const url = new URL("https://example.com");
    // Valid inputs return value
    assertEquals(isNativeURL.validate(url), { value: url });

    // Invalid inputs return issues with specific error message
    assertEquals(isNativeURL.validate("https://example.com"), {
      issues: [{ message: "Expected URL. Received: 'https://example.com'" }],
    });
    assertEquals(isNativeURL.validate(null), {
      issues: [{ message: "Expected URL. Received: null" }],
    });
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

  await t.step("validate method", () => {
    const request = new Request("https://example.com");
    // Valid inputs return value
    assertEquals(isRequest.validate(request), { value: request });

    // Invalid inputs return issues with specific error message
    assertEquals(isRequest.validate("https://example.com"), {
      issues: [{ message: "Expected Request. Received: 'https://example.com'" }],
    });
    assertEquals(isRequest.validate(null), {
      issues: [{ message: "Expected Request. Received: null" }],
    });
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

  await t.step("validate method", () => {
    const response = new Response("Hello");
    // Valid inputs return value
    assertEquals(isResponse.validate(response), { value: response });

    // Invalid inputs return issues with specific error message
    assertEquals(isResponse.validate("Hello, world!"), {
      issues: [{ message: "Expected Response. Received: 'Hello, world!'" }],
    });
    assertEquals(isResponse.validate(null), {
      issues: [{ message: "Expected Response. Received: null" }],
    });
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

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isIpv4.validate("192.168.1.1"), { value: "192.168.1.1" });
    assertEquals(isIpv4.validate("127.0.0.1"), { value: "127.0.0.1" });

    // Invalid inputs return issues with specific error message
    assertEquals(isIpv4.validate("256.1.1.1"), {
      issues: [{ message: "Expected IPv4. Received: '256.1.1.1'" }],
    });
    assertEquals(isIpv4.validate("not-an-ip"), {
      issues: [{ message: "Expected IPv4. Received: 'not-an-ip'" }],
    });
    assertEquals(isIpv4.validate(null), {
      issues: [{ message: "Expected IPv4. Received: null" }],
    });
  });
});

Deno.test("isIpv6Full", async (t) => {
  await t.step("accepts valid full-form IPv6", () => {
    assert(isIpv6Full(TEST_VALUES.ipv6Valid));
    assert(isIpv6Full(TEST_VALUES.ipv6Full));
    assert(isIpv6Full("2001:0db8:0000:0000:0000:ff00:0042:8329"));
  });

  await t.step("rejects compressed forms", () => {
    assertFalse(isIpv6Full("::1"));
    assertFalse(isIpv6Full("::"));
    assertFalse(isIpv6Full("fe80::1"));
    assertFalse(isIpv6Full("2001:db8::"));
  });

  await t.step("rejects malformed addresses", () => {
    assertFalse(isIpv6Full("1:2:3:4:5:6:7:8:9")); // 9 groups
    assertFalse(isIpv6Full("1:2:3:4:5:6:7:8:")); // trailing single colon
    assertFalse(isIpv6Full(":1:2:3:4:5:6:7:8")); // leading single colon
    assertFalse(isIpv6Full("gggg:0000:0000:0000:0000:0000:0000:0001")); // invalid hex
    assertFalse(isIpv6Full("02001:db8:0:0:0:0:0:1")); // group too long
    assertFalse(isIpv6Full("")); // empty
    assertFalse(isIpv6Full(TEST_VALUES.number));
    assertFalse(isIpv6Full(TEST_VALUES.nullValue));
    assertFalse(isIpv6Full(TEST_VALUES.ipv4Valid));
  });

  await t.step("validate method", () => {
    assertEquals(isIpv6Full.validate("2001:0db8:85a3:0000:0000:8a2e:0370:7334"), {
      value: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
    });
    assertEquals(isIpv6Full.validate("::1"), {
      issues: [{ message: "Expected IPv6 (full). Received: '::1'" }],
    });
  });
});

Deno.test("isIpv6Compressed", async (t) => {
  await t.step("accepts leading ::", () => {
    assert(isIpv6Compressed("::1"));
    assert(isIpv6Compressed("::ffff:1234:5678"));
  });

  await t.step("accepts middle ::", () => {
    assert(isIpv6Compressed("fe80::1"));
    assert(isIpv6Compressed("2001:db8::8a2e:370:7334"));
  });

  await t.step("accepts trailing ::", () => {
    assert(isIpv6Compressed("fe80::"));
    assert(isIpv6Compressed("2001:db8::"));
  });

  await t.step("accepts bare ::", () => {
    assert(isIpv6Compressed("::"));
  });

  await t.step("rejects full-form addresses", () => {
    assertFalse(isIpv6Compressed("2001:0db8:85a3:0000:0000:8a2e:0370:7334"));
  });

  await t.step("rejects malformed addresses", () => {
    assertFalse(isIpv6Compressed("gggg::1")); // invalid hex
    assertFalse(isIpv6Compressed(":::")); // triple colon
    assertFalse(isIpv6Compressed("2001:db8::1::2")); // multiple ::
    assertFalse(isIpv6Compressed("02001:db8::1")); // group too long
    assertFalse(isIpv6Compressed("::ffff:192.0.2.1")); // IPv4-mapped
    assertFalse(isIpv6Compressed("")); // empty
    assertFalse(isIpv6Compressed(TEST_VALUES.number));
    assertFalse(isIpv6Compressed(TEST_VALUES.nullValue));
    assertFalse(isIpv6Compressed(TEST_VALUES.ipv4Valid));
  });

  await t.step("validate method", () => {
    assertEquals(isIpv6Compressed.validate("::1"), { value: "::1" });
    assertEquals(isIpv6Compressed.validate("2001:db8::"), { value: "2001:db8::" });
    assertEquals(isIpv6Compressed.validate("not-an-ip"), {
      issues: [{ message: "Expected IPv6 (compressed). Received: 'not-an-ip'" }],
    });
  });
});

Deno.test("isIpv6 (composite)", async (t) => {
  await t.step("accepts both full and compressed forms", () => {
    // Full form
    assert(isIpv6(TEST_VALUES.ipv6Valid));
    assert(isIpv6(TEST_VALUES.ipv6Full));
    assert(isIpv6("2001:0db8:0000:0000:0000:ff00:0042:8329"));

    // Compressed forms
    assert(isIpv6(TEST_VALUES.ipv6Localhost)); // ::1
    assert(isIpv6(TEST_VALUES.ipv6AllZeros)); // ::
    assert(isIpv6("fe80::1"));
    assert(isIpv6("2001:db8::1"));
    assert(isIpv6("fe80::"));
    assert(isIpv6("2001:db8::"));
  });

  await t.step("rejects invalid addresses", () => {
    assertFalse(isIpv6("::ffff:192.0.2.1")); // IPv4-mapped
    assertFalse(isIpv6("gggg::1"));
    assertFalse(isIpv6(":::"));
    assertFalse(isIpv6("2001:db8::1::2"));
    assertFalse(isIpv6("1:2:3:4:5:6:7:8:9"));
    assertFalse(isIpv6("1:2:3:4:5:6:7:8:"));
    assertFalse(isIpv6(":1:2:3:4:5:6:7:8"));
    assertFalse(isIpv6(TEST_VALUES.number));
    assertFalse(isIpv6(TEST_VALUES.nullValue));
    assertFalse(isIpv6(TEST_VALUES.undefinedValue));
    assertFalse(isIpv6(TEST_VALUES.ipv4Valid));
    assertFalse(isIpv6(TEST_VALUES.string));
    assertFalse(isIpv6(TEST_VALUES.emptyString));
  });

  await t.step("strict mode", () => {
    isIpv6.strict(TEST_VALUES.ipv6Valid);
    isIpv6.strict("fe80::1");
    isIpv6.strict("2001:db8::");

    assertThrows(() => isIpv6.strict("gggg::1"));
    assertThrows(() => isIpv6.strict(TEST_VALUES.string));
    assertThrows(() => isIpv6.strict(TEST_VALUES.nullValue));
  });

  await t.step("optional mode", () => {
    assert(isIpv6.optional(TEST_VALUES.ipv6Valid));
    assert(isIpv6.optional("fe80::1"));
    assert(isIpv6.optional(TEST_VALUES.undefinedValue));

    assertFalse(isIpv6.optional("gggg::1"));
    assertFalse(isIpv6.optional(TEST_VALUES.nullValue));
  });

  await t.step("validate method", () => {
    assertEquals(isIpv6.validate("2001:0db8:85a3:0000:0000:8a2e:0370:7334"), {
      value: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
    });
    assertEquals(isIpv6.validate("::1"), { value: "::1" });
    assertEquals(isIpv6.validate("2001:db8::"), { value: "2001:db8::" });
  });

  await t.step("has correct name", () => {
    assertEquals(isIpv6._.name, "IPv6");
  });
});

Deno.test("isCidrV4", async (t) => {
  await t.step("accepts valid IPv4 CIDR", () => {
    assert(isCidrV4("192.168.1.0/24"));
    assert(isCidrV4("10.0.0.0/8"));
    assert(isCidrV4("172.16.0.0/12"));
    assert(isCidrV4("0.0.0.0/0"));
    assert(isCidrV4("255.255.255.255/32"));
  });

  await t.step("rejects IPv6 CIDR", () => {
    assertFalse(isCidrV4("2001:db8::/32"));
    assertFalse(isCidrV4("::1/128"));
    assertFalse(isCidrV4("::/0"));
  });

  await t.step("rejects invalid input", () => {
    assertFalse(isCidrV4("192.168.1.0")); // no prefix
    assertFalse(isCidrV4("192.168.1.0/33")); // prefix too large
    assertFalse(isCidrV4("256.1.1.1/24")); // invalid octet
    assertFalse(isCidrV4("192.168.1.0/")); // missing prefix
    assertFalse(isCidrV4("/24")); // missing IP
    assertFalse(isCidrV4("not-a-cidr"));
    assertFalse(isCidrV4(123));
    assertFalse(isCidrV4(null));
  });

  await t.step("validate method", () => {
    assertEquals(isCidrV4.validate("192.168.1.0/24"), { value: "192.168.1.0/24" });
    assertEquals(isCidrV4.validate("2001:db8::/32"), {
      issues: [{ message: "Expected CIDR (IPv4). Received: '2001:db8::/32'" }],
    });
    assertEquals(isCidrV4.validate(null), {
      issues: [{ message: "Expected CIDR (IPv4). Received: null" }],
    });
  });
});

Deno.test("isCidrV6", async (t) => {
  await t.step("accepts valid IPv6 CIDR", () => {
    assert(isCidrV6("2001:db8::/32"));
    assert(isCidrV6("::1/128"));
    assert(isCidrV6("::/0"));
    assert(isCidrV6("fe80::/10"));
    assert(isCidrV6("2001:0db8:85a3:0000:0000:8a2e:0370:7334/64"));
  });

  await t.step("rejects IPv4 CIDR", () => {
    assertFalse(isCidrV6("192.168.1.0/24"));
    assertFalse(isCidrV6("10.0.0.0/8"));
  });

  await t.step("rejects invalid input", () => {
    assertFalse(isCidrV6("::1/129")); // prefix too large
    assertFalse(isCidrV6("::1")); // no prefix
    assertFalse(isCidrV6("not-a-cidr"));
    assertFalse(isCidrV6(123));
    assertFalse(isCidrV6(null));
  });

  await t.step("validate method", () => {
    assertEquals(isCidrV6.validate("2001:db8::/32"), { value: "2001:db8::/32" });
    assertEquals(isCidrV6.validate("192.168.1.0/24"), {
      issues: [{ message: "Expected CIDR (IPv6). Received: '192.168.1.0/24'" }],
    });
    assertEquals(isCidrV6.validate(null), {
      issues: [{ message: "Expected CIDR (IPv6). Received: null" }],
    });
  });
});

Deno.test("isCidr (composite)", async (t) => {
  await t.step("accepts both IPv4 and IPv6 CIDR", () => {
    assert(isCidr("192.168.1.0/24"));
    assert(isCidr("10.0.0.0/8"));
    assert(isCidr("2001:db8::/32"));
    assert(isCidr("::1/128"));
    assert(isCidr("::/0"));
  });

  await t.step("rejects invalid input", () => {
    assertFalse(isCidr("192.168.1.0")); // no prefix
    assertFalse(isCidr("192.168.1.0/33")); // IPv4 prefix too large
    assertFalse(isCidr("::1/129")); // IPv6 prefix too large
    assertFalse(isCidr("256.1.1.1/24")); // invalid octet
    assertFalse(isCidr("not-a-cidr"));
    assertFalse(isCidr(""));
    assertFalse(isCidr(123));
    assertFalse(isCidr(null));
    assertFalse(isCidr(undefined));
  });

  await t.step("strict mode", () => {
    isCidr.strict("192.168.1.0/24");
    isCidr.strict("2001:db8::/32");

    assertThrows(() => isCidr.strict("192.168.1.0"));
    assertThrows(() => isCidr.strict("not-a-cidr"));
    assertThrows(() => isCidr.strict(null));
  });

  await t.step("optional mode", () => {
    assert(isCidr.optional("192.168.1.0/24"));
    assert(isCidr.optional(TEST_VALUES.undefinedValue));

    assertFalse(isCidr.optional(TEST_VALUES.nullValue));
    assertFalse(isCidr.optional("not-a-cidr"));
  });

  await t.step("has correct name", () => {
    assertEquals(isCidr._.name, "CIDR");
  });
});

Deno.test("isHeaders", async (t) => {
  await t.step("accepts Headers instances", () => {
    assert(isHeaders(new Headers()));
    assert(isHeaders(new Headers({ "Content-Type": "application/json" })));
  });

  await t.step("rejects non-Headers values", () => {
    assertFalse(isHeaders({}));
    assertFalse(isHeaders({ "Content-Type": "application/json" }));
    assertFalse(isHeaders(new Map()));
    assertFalse(isHeaders("headers"));
    assertFalse(isHeaders(null));
    assertFalse(isHeaders(undefined));
  });

  await t.step("supports the full guard API", () => {
    isHeaders.strict(new Headers());
    assertThrows(() => isHeaders.strict({}));
    assert(isHeaders.optional(undefined));
    assertFalse(isHeaders.optional({}));
    assertEquals(isHeaders.validate({}), {
      issues: [{ message: "Expected Headers. Received: {}" }],
    });
  });
});

Deno.test("isBlob", async (t) => {
  await t.step("accepts Blob instances", () => {
    assert(isBlob(new Blob(["hello"])));
    assert(isBlob(new Blob([], { type: "image/png" })));
  });

  await t.step("accepts File instances (File extends Blob)", () => {
    assert(isBlob(new File([""], "test.txt")));
  });

  await t.step("rejects non-Blob values", () => {
    assertFalse(isBlob({}));
    assertFalse(isBlob("not a blob"));
    assertFalse(isBlob(new ArrayBuffer(8)));
    assertFalse(isBlob(null));
    assertFalse(isBlob(undefined));
  });

  await t.step("supports the full guard API", () => {
    isBlob.strict(new Blob(["x"]));
    assertThrows(() => isBlob.strict("not a blob"));
    assert(isBlob.optional(undefined));
    assertFalse(isBlob.optional({}));
  });
});

Deno.test("isFormData", async (t) => {
  await t.step("accepts FormData instances", () => {
    assert(isFormData(new FormData()));
    const fd = new FormData();
    fd.append("key", "value");
    assert(isFormData(fd));
  });

  await t.step("rejects non-FormData values", () => {
    assertFalse(isFormData({}));
    assertFalse(isFormData(new URLSearchParams()));
    assertFalse(isFormData(new Map()));
    assertFalse(isFormData("formdata"));
    assertFalse(isFormData(null));
    assertFalse(isFormData(undefined));
  });

  await t.step("supports the full guard API", () => {
    isFormData.strict(new FormData());
    assertThrows(() => isFormData.strict({}));
    assert(isFormData.optional(undefined));
    assertFalse(isFormData.optional({}));
  });
});

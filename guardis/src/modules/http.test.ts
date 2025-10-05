import { assert, assertFalse, assertThrows } from "@std/assert";
import { isNativeURL, isRequest, isResponse } from "./http.ts";

// Standard test values for consistency across all type guard tests
const TEST_VALUES = {
  // HTTP-specific values
  url: new URL("https://example.com"),
  request: new Request("https://example.com"),
  response: new Response("Hello, world!"),

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

  await t.step("notEmpty mode", () => {
    // Valid inputs (URL objects are never considered empty)
    assert(isNativeURL.notEmpty(TEST_VALUES.url));
    assert(isNativeURL.notEmpty(new URL("https://google.com")));

    // Invalid inputs
    assertFalse(isNativeURL.notEmpty(TEST_VALUES.urlString));
    assertFalse(isNativeURL.notEmpty(TEST_VALUES.nullValue));
    assertFalse(isNativeURL.notEmpty(TEST_VALUES.undefinedValue));
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

  await t.step("notEmpty mode", () => {
    // Valid inputs (Request objects are never considered empty)
    assert(isRequest.notEmpty(TEST_VALUES.request));
    assert(isRequest.notEmpty(new Request("https://google.com")));

    // Invalid inputs
    assertFalse(isRequest.notEmpty(TEST_VALUES.urlString));
    assertFalse(isRequest.notEmpty(TEST_VALUES.nullValue));
    assertFalse(isRequest.notEmpty(TEST_VALUES.undefinedValue));
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

  await t.step("notEmpty mode", () => {
    // Valid inputs (Response objects are never considered empty)
    assert(isResponse.notEmpty(TEST_VALUES.response));
    assert(isResponse.notEmpty(new Response("Different content")));

    // Invalid inputs
    assertFalse(isResponse.notEmpty("Hello, world!"));
    assertFalse(isResponse.notEmpty(TEST_VALUES.nullValue));
    assertFalse(isResponse.notEmpty(TEST_VALUES.undefinedValue));
  });
});

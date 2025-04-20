import { assert, assertFalse } from "@std/assert";
import { isNativeURL, isRequest, isResponse } from "./http.ts";

Deno.test("isNativeURL", async (t) => {
	await t.step("returns true only for instances of URL", () => {
		assert(isNativeURL(new URL("https://example.com")));
		assertFalse(isNativeURL("https://example.com"));
		assertFalse(isNativeURL({}));
		assertFalse(isNativeURL(null));
		assertFalse(isNativeURL(undefined));
		assertFalse(isNativeURL(123));
	});
});

Deno.test("isRequest", async (t) => {
	await t.step("returns true only for instances of Request", () => {
		assert(isRequest(new Request("https://example.com")));
		assertFalse(isRequest("https://example.com"));
		assertFalse(isRequest({}));
		assertFalse(isRequest(null));
		assertFalse(isRequest(undefined));
		assertFalse(isRequest(123));
	});
});

Deno.test("isResponse", async (t) => {
	await t.step("returns true only for instances of Response", () => {
		assert(isResponse(new Response("Hello, world!")));
		assertFalse(isResponse("Hello, world!"));
		assertFalse(isResponse({}));
		assertFalse(isResponse(null));
		assertFalse(isResponse(undefined));
		assertFalse(isResponse(123));
	});
});
import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { isReadableStream, isTransformStream, isWritableStream } from "./streams.ts";

Deno.test("isReadableStream", async (t) => {
  await t.step("accepts ReadableStream instances", () => {
    assert(isReadableStream(new ReadableStream()));
    const response = new Response("hello");
    // response.body is ReadableStream<Uint8Array> | null
    if (response.body) assert(isReadableStream(response.body));
  });

  await t.step("rejects non-ReadableStream values", () => {
    assertFalse(isReadableStream({}));
    assertFalse(isReadableStream(new WritableStream()));
    assertFalse(isReadableStream(new TransformStream()));
    assertFalse(isReadableStream("stream"));
    assertFalse(isReadableStream(null));
    assertFalse(isReadableStream(undefined));
  });

  await t.step("supports the full guard API", () => {
    isReadableStream.strict(new ReadableStream());
    assertThrows(() => isReadableStream.strict({}));
    assert(isReadableStream.optional(undefined));
    assertFalse(isReadableStream.optional({}));
    assertEquals(isReadableStream.validate({}), {
      issues: [{ message: "Expected ReadableStream. Received: {}" }],
    });
  });
});

Deno.test("isWritableStream", async (t) => {
  await t.step("accepts WritableStream instances", () => {
    assert(isWritableStream(new WritableStream()));
  });

  await t.step("rejects non-WritableStream values", () => {
    assertFalse(isWritableStream({}));
    assertFalse(isWritableStream(new ReadableStream()));
    assertFalse(isWritableStream(new TransformStream()));
    assertFalse(isWritableStream("stream"));
    assertFalse(isWritableStream(null));
    assertFalse(isWritableStream(undefined));
  });

  await t.step("supports the full guard API", () => {
    isWritableStream.strict(new WritableStream());
    assertThrows(() => isWritableStream.strict({}));
    assert(isWritableStream.optional(undefined));
    assertFalse(isWritableStream.optional({}));
  });
});

Deno.test("isTransformStream", async (t) => {
  await t.step("accepts TransformStream instances", () => {
    assert(isTransformStream(new TransformStream()));
  });

  await t.step("rejects non-TransformStream values", () => {
    assertFalse(isTransformStream({}));
    assertFalse(isTransformStream(new ReadableStream()));
    assertFalse(isTransformStream(new WritableStream()));
    assertFalse(isTransformStream("stream"));
    assertFalse(isTransformStream(null));
    assertFalse(isTransformStream(undefined));
  });

  await t.step("supports the full guard API", () => {
    isTransformStream.strict(new TransformStream());
    assertThrows(() => isTransformStream.strict({}));
    assert(isTransformStream.optional(undefined));
    assertFalse(isTransformStream.optional({}));
  });
});

import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { Duplex, PassThrough, Readable, Transform, Writable } from "node:stream";
import {
  isNodeDuplex,
  isNodeReadable,
  isNodeTransform,
  isNodeWritable,
} from "./node-streams.ts";

Deno.test("isNodeReadable", async (t) => {
  await t.step("accepts Readable instances", () => {
    assert(isNodeReadable(new Readable({ read() {} })));
    assert(isNodeReadable(Readable.from(["a", "b"])));
  });

  await t.step("accepts subclasses (Duplex, Transform, PassThrough)", () => {
    assert(isNodeReadable(new PassThrough()));
    assert(isNodeReadable(new Transform({ transform(_c, _e, cb) { cb(); } })));
  });

  await t.step("rejects non-Readable values", () => {
    assertFalse(isNodeReadable(new Writable({ write(_c, _e, cb) { cb(); } })));
    assertFalse(isNodeReadable(new ReadableStream())); // Web Stream, not Node
    assertFalse(isNodeReadable({}));
    assertFalse(isNodeReadable("stream"));
    assertFalse(isNodeReadable(null));
    assertFalse(isNodeReadable(undefined));
  });

  await t.step("supports the full guard API", () => {
    isNodeReadable.strict(Readable.from([]));
    assertThrows(() => isNodeReadable.strict({}));
    assert(isNodeReadable.optional(undefined));
    assertFalse(isNodeReadable.optional({}));
    assertEquals(isNodeReadable.validate({}), {
      issues: [{ message: "Expected node:stream.Readable. Received: {}" }],
    });
  });
});

Deno.test("isNodeWritable", async (t) => {
  await t.step("accepts Writable instances", () => {
    assert(isNodeWritable(new Writable({ write(_c, _e, cb) { cb(); } })));
  });

  await t.step("rejects Readable-only streams and non-streams", () => {
    assertFalse(isNodeWritable(Readable.from([])));
    assertFalse(isNodeWritable(new WritableStream())); // Web Stream
    assertFalse(isNodeWritable({}));
    assertFalse(isNodeWritable(null));
    assertFalse(isNodeWritable(undefined));
  });

  await t.step("supports the full guard API", () => {
    isNodeWritable.strict(new Writable({ write(_c, _e, cb) { cb(); } }));
    assertThrows(() => isNodeWritable.strict({}));
    assert(isNodeWritable.optional(undefined));
    assertFalse(isNodeWritable.optional({}));
  });
});

Deno.test("isNodeDuplex", async (t) => {
  await t.step("accepts Duplex instances", () => {
    assert(isNodeDuplex(new PassThrough()));
    assert(isNodeDuplex(new Transform({ transform(_c, _e, cb) { cb(); } })));
    assert(isNodeDuplex(new Duplex({ read() {}, write(_c, _e, cb) { cb(); } })));
  });

  await t.step("rejects plain Readable/Writable and non-streams", () => {
    assertFalse(isNodeDuplex(Readable.from([])));
    assertFalse(isNodeDuplex(new Writable({ write(_c, _e, cb) { cb(); } })));
    assertFalse(isNodeDuplex({}));
    assertFalse(isNodeDuplex(null));
  });

  await t.step("supports the full guard API", () => {
    isNodeDuplex.strict(new PassThrough());
    assertThrows(() => isNodeDuplex.strict({}));
    assert(isNodeDuplex.optional(undefined));
  });
});

Deno.test("isNodeTransform", async (t) => {
  await t.step("accepts Transform instances (including PassThrough)", () => {
    assert(isNodeTransform(new Transform({ transform(_c, _e, cb) { cb(); } })));
    assert(isNodeTransform(new PassThrough())); // PassThrough extends Transform
  });

  await t.step("rejects Duplex (non-Transform), Readable, Writable", () => {
    assertFalse(isNodeTransform(
      new Duplex({ read() {}, write(_c, _e, cb) { cb(); } }),
    ));
    assertFalse(isNodeTransform(Readable.from([])));
    assertFalse(isNodeTransform(new Writable({ write(_c, _e, cb) { cb(); } })));
    assertFalse(isNodeTransform({}));
    assertFalse(isNodeTransform(null));
  });

  await t.step("supports the full guard API", () => {
    isNodeTransform.strict(new PassThrough());
    assertThrows(() => isNodeTransform.strict({}));
    assert(isNodeTransform.optional(undefined));
  });
});

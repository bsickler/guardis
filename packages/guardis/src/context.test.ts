import { assert, assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import type { StandardSchemaV1 } from "../specs/standard-schema-spec.v1.ts";
import type { Context } from "./types.ts";
import { createContext, createStrictContext } from "./context.ts";

// `_speculative` and `_strict` are internal fields not on the public Context interface.
// Tests access them via this local cast.
type InternalContext = Context & {
  _speculative?: StandardSchemaV1.Issue[];
  _strict?: true;
};

Deno.test("createContext addIssue", async (t) => {
  await t.step("pushes to issues when no speculation is active", () => {
    const ctx = createContext();
    ctx.addIssue("err1");
    assertEquals(ctx.issues.length, 1);
    assertEquals(ctx.issues[0], { message: "err1" });
  });

  await t.step("includes path when path has segments", () => {
    const ctx = createContext();
    ctx.pushPath("user");
    ctx.pushPath("name");
    ctx.addIssue("err");
    assertEquals(ctx.issues[0], { message: "err", path: ["user", "name"] });
  });

  await t.step("omits path at root", () => {
    const ctx = createContext();
    ctx.addIssue("err");
    assertEquals(ctx.issues[0], { message: "err" });
  });
});

Deno.test("createContext speculation slot", async (t) => {
  await t.step("addIssue routes to speculation buffer when set", () => {
    const ctx = createContext() as InternalContext;
    const buf: StandardSchemaV1.Issue[] = [];
    ctx._speculative = buf;
    ctx.addIssue("speculative err");
    assertEquals(buf.length, 1);
    assertEquals(buf[0], { message: "speculative err" });
    assertEquals(ctx.issues.length, 0);
  });

  await t.step("clearing speculation routes subsequent writes back to issues", () => {
    const ctx = createContext() as InternalContext;
    const buf: StandardSchemaV1.Issue[] = [];
    ctx._speculative = buf;
    ctx.addIssue("a");
    ctx._speculative = undefined;
    ctx.addIssue("b");
    assertEquals(buf.length, 1);
    assertEquals(buf[0], { message: "a" });
    assertEquals(ctx.issues.length, 1);
    assertEquals(ctx.issues[0], { message: "b" });
  });

  await t.step("defensive path copy — path mutation after issue does not affect buffer", () => {
    const ctx = createContext() as InternalContext;
    const buf: StandardSchemaV1.Issue[] = [];
    ctx._speculative = buf;
    ctx.pushPath("keep");
    ctx.addIssue("captured");
    ctx.popPath();
    ctx.pushPath("different");
    // First issue's path must still contain "keep", proving we stored a copy.
    assertEquals(buf[0].path, ["keep"]);
  });

  await t.step("_speculative is undefined when not set", () => {
    const ctx = createContext() as InternalContext;
    assertEquals(ctx._speculative, undefined);
  });
});

Deno.test("createStrictContext addIssue", async (t) => {
  await t.step("throws TypeError when no speculation is active", () => {
    const ctx = createStrictContext();
    assertThrows(() => ctx.addIssue("err"), TypeError, "err");
  });

  await t.step("throw includes path", () => {
    const ctx = createStrictContext();
    ctx.pushPath("field");
    assertThrows(() => ctx.addIssue("err"), TypeError, "err at path: field");
  });

  await t.step("omits path clause at root", () => {
    const ctx = createStrictContext();
    try {
      ctx.addIssue("err");
      assert(false, "should have thrown");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "err");
    }
  });
});

Deno.test("createStrictContext speculation slot", async (t) => {
  await t.step("addIssue pushes to buffer and does NOT throw when speculation is active", () => {
    const ctx = createStrictContext() as InternalContext;
    const buf: StandardSchemaV1.Issue[] = [];
    ctx._speculative = buf;
    ctx.addIssue("would-throw-but-speculative");
    assertEquals(buf.length, 1);
    assertEquals(buf[0], { message: "would-throw-but-speculative" });
  });

  await t.step("defensive path copy in strict speculation mode", () => {
    const ctx = createStrictContext() as InternalContext;
    const buf: StandardSchemaV1.Issue[] = [];
    ctx._speculative = buf;
    ctx.pushPath("x");
    ctx.addIssue("err");
    ctx.popPath();
    ctx.pushPath("y");
    assertEquals(buf[0].path, ["x"]);
  });

  await t.step("clearing speculation restores throw behavior", () => {
    const ctx = createStrictContext() as InternalContext;
    const buf: StandardSchemaV1.Issue[] = [];
    ctx._speculative = buf;
    ctx.addIssue("buffered");
    ctx._speculative = undefined;
    assertThrows(() => ctx.addIssue("now throws"), TypeError);
  });
});

Deno.test("createStrictContext _strict marker", async (t) => {
  await t.step("strict ctx has _strict === true", () => {
    const ctx = createStrictContext() as InternalContext;
    assertStrictEquals(ctx._strict, true);
  });

  await t.step("non-strict ctx does not have _strict set", () => {
    const ctx = createContext() as InternalContext;
    assertEquals(ctx._strict, undefined);
  });
});

Deno.test("save/restore speculation nesting", async (t) => {
  await t.step("nested save/restore preserves outer buffer", () => {
    const ctx = createContext() as InternalContext;
    const outerBuf: StandardSchemaV1.Issue[] = [];
    const innerBuf: StandardSchemaV1.Issue[] = [];

    ctx._speculative = outerBuf;
    ctx.addIssue("outer1");

    // Simulate nested or(): save outer, install inner, restore outer.
    const prev = ctx._speculative;
    ctx._speculative = innerBuf;
    ctx.addIssue("inner1");
    ctx._speculative = prev;

    ctx.addIssue("outer2");

    assertEquals(outerBuf.map((i) => i.message), ["outer1", "outer2"]);
    assertEquals(innerBuf.map((i) => i.message), ["inner1"]);
    // ctx.issues untouched throughout.
    assertEquals(ctx.issues.length, 0);
  });
});

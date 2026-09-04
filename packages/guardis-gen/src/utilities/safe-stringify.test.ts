import { assertEquals } from "@std/assert";
import { safeStringify } from "./safe-stringify.ts";

Deno.test("safeStringify", async (t) => {
  await t.step("undefined is spelled out, not JSON.stringify's own undefined return", () => {
    assertEquals(safeStringify(undefined), "undefined");
  });

  await t.step("ordinary values round-trip through JSON.stringify", () => {
    assertEquals(safeStringify({ a: 1, b: "x" }), JSON.stringify({ a: 1, b: "x" }));
    assertEquals(safeStringify([1, 2, 3]), "[1,2,3]");
    assertEquals(safeStringify(null), "null");
  });

  await t.step("a circular plain object falls back to String() instead of throwing", () => {
    const value: Record<string, unknown> = { a: 1 };
    value.self = value;
    assertEquals(safeStringify(value), String(value));
  });

  await t.step("a BigInt falls back to String() instead of throwing", () => {
    assertEquals(safeStringify(1n), "1");
  });

  await t.step(
    "a circular proxy whose toString/valueOf resolve to nothing callable never throws",
    () => {
      // The doc's own named case: a live props-style proxy where every string
      // key with no field behind it resolves to undefined (as lazy-record's
      // `get` trap does for an undeclared, non-prototype key), so
      // ToPrimitive's own attempt to call .toString()/.valueOf() finds
      // neither callable -- and the proxy is genuinely self-referential, so
      // JSON.stringify fails too. safeStringify must still return something
      // rather than propagate either failure.
      const target: Record<string, unknown> = {};
      const proxy: Record<string, unknown> = new Proxy(target, {
        get(t, key) {
          if (typeof key !== "string") return Reflect.get(t, key);
          return key === "self" ? proxy : undefined;
        },
        ownKeys() {
          return ["self"];
        },
        getOwnPropertyDescriptor(t, key) {
          return key === "self"
            ? { value: proxy, enumerable: true, configurable: true, writable: true }
            : Reflect.getOwnPropertyDescriptor(t, key);
        },
      });

      let jsonThrows = false;
      try {
        JSON.stringify(proxy);
      } catch {
        jsonThrows = true;
      }
      assertEquals(jsonThrows, true, "test setup: JSON.stringify(proxy) must actually throw");

      let stringThrows = false;
      try {
        String(proxy);
      } catch {
        stringThrows = true;
      }
      assertEquals(stringThrows, true, "test setup: String(proxy) must actually throw");

      assertEquals(typeof safeStringify(proxy), "string");
    },
  );

  await t.step(
    "a circular Object.create(null) -- no toString/valueOf to call, JSON.stringify circular too -- never throws",
    () => {
      const value = Object.create(null);
      value.a = 1;
      value.self = value;
      let stringThrows = false;
      try {
        String(value);
      } catch {
        stringThrows = true;
      }
      assertEquals(
        stringThrows,
        true,
        "test setup: String(Object.create(null)) must actually throw",
      );

      assertEquals(safeStringify(value), Object.prototype.toString.call(value));
    },
  );
});

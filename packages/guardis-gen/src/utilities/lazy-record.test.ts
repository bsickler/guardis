import { assert, assertEquals, assertThrows } from "@std/assert";
import { lazyRecord, type ResolvingEntry } from "./lazy-record.ts";

/** A record with a plain by-key identity/label, for tests with no path-like structure. */
function plainRecord(resolving: ResolvingEntry[] = []) {
  return lazyRecord({
    resolving,
    identity: (key) => key,
    label: (key) => key,
  });
}

Deno.test("a field computes on demand, not at define() time", () => {
  const record = plainRecord();
  let ran = false;
  record.define("a", () => (ran = true, "value"));
  assertEquals(ran, false);
  assertEquals(record.props.a, "value");
  assertEquals(ran, true);
});

Deno.test("a thunk runs exactly once across repeated reads", () => {
  const record = plainRecord();
  let calls = 0;
  record.define("a", () => (calls++, "value"));
  record.props.a;
  record.props.a;
  record.force("a");
  assertEquals(calls, 1);
});

Deno.test("force() and reading through props agree on the memoized value", () => {
  const record = plainRecord();
  record.define("a", () => "value");
  assertEquals(record.force("a"), "value");
  assertEquals(record.props.a, "value");
  assertEquals(record.result.a, "value");
});

Deno.test("cycle detection uses the injected identity, not key equality", () => {
  const resolving: ResolvingEntry[] = [];
  // Two different keys sharing one identity look like a self-cycle.
  const record = lazyRecord({
    resolving,
    identity: () => "shared",
    label: (key) => key,
  });
  record.define("a", () => record.props.b);
  record.define("b", () => "value");
  assertThrows(
    () => record.force("a"),
    Error,
    "circular dependency in relational properties: a -> b",
  );
});

Deno.test("a genuine cycle between two fields throws naming both", () => {
  const record = plainRecord();
  record.define("a", () => record.props.b);
  record.define("b", () => record.props.a);
  assertThrows(
    () => record.force("a"),
    Error,
    "circular dependency in relational properties: a -> b -> a",
  );
});

Deno.test("has() is true for a field that exists but has not been forced", () => {
  const record = plainRecord();
  record.define("a", () => "value");
  assertEquals("a" in record.props, true);
  assertEquals(Object.hasOwn(record.result, "a"), false);
});

Deno.test("has() is false for an undefined field", () => {
  const record = plainRecord();
  assertEquals("nope" in record.props, false);
});

Deno.test("ownKeys/spread sees every defined key, forced or not", () => {
  const record = plainRecord();
  record.define("a", () => "A");
  record.define("b", () => "B");
  record.force("a");
  assertEquals(Object.keys(record.props).sort(), ["a", "b"]);
  assertEquals({ ...record.props }, { a: "A", b: "B" });
});

Deno.test("a spread omits the in-flight key instead of throwing", () => {
  const record = plainRecord();
  let spread: Record<string, unknown> = {};
  record.define("a", () => "A");
  record.define("b", () => {
    spread = { ...record.props }; // must not self-cycle on "b"
    return "B";
  });
  record.force("b");
  assertEquals("b" in spread, false);
  assertEquals(spread.a, "A");
});

Deno.test("set/deleteProperty/defineProperty on props are all rejected", () => {
  const record = plainRecord();
  record.define("a", () => "A");
  assertThrows(() => {
    (record.props as Record<string, unknown>).a = "hijacked";
  }, TypeError);
  assertThrows(() => {
    delete (record.props as Record<string, unknown>).a;
  }, TypeError);
  assertThrows(
    () => Object.defineProperty(record.props, "a", { value: "hijacked", configurable: true }),
    TypeError,
  );
});

Deno.test("preventExtensions (freeze/seal) on props is rejected", () => {
  const record = plainRecord();
  assertThrows(() => Object.freeze(record.props), TypeError);
  assertThrows(() => Object.seal(record.props), TypeError);
});

Deno.test("symbol keys pass through to the underlying result untouched", () => {
  const record = plainRecord();
  const sym = Symbol("tag");
  record.result[sym as unknown as string] = "tagged";
  assertEquals((record.props as Record<PropertyKey, unknown>)[sym], "tagged");
});

Deno.test("prototype-named keys (toString, constructor) behave as real fields", () => {
  const record = plainRecord();
  const props = record.props as Record<string, unknown>;
  record.define("toString", () => "not a function");
  record.define("constructor", () => "also not a function");
  assertEquals(props.toString as unknown, "not a function");
  assertEquals(props.constructor as unknown, "also not a function");
  assert("toString" in props);
  assertEquals(Object.keys(props).sort(), ["constructor", "toString"]);
});

Deno.test("an undeclared prototype-named key reads as the real inherited member, not a bogus thunk call", () => {
  // Before the fix, `thunks` was a plain `{}`, so `thunks['constructor']`
  // resolved to `Object` (truthy) even with no `define()` call for it --
  // `resolve` would then call it AS IF it were a field's own thunk (`this`
  // undefined), injecting a bogus own field and/or throwing.
  const record = plainRecord();
  const props = record.props as Record<string, unknown>;
  assertEquals(props.constructor, Object);
  assertEquals(props.toString, Object.prototype.toString);
  assertEquals(props.valueOf, Object.prototype.valueOf);
  assertEquals(props.hasOwnProperty, Object.prototype.hasOwnProperty);
  assertEquals(props.toLocaleString, Object.prototype.toLocaleString);
  assertEquals(props.isPrototypeOf, Object.prototype.isPrototypeOf);
  // Calling them must behave exactly as it would on a genuine plain object --
  // no injected field, no throw.
  assertEquals((props.valueOf as () => unknown).call(props), props);
  assertEquals((props.hasOwnProperty as (k: string) => boolean).call(props, "constructor"), false);
  assertEquals(Object.keys(props), []);
  assertEquals(Object.keys(record.result), []);
});

Deno.test("a field named '__proto__' behaves as a real own field, not the object's prototype", () => {
  const record = plainRecord();
  const props = record.props as Record<string, unknown>;
  record.define("__proto__", () => "not a prototype");
  assertEquals(props["__proto__"], "not a prototype");
  assertEquals(Object.hasOwn(record.result, "__proto__"), true);
  assertEquals(Object.keys(record.result), ["__proto__"]);
  // The record's OWN prototype must be untouched -- defining/memoizing a
  // "__proto__" field must never reach Object.prototype's accessor.
  assertEquals(Object.getPrototypeOf(record.result), Object.prototype);
});

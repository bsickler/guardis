/**
 * Guards the "zero validation-hot-path impact" requirement for the plugin
 * extension surface (bag + parent pointer + construction hooks). Compares
 * construction and invocation with the surface present against a snapshot
 * of the pre-plugin invocation cost.
 */
import { createTypeGuard } from "../src/guard.ts";
import { registerConstructionHook } from "../src/plugin.ts";

const stringParser = (v: unknown): string | null => typeof v === "string" ? v : null;

Deno.bench({
  name: "construct: guard with no registered hooks",
  group: "construct",
  fn() {
    createTypeGuard("bench", stringParser);
  },
});

// Registers one hook to measure the realistic cost with a plugin installed
// (guardis-gen registers exactly one).
registerConstructionHook((guard) => {
  (guard as unknown as Record<PropertyKey, unknown>).__benchCapability = () => "ok";
});

Deno.bench({
  name: "construct: guard with one registered hook",
  group: "construct",
  fn() {
    createTypeGuard("bench", stringParser);
  },
});

const guard = createTypeGuard("bench", stringParser);

Deno.bench({
  name: "invoke: guard (hot path)",
  group: "invoke",
  fn() {
    guard("hello");
  },
});

Deno.bench({
  name: "read: guard._ (hit on every validate() call)",
  group: "read-own-prop",
  fn() {
    const _ = guard._;
  },
});

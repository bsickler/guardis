// Deliberately imports ONLY define-generator.ts -- no shared.ts, no
// modules/*.ts -- to prove `.defineGenerator()` and `.generate()` are
// genuinely independent capabilities: a guard can gain one without the
// other, which matters for tree-shaking `interpret.ts`'s generation logic
// out of code that only ever calls `.defineGenerator()` (see
// define-generator.ts's module doc).
import { assertEquals } from "@std/assert";
import { createTypeGuard } from "@spudlabs/guardis";
import { ensureDefineGeneratorCapability } from "./define-generator.ts";

ensureDefineGeneratorCapability();

Deno.test("guard.defineGenerator() works without .generate() ever being attached", () => {
  const isThing = createTypeGuard(
    "thing",
    (v: unknown): string | null => typeof v === "string" ? v : null,
  );

  assertEquals(typeof isThing.defineGenerator, "function");
  assertEquals(isThing.generate, undefined);

  // Registering a generator still works even though .generate() was never
  // attached -- .defineGenerator()'s job is only ever to register config.
  isThing.defineGenerator(() => "example");
});

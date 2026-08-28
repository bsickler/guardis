/**
 * define-generator.ts - The `.defineGenerator()` capability: a construction
 * hook, independent of `.generate()`'s (see shared.ts), so a guard can gain
 * one without the other. This matters for tree-shaking: `.defineGenerator()`
 * never calls `interpret()` (it only registers config), so code that calls
 * `.defineGenerator()` in application code but reserves `.generate()` calls
 * for tests doesn't force `interpret.ts`'s generation logic into a
 * production bundle merely by defining generators.
 * @module
 */
import {
  type ConstructedGuard,
  pluginBag,
  registerConstructionHook,
  type TypeGuard,
} from "@spudlabs/guardis";
import { registerGen } from "./spec.ts";
import { attachMethod } from "./utilities/attach.ts";

/**
 * Binds `generator` to `guard`, validating its output against that same
 * guard on every call.
 */
function bindGenerator(guard: TypeGuard<unknown>, generator: (options?: unknown) => unknown): void {
  registerGen(guard, {
    kind: guard._.name ?? "custom",
    generate: (options?: unknown) => {
      const value = generator(options);
      if (!guard(value)) {
        throw new TypeError(
          `defineGenerator: the generator registered for "${guard._.name ?? "this guard"}" ` +
            `produced a value that fails its own guard: ${JSON.stringify(value)}. This usually ` +
            `means guardis' validation logic changed since this generator was written.`,
        );
      }
      return value;
    },
  });
}

/**
 * Fires for EVERY guard `createTypeGuard` builds -- installs `.defineGenerator()`,
 * which dispatches on the argument's runtime type: a function binds a full
 * custom generator (see `bindGenerator`); anything else is stored as this
 * guard's default `.generate()` options (see `shared.ts`'s `attachGenerate`
 * and `interpret.ts`'s per-kind merge). Returns `this` either way, so a
 * guard can be defined and configured in one chained expression.
 */
export function attachDefineGenerator(guard: ConstructedGuard): void {
  attachMethod(guard, "defineGenerator", function (this: TypeGuard<unknown>, arg: unknown) {
    if (typeof arg === "function") {
      bindGenerator(this, arg as (options?: unknown) => unknown);
    } else {
      pluginBag(this).genDefaults = arg;
    }

    return this;
  });
}

let hookRegistered = false;

/** Idempotent — safe to call from every modules/*.ts file. */
export function ensureDefineGeneratorCapability(): void {
  if (hookRegistered) return;
  hookRegistered = true;
  registerConstructionHook(attachDefineGenerator);
}

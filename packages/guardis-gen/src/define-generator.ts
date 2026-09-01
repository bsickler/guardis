/**
 * define-generator.ts - The `.defineGenerator()` capability: binds a custom
 * generator to a guard, or registers its default `.generate()` options.
 * Installed by shared.ts's construction hook alongside `.generate()`/`.or()`.
 * @module
 */
import { type ConstructedGuard, pluginBag, type TypeGuard } from "@spudlabs/guardis";
import { type GenContext, registerGen } from "./spec.ts";
import { attachMethod } from "./utilities/attach.ts";
import { safeStringify } from "./utilities/safe-stringify.ts";

/**
 * Binds `generator` to `guard`, validating its output against that same
 * guard on every call. `ctx` is forwarded straight through, so a custom
 * generator used as a field or element can read its enclosing object
 * instead of being a dead end for relational generation.
 */
function bindGenerator(
  guard: TypeGuard<unknown>,
  generator: (options?: unknown, ctx?: GenContext) => unknown,
): void {
  registerGen(guard, {
    kind: "custom",
    generate: (options?: unknown, ctx?: GenContext) => {
      const value = generator(options, ctx);
      if (!guard(value)) {
        const name = guard._.name ?? "this guard";
        throw new TypeError(
          `defineGenerator: the generator registered for "${name}" produced a value that fails ` +
            `its own guard: ${safeStringify(value)} -- check the generator against ${name}()'s ` +
            `current rules.`,
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
 *
 * See `GuardisPlugins.genDefaults` in spec.ts for the applies-only-at-its-own-call invariant.
 */
export function attachDefineGenerator(guard: ConstructedGuard): void {
  attachMethod(guard, "defineGenerator", function (this: TypeGuard<unknown>, arg: unknown) {
    if (typeof arg === "function") {
      bindGenerator(this, arg as (options?: unknown, ctx?: GenContext) => unknown);
    } else {
      pluginBag(this).genDefaults = arg;
    }

    return this;
  });
}

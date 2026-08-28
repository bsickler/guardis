/**
 * shared.ts - The `.generate()` capability itself, shared by every
 * modules/*.ts registration file so importing more than one of them doesn't
 * register the construction hook multiple times. Not a public entry point —
 * each modules/*.ts file calls `ensureGenerateCapability()` for itself.
 *
 * Deliberately independent of `.defineGenerator()`'s hook in the OTHER
 * direction (see define-generator.ts's module doc for why that one must
 * never import this file) -- this file importing `define-generator.ts` for
 * `attachToVariants` below is fine, since `define-generator.ts` itself never
 * pulls in `interpret.ts`'s generation logic.
 * @module
 */
import {
  type ConstructedGuard,
  pluginBag,
  registerConstructionHook,
  type TypeGuard,
} from "@spudlabs/guardis";
import { resolveSpec } from "./spec.ts";
import { interpret } from "./interpret.ts";
import { attachDefineGenerator } from "./define-generator.ts";
import { attachOrSpec } from "./or.ts";
import { attachMethod } from "./utilities/attach.ts";

export function attachGenerate(guard: ConstructedGuard): void {
  attachMethod(guard, "generate", function (this: TypeGuard<unknown>, options?: unknown) {
    return interpret(resolveSpec(this), options, pluginBag(this).genDefaults);
  });
}

let hookRegistered = false;

/** Idempotent — safe to call from every modules/*.ts file. */
export function ensureGenerateCapability(): void {
  if (hookRegistered) return;
  hookRegistered = true;
  registerConstructionHook(attachGenerate);
}

function attachAll(guard: ConstructedGuard): void {
  attachGenerate(guard);
  attachDefineGenerator(guard);
  attachOrSpec(guard);
}

type WithVariants = { optional?: ConstructedGuard; notEmpty?: ConstructedGuard };

/**
 * Attaches `.generate()`/`.defineGenerator()`/`.or()`-wrapping to `guard`
 * and every derived variant core builds for it eagerly at construction time
 * -- `.optional`, `.notEmpty`, and `.notEmpty.optional` (the same object
 * core assigns as `.optional.notEmpty` -- there's no fourth, deeper
 * combination). Only needed for guards that pre-exist before guardis-gen's
 * construction hooks register (core's own singletons); anything built
 * afterward gets this for free through the normal hook path,
 * `.optional`/`.notEmpty` included.
 */
export function attachToVariants(guard: ConstructedGuard): void {
  attachAll(guard);

  const g = guard as unknown as WithVariants;
  if (g.optional) attachAll(g.optional);
  if (g.notEmpty) {
    attachAll(g.notEmpty);
    const ne = g.notEmpty as unknown as WithVariants;
    if (ne.optional) attachAll(ne.optional);
  }
}

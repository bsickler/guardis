/**
 * shared.ts - Registers the single construction hook that installs every
 * generation capability -- `.generate()`, `.defineGenerator()`, and `.or()`'s
 * union-spec wrapping -- on each guard `createTypeGuard` builds. Not a public
 * entry point — each modules/*.ts file calls `ensureGenerateCapability()` for
 * itself, so importing more than one doesn't register the hook twice.
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
import { mergeOptions } from "./options.ts";
import { attachDefineGenerator } from "./define-generator.ts";
import { attachOrSpec } from "./or.ts";
import { attachMethod } from "./utilities/attach.ts";

/** See `GuardisPlugins.genDefaults` in spec.ts -- this is the one place `genDefaults` is read. */
export function attachGenerate(guard: ConstructedGuard): void {
  attachMethod(guard, "generate", function (this: TypeGuard<unknown>, options?: unknown) {
    return interpret(resolveSpec(this), mergeOptions(pluginBag(this).genDefaults, options));
  });
}

let hookRegistered = false;

/** Idempotent — safe to call from every modules/*.ts file. */
export function ensureGenerateCapability(): void {
  if (hookRegistered) return;
  hookRegistered = true;
  registerConstructionHook(attachAll);
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
 * construction hook registers (core's own singletons); anything built
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

/**
 * object.ts - Automatic object-spec registration. Any guard built via
 * createTypeGuard(shape) gets a matching ObjectSpec automatically: a
 * construction hook reads the shape core retains at `guard._.shape`
 * specifically for this purpose (a compiled shape parser can't be
 * decomposed back into its per-field guards after the fact, so the shape
 * has to be captured before that happens). There's no wrapper function here
 * -- `createTypeGuard(shape)` is the normal, only way to build an object
 * guard, same as any other guard.
 * @module
 */
import {
  type ConstructedGuard,
  createTypeGuard,
  guardParent,
  registerConstructionHook,
  type TypeGuard,
  type TypeGuardShape,
} from "@spudlabs/guardis";
import type { ObjectSpec, Spec } from "./spec.ts";
import { registerGen, resolveSpec } from "./spec.ts";

function isShapeObject(value: unknown): value is TypeGuardShape {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function specForField(field: unknown): Spec | undefined {
  if (typeof field === "function") return resolveSpec(field as TypeGuard<unknown>);

  if (isShapeObject(field)) return specForShape(field);

  return undefined;
}

/**
 * `guard` is the already-built guard for this shape when called from
 * `attachObjectSpec` (which builds/receives it first); a raw nested shape
 * field (a shape value used directly within a larger shape) has no guard
 * of its own yet, so one is built on the fly.
 */
function specForShape(shape: TypeGuardShape, guard?: TypeGuard<unknown>): ObjectSpec {
  const fields: Record<string, Spec> = {};
  for (const [key, field] of Object.entries(shape)) {
    const fieldSpec = specForField(field);
    if (fieldSpec) fields[key] = fieldSpec;
  }
  return { kind: "object", fields, guard: guard ?? createTypeGuard(shape) };
}

/**
 * Fires for EVERY guard `createTypeGuard` builds -- a no-op unless
 * `guard._.shape` is present, which only happens for a guard actually
 * constructed from a shape (directly, or via `.extend(shape)`, where it
 * holds only the newly-added fields -- see `GuardMeta.shape`'s doc).
 * `ConstructedGuard` deliberately only types `_.name`, so `shape` is read
 * via a local cast.
 *
 * When the guard has a parent (an `.extend()` result), the parent's already-
 * resolved spec is merged in so the registered spec reflects the FULL
 * shape, not just this level's additions -- and `guard` is always `typed`
 * itself, which correctly validates the complete merged object.
 */
function attachObjectSpec(guard: ConstructedGuard): void {
  const ownShape = (guard as unknown as { _: { shape?: TypeGuardShape } })._.shape;
  if (!ownShape) return;

  const typed = guard as unknown as TypeGuard<unknown>;
  const ownFields = specForShape(ownShape, typed).fields;
  const parent = guardParent(typed);
  const parentSpec = parent && resolveSpec(parent);

  // `kind === "object"` alone doesn't narrow out CustomSpec here -- its `kind`
  // is a plain `string`, so "object" is a structurally valid value for it too.
  const parentFields = parentSpec && parentSpec.kind === "object" && !("generate" in parentSpec)
    ? parentSpec.fields
    : undefined;

  registerGen(typed, {
    kind: "object",
    guard: typed,
    fields: parentFields ? { ...parentFields, ...ownFields } : ownFields,
  });
}

registerConstructionHook(attachObjectSpec);

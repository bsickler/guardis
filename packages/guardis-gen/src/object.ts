/**
 * object.ts - Automatic object-spec registration. A construction hook reads
 * `guard._.shape`, which core retains because a compiled shape parser can't
 * be decomposed back into per-field guards afterward.
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
import type { ObjectSpec, SpecSource } from "./spec.ts";
import { fixedSpec, registerGen, resolveSpec, specRef } from "./spec.ts";

function isShapeObject(value: unknown): value is TypeGuardShape {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Late-bound: a function field points at its guard rather than snapshotting
 * its spec, so a `.defineGenerator()`/`registerGen()` call made after this
 * object is constructed is still honored at generation time (see `deref` in
 * spec.ts). Total -- returns a `SpecSource` for every branch, never
 * `undefined` -- so no field is ever silently dropped from `fields`.
 */
function specForField(field: unknown): SpecSource {
  if (typeof field === "function") return specRef(field as TypeGuard<unknown>);

  // A shape value inside a larger shape has no guard of its own, so one is
  // built here -- the SAME construction hook then fires for it, so there is
  // nothing to recurse into by hand.
  if (isShapeObject(field)) return specRef(createTypeGuard(field));

  // A shape constant (core compiles it to isExactly). No guard is surfaced,
  // so this is a genuine fixed position: without it the field would be
  // dropped and the object would fail its own guard at generation time.
  return fixedSpec({ kind: "custom", generate: () => field });
}

/**
 * `guard` is the already-built guard for this shape when called from
 * `attachObjectSpec` (which builds/receives it first); a raw nested shape
 * field (a shape value used directly within a larger shape) has no guard
 * of its own yet, so one is built on the fly.
 */
function specForShape(shape: TypeGuardShape, guard?: TypeGuard<unknown>): ObjectSpec {
  const fields: Record<string, SpecSource> = {};
  for (const [key, field] of Object.entries(shape)) {
    fields[key] = specForField(field);
  }
  return { kind: "object", fields, guard: guard ?? createTypeGuard(shape) };
}

/**
 * Fires for every guard, a no-op unless `guard._.shape` is set -- true only
 * for shape-built guards, and for `.extend()` results, where it holds just
 * the added fields. So a parent's fields are merged in to give the full shape.
 *
 * That merge is eager, fixing the child's key set at `.extend()` time; each
 * field's `SpecSource` is still copied by reference and stays late-bound.
 * Inheriting the parent's spec wholesale instead would let a later
 * `registerGen` hand the child one that knows only the narrower shape.
 */
function attachObjectSpec(guard: ConstructedGuard): void {
  const ownShape = (guard as unknown as { _: { shape?: TypeGuardShape } })._.shape;
  if (!ownShape) return;

  const typed = guard as unknown as TypeGuard<unknown>;
  const ownFields = specForShape(ownShape, typed).fields;
  const parent = guardParent(typed);
  const parentSpec = parent && resolveSpec(parent);

  const parentFields = parentSpec && parentSpec.kind === "object" ? parentSpec.fields : undefined;

  registerGen(typed, {
    kind: "object",
    guard: typed,
    fields: parentFields ? { ...parentFields, ...ownFields } : ownFields,
  });
}

registerConstructionHook(attachObjectSpec);

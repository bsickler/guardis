/**
 * modules/collections.ts - Side-effect entry point for guardis' compound
 * guards isMap and isSet (isTuple, unlike these two, has no long-lived
 * singleton to monkeypatch -- it's a pure factory, so its generation support
 * lives at `gen.tuple()` in ../tuple.ts instead, always available from the
 * main package import with no register step). Import this (via the
 * "./register/collections" subpath) BEFORE calling `.of()`/`.min()`/`.max()`
 * /`.ofSize()`/`.range()` on isMap/isSet in schemas you want
 * `.generate()`-aware -- it stamps default key/value/element specs (plain
 * strings) and monkey-patches `.of()` plus the size chain methods so every
 * guard they return carries a matching spec.
 * @module
 */
import { isMap, isSet, type TypeGuard } from "@spudlabs/guardis";
import {
  DEFAULT_ELEMENT_SPEC,
  type LengthConstraints as SizeConstraints,
  registerGen,
  resolveSpec,
  type Spec,
} from "../spec.ts";
import { attachToVariants, ensureGenerateCapability } from "../shared.ts";
import { ensureDefineGeneratorCapability } from "../define-generator.ts";
import { ensureOrCapability } from "../or.ts";
import { type ChainMethodGuard, patchChainMethods } from "../utilities/chain.ts";

ensureGenerateCapability();
ensureDefineGeneratorCapability();
ensureOrCapability();

// isMap/isSet already exist by the time this module runs (built at
// @spudlabs/guardis's own module-load time) -- same reasoning as
// modules/primitives.ts's attach calls.
attachToVariants(isMap);
attachToVariants(isSet);

// --- base specs, for isMap()/isSet() with no .of() call -------------------

registerGen(isMap, {
  kind: "map",
  key: DEFAULT_ELEMENT_SPEC,
  value: DEFAULT_ELEMENT_SPEC,
  constraints: {},
});
registerGen(isSet, { kind: "set", element: DEFAULT_ELEMENT_SPEC, constraints: {} });

// --- size chain-method monkeypatching ---------------------------------------
//
// isMap/isSet's `.min()/.max()/.ofSize()/.range()` are real core validation
// methods; patchChainMethods just makes them also carry a matching
// generation spec.

// `kind === "map"`/`kind === "set"` alone doesn't narrow out CustomSpec --
// its `kind` is a plain `string`, so any literal is structurally valid for
// it too (same reasoning as object.ts's `attachObjectSpec`).
function isMapSpec(spec: Spec | undefined): spec is Extract<Spec, { kind: "map" }> {
  return !!spec && spec.kind === "map" && !("generate" in spec);
}

function isSetSpec(spec: Spec | undefined): spec is Extract<Spec, { kind: "set" }> {
  return !!spec && spec.kind === "set" && !("generate" in spec);
}

function buildMapSpec(parent: TypeGuard<unknown>, patch: SizeConstraints): Spec {
  const parentSpec = resolveSpec(parent);
  const existing = parentSpec && "constraints" in parentSpec ? parentSpec.constraints : undefined;
  const key = isMapSpec(parentSpec) ? parentSpec.key : DEFAULT_ELEMENT_SPEC;
  const value = isMapSpec(parentSpec) ? parentSpec.value : DEFAULT_ELEMENT_SPEC;
  return { kind: "map", key, value, constraints: { ...existing, ...patch } };
}

function buildSetSpec(parent: TypeGuard<unknown>, patch: SizeConstraints): Spec {
  const parentSpec = resolveSpec(parent);
  const existing = parentSpec && "constraints" in parentSpec ? parentSpec.constraints : undefined;
  const element = isSetSpec(parentSpec) ? parentSpec.element : DEFAULT_ELEMENT_SPEC;
  return { kind: "set", element, constraints: { ...existing, ...patch } };
}

// --- .of() monkeypatching ----------------------------------------------------
//
// `patchMapOf`/`patchSetOf` re-wrap `.of()` on every `.min()`/`.max()`/
// `.ofSize()`/`.range()` result too (not just the top-level isMap/isSet),
// carrying forward whatever size constraint `guard` already has so
// generated values don't violate it.

function patchMapOf(guard: ChainMethodGuard): void {
  const typed = guard as unknown as { of: typeof isMap.of };
  const originalOf = typed.of;
  typed.of = ((keyGuard: TypeGuard<unknown>, valueGuard: TypeGuard<unknown>) => {
    const child = originalOf(keyGuard, valueGuard);
    const parentSpec = resolveSpec(guard);
    registerGen(child, {
      kind: "map",
      key: resolveSpec(keyGuard) ?? DEFAULT_ELEMENT_SPEC,
      value: resolveSpec(valueGuard) ?? DEFAULT_ELEMENT_SPEC,
      constraints: isMapSpec(parentSpec) ? parentSpec.constraints ?? {} : {},
    });
    patchChainMethods(child as unknown as ChainMethodGuard, "ofSize", buildMapSpec);
    return child;
  }) as typeof isMap.of;
}

function patchSetOf(guard: ChainMethodGuard): void {
  const typed = guard as unknown as { of: typeof isSet.of };
  const originalOf = typed.of;
  typed.of = ((elementGuard: TypeGuard<unknown>) => {
    const child = originalOf(elementGuard);
    const parentSpec = resolveSpec(guard);
    registerGen(child, {
      kind: "set",
      element: resolveSpec(elementGuard) ?? DEFAULT_ELEMENT_SPEC,
      constraints: isSetSpec(parentSpec) ? parentSpec.constraints ?? {} : {},
    });
    patchChainMethods(child as unknown as ChainMethodGuard, "ofSize", buildSetSpec);
    return child;
  }) as typeof isSet.of;
}

patchMapOf(isMap as unknown as ChainMethodGuard);
patchSetOf(isSet as unknown as ChainMethodGuard);
patchChainMethods(isMap as unknown as ChainMethodGuard, "ofSize", buildMapSpec, patchMapOf);
patchChainMethods(isSet as unknown as ChainMethodGuard, "ofSize", buildSetSpec, patchSetOf);

// Baseline for the late-bound-spec-resolution refactor (see
// docs/plans/2026-08-30-001-refactor-late-bound-spec-resolution-plan.md).
// Measures .generate() itself, not validation -- see ../guardis/ for the
// comparative isUser(x)/validate(x) benchmarks against other libraries.
//
// "@spudlabs/guardis-gen" (not just "/modules/primitives") is required here:
// the object-spec construction hook that gives createTypeGuard(shape) guards
// a `.generate()` at all lives at the main entry point's side-effect import
// of src/object.ts, not in modules/primitives.ts.
import "@spudlabs/guardis-gen";
import "@spudlabs/guardis-gen/modules/primitives";
import { createTypeGuard, isArray, isBoolean, isNumber, isString } from "@spudlabs/guardis";

const isFlatUser = createTypeGuard({
  name: isString,
  age: isNumber,
  active: isBoolean,
  score: isNumber,
  email: isString,
});

const isNested3Level = createTypeGuard({
  user: {
    profile: {
      name: isString,
      age: isNumber,
    },
    active: isBoolean,
  },
  score: isNumber,
});

const isItem = createTypeGuard({ x: isString, y: isNumber });
const isItemArray = isArray.of(isItem).ofLength(10);

Deno.bench({
  name: "guardis-gen: generate() flat 5-field object",
  fn() {
    isFlatUser.generate();
  },
});
Deno.bench({
  name: "guardis-gen: generate() 3-level nested object",
  fn() {
    isNested3Level.generate();
  },
});
Deno.bench({
  name: "guardis-gen: generate() isArray.of(objectGuard).ofLength(10)",
  fn() {
    isItemArray.generate();
  },
});

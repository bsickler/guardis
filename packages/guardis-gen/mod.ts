/**
 * Guardis Gen links Guardis type guards to data generation, letting you
 * derive sample or fixture data directly from the guards that already
 * validate your types.
 *
 * Registration is per-module, mirroring guardis' own subpaths, and each is
 * independently tree-shakeable — only import the ones you actually use:
 *   - "@spudlabs/guardis-gen/modules/primitives" — isString/isNumber/isBoolean/isDate/isArray
 *   - "@spudlabs/guardis-gen/modules/strings" — isEmail, isUUIDv4, isUlid, etc.
 *   - "@spudlabs/guardis-gen/modules/http" — isIpv4, isCidr, etc.
 *   - "@spudlabs/guardis-gen/modules/collections" — isMap.of()/isSet.of()
 * (branded guards from guardis' "/strings-branded" and "/http-branded"
 * subpaths are the same underlying objects, so registering either side
 * already covers both — no separate branded entry point needed here.)
 *
 * Each of these has no exports of its own — importing one is purely for its
 * side effect (it binds generators / patches chain methods on the
 * corresponding core guards), not for anything you'd bind from it.
 *
 * Import the ones you need once, before defining ANY of your own guards or
 * schemas that chain off guardis' primitives (isString.min(5), isNumber.gt(0),
 * etc.) — registration works by hooking into guard construction, so it only
 * covers guards built after it runs. A guard constructed before its
 * relevant "modules/*" entry point is imported never gets `.generate()`
 * attached, with no error at the point that guard is built — the failure
 * only surfaces later, when something calls `.generate()` on it.
 *
 * @module GuardisGen
 */
import "./src/object.ts";
import { tuple } from "./src/tuple.ts";

export type {
  DateConstraints,
  GeneratorOptionsRegistry,
  LengthConstraints,
  NumberConstraints,
  Spec,
} from "./src/spec.ts";
export { registerGen, resolveSpec } from "./src/spec.ts";

/** Namespace for guard constructors that also derive a generation spec. */
export const gen = { tuple };

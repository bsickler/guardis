/**
 * Guardis Gen derives sample and fixture data from the guards that already
 * validate your types. Import the side-effect entry points you need once,
 * before building your own guards:
 *   - "@spudlabs/guardis-gen/modules/primitives" — isString/isNumber/isBoolean/isDate/isArray
 *   - "@spudlabs/guardis-gen/modules/strings" — isEmail, isUUIDv4, isUlid, etc.
 *   - "@spudlabs/guardis-gen/modules/http" — isIpv4, isCidr, etc.
 *   - "@spudlabs/guardis-gen/modules/collections" — isMap.of()/isSet.of()
 *
 * See the README for import-order, seeding, and relational generation details.
 * @module GuardisGen
 */
import "./src/object.ts";
import { tuple } from "./src/tuple.ts";

export type {
  DateConstraints,
  GenContext,
  GeneratorOptionsRegistry,
  LengthConstraints,
  NumberConstraints,
  Spec,
} from "./src/spec.ts";
export { registerGen, resolveSpec } from "./src/spec.ts";
export { next, pick, randomBoolean, randomInt, seed } from "./src/utilities/rng.ts";

/** Namespace for guard constructors that also derive a generation spec. */
export const gen = { tuple };

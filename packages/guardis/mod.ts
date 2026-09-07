/**
 * Guardis is a utility to help build type guard libraries while
 * addressing one of the main potential sources of error in TypeScript's
 * "type guard" behavior.
 *
 * @module Guardis
 */
import { isExactly } from "./src/guard.ts";
import {
  isAny,
  isBinary,
  isBoolean,
  isDate,
  isEmpty,
  isEnum,
  isFunction,
  isInt,
  isIterable,
  isJsonArray,
  isJsonObject,
  isJsonPrimitive,
  isJsonValue,
  isNever,
  isNil,
  isNull,
  isNumber,
  isNumeric,
  isObject,
  isPropertyKey,
  isString,
  isSymbol,
  isUndefined,
  isUnknown,
} from "./src/modules/primitives.ts";
import { isArray, isMap, isSet, isTuple } from "./src/modules/collections.ts";

export * from "./src/guard.ts";
export * from "./src/modules/primitives.ts";
export * from "./src/modules/collections.ts";
export * from "./src/extend.ts";
export * from "./src/batch.ts";
export * from "./src/brand.ts";
export * from "./src/types.ts";

export {
  GUARDIS_EXT,
  GUARDIS_PARENT,
  guardParent,
  pluginBag,
  registerConstructionHook,
} from "./src/plugin.ts";
export type { ConstructedGuard, GuardisPlugins } from "./src/plugin.ts";
export { unionOf } from "./src/utilities.ts";

/**
 * "Is" serves as the main libray object and contains
 * keys corresponding to most of JavaScript's basic
 * data types. The key values are callbacks that function as
 * type guards for their respective types.
 */
export const Is = {
  Any: isAny,
  Array: isArray,
  Binary: isBinary,
  Boolean: isBoolean,
  Date: isDate,
  Empty: isEmpty,
  Enum: isEnum,
  Exactly: isExactly,
  Function: isFunction,
  Int: isInt,
  Iterable: isIterable,
  JsonArray: isJsonArray,
  JsonObject: isJsonObject,
  JsonPrimitive: isJsonPrimitive,
  JsonValue: isJsonValue,
  Map: isMap,
  Never: isNever,
  Nil: isNil,
  Null: isNull,
  Number: isNumber,
  Numeric: isNumeric,
  Object: isObject,
  PropertyKey: isPropertyKey,
  Set: isSet,
  String: isString,
  Symbol: isSymbol,
  Tuple: isTuple,
  Undefined: isUndefined,
  Unknown: isUnknown,
} as const;

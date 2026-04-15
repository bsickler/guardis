/**
 * Guardis is a utility to help build type guard libraries while
 * addressing one of the main potential sources of error in TypeScript's
 * "type guard" behavior.
 *
 * @module Guardis
 */
import { isExactly, isNull, isUndefined } from "./src/guard.ts";
import {
  isAny,
  isArray,
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
  isMap,
  isNever,
  isNil,
  isNumber,
  isNumeric,
  isObject,
  isPropertyKey,
  isSet,
  isString,
  isSymbol,
  isTuple,
  isUnknown,
} from "./src/modules/primitives.ts";
import {
  isBlob,
  isFormData,
  isHeaders,
  isNativeURL,
  isRequest,
  isResponse,
} from "./src/modules/http.ts";
import {
  isReadableStream,
  isTransformStream,
  isWritableStream,
} from "./src/modules/streams.ts";

export * from "./src/guard.ts";
export * from "./src/modules/primitives.ts";
export * from "./src/extend.ts";
export * from "./src/batch.ts";
export * from "./src/brand.ts";
export * from "./src/types.ts";
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
  Blob: isBlob,
  Boolean: isBoolean,
  Date: isDate,
  Empty: isEmpty,
  Enum: isEnum,
  Exactly: isExactly,
  FormData: isFormData,
  Function: isFunction,
  Headers: isHeaders,
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
  ReadableStream: isReadableStream,
  Request: isRequest,
  Response: isResponse,
  Set: isSet,
  String: isString,
  Symbol: isSymbol,
  TransformStream: isTransformStream,
  Tuple: isTuple,
  Undefined: isUndefined,
  Unknown: isUnknown,
  URL: isNativeURL,
  WritableStream: isWritableStream,
} as const;

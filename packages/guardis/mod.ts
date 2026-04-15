/**
 * Guardis is a utility to help build type guard libraries while
 * addressing one of the main potential sources of error in TypeScript's
 * "type guard" behavior.
 *
 * @module Guardis
 */
import { isExactly, isNull, isUndefined } from "./src/guard.ts";
import {
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
  isNil,
  isNumber,
  isNumeric,
  isObject,
  isPropertyKey,
  isSet,
  isString,
  isSymbol,
  isTuple,
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
  Boolean: isBoolean,
  String: isString,
  Number: isNumber,
  Int: isInt,
  Binary: isBinary,
  Numeric: isNumeric,
  Symbol: isSymbol,
  Function: isFunction,
  Object: isObject,
  PropertyKey: isPropertyKey,
  Undefined: isUndefined,
  Array: isArray,
  JsonPrimitive: isJsonPrimitive,
  JsonArray: isJsonArray,
  JsonObject: isJsonObject,
  JsonValue: isJsonValue,
  Null: isNull,
  Nil: isNil,
  Empty: isEmpty,
  Iterable: isIterable,
  Tuple: isTuple,
  Date: isDate,
  Exactly: isExactly,
  Enum: isEnum,
  Map: isMap,
  Set: isSet,
  Blob: isBlob,
  FormData: isFormData,
  Headers: isHeaders,
  ReadableStream: isReadableStream,
  WritableStream: isWritableStream,
  TransformStream: isTransformStream,
  Request: isRequest,
  Response: isResponse,
  URL: isNativeURL,
} as const;

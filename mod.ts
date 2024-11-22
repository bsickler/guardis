export * from "./src/guard.ts";
export * from "./src/extend.ts";

import * as g from "./src/guard.ts";

export const Is = {
  Boolean: g.isBoolean,
  String: g.isString,
  Number: g.isNumber,
  Binary: g.isBinary,
  Numeric: g.isNumeric,
  Function: g.isFunction,
  Object: g.isObject,
  Undefined: g.isUndefined,
  JsonArray: g.isJsonArray,
  JsonObject: g.isJsonObject,
  Null: g.isNull,
  Nil: g.isNil,
  Empty: g.isEmpty,
} as const;

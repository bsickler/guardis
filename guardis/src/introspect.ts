import type { StandardSchemaV1 } from "../specs/standard-schema-spec.v1.ts";
import type { Context, Parser, Predicate, TypeGuard } from "./types.ts";

/** Base internal metadata attached to type guards */
export type GuardMeta<T> = {
  _: {
    name: string | undefined;
    parser: Parser<T>;
  };
};

/** Extended metadata for guards with context-aware validation */
export type GuardWithContext<T> = GuardMeta<T> & {
  _: {
    context: (value: unknown, ctx?: Context) => StandardSchemaV1.Result<T>;
  };
};

/**
 * Type guard that checks if a given guard object contains meta information.
 *
 * Specifically, it verifies that the guard has an underscore (`_`) property,
 * which is an object containing a `name` (string or undefined) and a `parser` function.
 */
export const hasMeta = <T1>(
  guard: Predicate<T1> | TypeGuard<T1>,
): guard is typeof guard & GuardMeta<T1> => {
  return "_" in guard && !!guard._ &&
    typeof guard._ === "object" && "parser" in guard._ &&
    typeof guard._.parser === "function";
};

/**
 * Checks if a guard has context-aware validation support for path tracking.
 */
export const hasContext = <T1>(
  guard: Predicate<T1> | TypeGuard<T1>,
): guard is typeof guard & GuardWithContext<T1> => {
  return hasMeta(guard) && "context" in guard._ &&
    typeof guard._.context === "function";
};

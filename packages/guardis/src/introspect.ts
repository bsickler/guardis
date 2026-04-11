import type { GuardMeta, Predicate, TypeGuard } from "./types.ts";

/**
 * Type guard that checks if a given guard object contains meta information.
 *
 * Specifically, it verifies that the guard has an underscore (`_`) property,
 * which is an object containing a `name` (string or undefined) and a `parser` function.
 */
export const hasMeta = <T1>(
  guard: Predicate<T1> | TypeGuard<T1>,
): guard is typeof guard & { _: GuardMeta<T1> } => {
  return "_" in guard && !!guard._ &&
    typeof guard._ === "object" && "parser" in guard._ &&
    typeof guard._.parser === "function";
};

/**
 * Checks if a guard has a defined name for error messaging.
 * Returns true only if the guard has meta and a truthy name string.
 */
export const hasName = <T1>(
  guard: Predicate<T1> | TypeGuard<T1>,
): guard is typeof guard & { _: GuardMeta<T1> & { name: string } } => {
  return hasMeta(guard) && typeof guard._.name === "string" && guard._.name.length > 0;
};

/**
 * Checks if a guard has context-aware validation support for path tracking.
 */
export const hasContext = <T1>(
  guard: Predicate<T1> | TypeGuard<T1>,
): guard is typeof guard & { _: GuardMeta<T1> } => {
  return hasMeta(guard) && "context" in guard._ &&
    typeof guard._.context === "function";
};

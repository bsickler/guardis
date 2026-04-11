import type { StandardSchemaV1 } from "../specs/standard-schema-spec.v1.ts";
import type { Context } from "./types.ts";

/**
 * Creates a validation context for tracking paths and collecting issues during validation.
 *
 * @param path The current path segments (defaults to empty array for root)
 * @param rootIssues Optional shared issues array (for propagating issues to parent context)
 * @returns A new Context instance
 */
export function createContext(
  path: PropertyKey[] = [],
  rootIssues?: StandardSchemaV1.Issue[],
): Context {
  const issues = rootIssues ?? [];

  return {
    path,
    issues,
    pushPath(segment: PropertyKey): Context {
      return createContext([...path, segment], issues);
    },
    addIssue(message: string): void {
      // Only include path if it has segments (not at root level)
      issues.push(path.length > 0 ? { message, path: [...path] } : { message });
    },
  };
}

/**
 * Creates a strict validation context that throws TypeError immediately on first issue.
 * Used by strict type guards to provide detailed error messages with path information.
 *
 * @param path The current path segments (defaults to empty array for root)
 * @returns A Context that throws on addIssue instead of collecting issues
 */
export function createStrictContext(path: PropertyKey[] = []): Context {
  return {
    path,
    issues: [],
    pushPath(segment: PropertyKey): Context {
      return createStrictContext([...path, segment]);
    },
    addIssue(message: string): void {
      const pathStr = path.length > 0 ? ` at path: ${path.join(".")}` : "";
      throw new TypeError(`${message}${pathStr}`);
    },
  };
}

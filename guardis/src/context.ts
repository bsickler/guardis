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

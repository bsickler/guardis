import type { StandardSchemaV1 } from "../specs/standard-schema-spec.v1.ts";
import type { Context } from "./types.ts";

/**
 * Creates a validation context for tracking paths and collecting issues during validation.
 *
 * The Context uses a mutable cursor: `pushPath` and `popPath` mutate the path array
 * in place. Callers must push and pop in matched pairs. `addIssue` defensively copies
 * the path so captured issues remain stable after the cursor unwinds.
 *
 * @param path The initial path segments (defaults to empty array for root)
 * @param rootIssues Optional shared issues array
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
    pushPath(segment: PropertyKey): void {
      path.push(segment);
    },
    popPath(): void {
      path.pop();
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
 * Shares the mutable cursor API with createContext. Since addIssue throws on the first
 * issue, the cursor never unwinds — but the shared API simplifies call sites, and the
 * thrown error's path reflects the deepest push at throw time.
 *
 * @param path The initial path segments (defaults to empty array for root)
 * @returns A Context that throws on addIssue instead of collecting issues
 */
export function createStrictContext(path: PropertyKey[] = []): Context {
  return {
    path,
    issues: [],
    pushPath(segment: PropertyKey): void {
      path.push(segment);
    },
    popPath(): void {
      path.pop();
    },
    addIssue(message: string): void {
      const pathStr = path.length > 0 ? ` at path: ${path.join(".")}` : "";
      throw new TypeError(`${message}${pathStr}`);
    },
  };
}

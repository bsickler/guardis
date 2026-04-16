import type { StandardSchemaV1 } from "../specs/standard-schema-spec.v1.ts";
import type { Context } from "./types.ts";

/**
 * Creates a validation context for tracking paths and collecting issues during validation.
 *
 * The Context uses a mutable cursor: `pushPath` and `popPath` mutate the path array
 * in place. Callers must push and pop in matched pairs. `addIssue` defensively copies
 * the path so captured issues remain stable after the cursor unwinds.
 *
 * **Speculation slot** (`_speculative`, internal — not on the public `Context` interface):
 * when set to an Issue[] by `or()` (see `guard.ts`), `addIssue` writes to that buffer
 * instead of `issues`. This lets `or()` isolate branch-level issue writes without
 * allocating fresh contexts. `or()` is the only caller that reads/writes `_speculative`;
 * it accesses via a local cast `(ctx as Context & { _speculative?: Issue[] })`.
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
  let speculative: StandardSchemaV1.Issue[] | undefined;

  const ctx = {
    path,
    issues,
    get _speculative(): StandardSchemaV1.Issue[] | undefined {
      return speculative;
    },
    set _speculative(v: StandardSchemaV1.Issue[] | undefined) {
      speculative = v;
    },
    pushPath(segment: PropertyKey): void {
      path.push(segment);
    },
    popPath(): void {
      path.pop();
    },
    addIssue(message: string): void {
      const target = speculative ?? issues;
      // Defensive path copy — path keeps mutating after this issue is captured.
      target.push(path.length > 0 ? { message, path: [...path] } : { message });
    },
  } as Context;
  return ctx;
}

/**
 * Creates a strict validation context that throws TypeError immediately on first issue.
 * Used by strict type guards to provide detailed error messages with path information.
 *
 * Shares the mutable cursor API with createContext. Since addIssue throws on the first
 * issue, the cursor never unwinds — but the shared API simplifies call sites, and the
 * thrown error's path reflects the deepest push at throw time.
 *
 * **Speculation slot** (`_speculative`, internal): when set, `addIssue` writes to the
 * buffer and does NOT throw. `or()` uses this to run speculative branches non-throwingly.
 * See `createContext` docstring for details.
 *
 * **Strict marker** (`_strict: true`, internal): `or()` reads this via local cast to
 * decide whether to throw a combined TypeError or push issues after all branches fail.
 * Not part of the public `Context` interface.
 *
 * @param path The initial path segments (defaults to empty array for root)
 * @returns A Context that throws on addIssue instead of collecting issues
 */
export function createStrictContext(path: PropertyKey[] = []): Context {
  let speculative: StandardSchemaV1.Issue[] | undefined;

  const ctx = {
    path,
    issues: [],
    _strict: true as const,
    get _speculative(): StandardSchemaV1.Issue[] | undefined {
      return speculative;
    },
    set _speculative(v: StandardSchemaV1.Issue[] | undefined) {
      speculative = v;
    },
    pushPath(segment: PropertyKey): void {
      path.push(segment);
    },
    popPath(): void {
      path.pop();
    },
    addIssue(message: string): void {
      if (speculative) {
        // Defensive path copy — matches non-strict addIssue.
        speculative.push(path.length > 0 ? { message, path: [...path] } : { message });
        return;
      }
      const pathStr = path.length > 0 ? ` at path: ${path.join(".")}` : "";
      throw new TypeError(`${message}${pathStr}`);
    },
  } as Context;
  return ctx;
}

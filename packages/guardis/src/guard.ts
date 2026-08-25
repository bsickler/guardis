/**
 * guard.ts
 * @module
 */

import type { StandardSchemaV1 } from "../specs/standard-schema-spec.v1.ts";
import type {
  CanBeEmpty,
  Context,
  ExtendedParser,
  HelpersWithContext,
  InferShape,
  IsExtensible,
  NamedParser,
  Parser,
  ParserEntry,
  Predicate,
  StrictTypeGuard,
  TypeGuard,
  TypeGuardShape,
  VerifiedShape,
} from "./types.ts";
import { createContext, createStrictContext } from "./context.ts";
import { hasContext, hasName } from "./introspect.ts";
import { GUARDIS_EXT, GUARDIS_PARENT, runConstructionHooks } from "./plugin.ts";
import type { GuardisPlugins } from "./plugin.ts";
import {
  doesNotHaveProperty,
  exact,
  formatErrorMessage,
  guardNameOrParens,
  hasOptionalProperty,
  hasProperty,
  includes,
  isEmptyValue,
  keyOf,
  safeStringify,
  tupleHas,
} from "./utilities.ts";

/**
 * Creates a helpers object for use in type guard parsers.
 * When ctx is provided, has/hasOptional/tupleHas push a path segment before calling
 * the utility and pop after (with try/finally, since strict mode throws on addIssue
 * and inner guards may propagate that throw). When ctx is undefined, they pass the
 * utility a raw undefined context for boolean-only validation.
 */
function createHelpers(ctx?: Context): HelpersWithContext {
  const has = <K extends PropertyKey, G = unknown>(
    t: object,
    k: K,
    guard?: (v: unknown) => v is G,
    errorMessage?: string,
  ): t is { [K2 in K]: G } => {
    if (!ctx) return hasProperty(t, k, guard, undefined, undefined);
    ctx.pushPath(k);
    try {
      return hasProperty(t, k, guard, ctx, errorMessage);
    } finally {
      ctx.popPath();
    }
  };

  const hasNot = <K extends PropertyKey>(
    t: object,
    k: K,
    errorMessage?: string,
  ): t is { [K2 in K]: never } => {
    if (!ctx) return doesNotHaveProperty(t, k, undefined, undefined);
    ctx.pushPath(k);
    try {
      return doesNotHaveProperty(t, k, ctx, errorMessage);
    } finally {
      ctx.popPath();
    }
  };

  const hasOptional = <K extends PropertyKey, G = unknown>(
    t: object,
    k: K,
    guard?: (v: unknown) => v is G,
    errorMessage?: string,
  ): t is { [K2 in K]+?: G } => {
    if (!ctx) return hasOptionalProperty(t, k, guard, undefined, undefined);
    ctx.pushPath(k);
    try {
      return hasOptionalProperty(t, k, guard, ctx, errorMessage);
    } finally {
      ctx.popPath();
    }
  };

  const tupleHasHelper = <T extends readonly unknown[], I extends number, G = unknown>(
    t: T,
    i: I,
    guard: (v: unknown) => v is G,
  ): t is T & { [K in I]: G } => {
    if (!ctx) return tupleHas(t, i, guard, undefined);
    ctx.pushPath(i);
    try {
      return tupleHas(t, i, guard, ctx);
    } finally {
      ctx.popPath();
    }
  };

  // Fork primitive: or(val, ...branches). Runtime behavior splits on whether a
  // Context is active (validate/strict vs. boolean mode).
  const or = <V>(
    val: V,
    // deno-lint-ignore no-explicit-any
    ...branches: ReadonlyArray<(v: V) => any>
  ): boolean => {
    if (!branches.length) {
      throw new Error("or() requires at least one branch");
    }

    // Boolean mode: trivial short-circuit.
    if (!ctx) {
      for (const branch of branches) {
        if (branch(val) === true) return true;
      }

      return false;
    }

    // Ctx-aware mode: speculation stack. Each branch runs with a scoped issue
    // buffer. A branch "succeeds" only if it returned strict `true` AND wrote
    // no issues (compensates for has()'s always-true-on-failure contract in
    // validate mode; see origin doc's "has() and or() interaction").
    const specCtx = ctx as Context & {
      _speculative?: StandardSchemaV1.Issue[];
      _strict?: true;
    };
    const collected: StandardSchemaV1.Issue[][] = [];

    for (const branch of branches) {
      const buf: StandardSchemaV1.Issue[] = [];
      const prev = specCtx._speculative;

      let ok: unknown;

      specCtx._speculative = buf;

      try {
        ok = branch(val);
      } finally {
        specCtx._speculative = prev;
      }

      if (ok === true && buf.length === 0) return true;

      collected.push(buf);
    }

    // All branches failed.
    if (specCtx._strict) {
      const combined = collected
        .map((list, i) => {
          const msgs = list.map((issue) => issue.message).join("; ");
          return `branch ${i}: ${msgs || "(no issue recorded)"}`;
        })
        .join(" | ");
      throw new TypeError(`or() — no branch matched: ${combined}`);
    }

    for (const list of collected) {
      for (const issue of list) ctx.issues.push(issue);
    }
    return false;
  };

  return {
    has,
    hasNot,
    hasOptional,
    tupleHas: tupleHasHelper,
    includes,
    keyOf: <T extends object>(k: unknown, t: T, errorMessage?: string) =>
      keyOf(k, t, ctx, ctx ? errorMessage : undefined),
    exact,
    fail: (message) => {
      if (ctx) ctx.addIssue(message);
      return null;
    },
    or,
    _ctx: ctx,
  } as HelpersWithContext;
}

/** Default helpers for boolean type guard calls (no validation context) */
const defaultHelpers = createHelpers();

/**
 * Returns cached helpers for a Context, creating them on first access.
 * Since the Context is a mutable cursor (one instance per validation call),
 * a single helpers object works for all guards in the call tree.
 */
function getHelpers(ctx: Context): HelpersWithContext {
  const c = ctx as Context & { _helpers?: HelpersWithContext };
  if (!c._helpers) c._helpers = createHelpers(ctx);
  return c._helpers;
}

/**
 * Checks if a value is a TypeGuardShape object (plain object, not a function).
 * Uses raw checks instead of isObject/isFunction to avoid temporal dead zone
 * issues — this function is called during createTypeGuard's implementation,
 * which runs before isObject and isFunction are initialized.
 */
function isTypeGuardShape(value: unknown): value is TypeGuardShape {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    typeof value !== "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Pre-compiled field descriptor. Built once at createTypeGuard time to avoid
 * per-call type dispatch and guard allocation in validateField.
 */
type FieldDescriptor =
  | { kind: "typeGuard"; key: string; guard: TypeGuard<unknown> }
  | { kind: "nested"; key: string; fields: FieldDescriptor[] }
  | { kind: "typePredicate"; key: string; guard: (value: unknown) => boolean }
  | { kind: "required"; key: string }
  | { kind: "absent"; key: string }
  // Union of alternative branches (emitted by probe when a parser uses or()).
  // No `key` — represents a choice across the whole value at this position.
  // Each branch is a FieldDescriptor[] that must all-pass for that branch to
  // match; any-branch-matches is sufficient for the union to pass.
  | { kind: "union"; branches: FieldDescriptor[][] };

/**
 * Compiles a TypeGuardShape into a pre-resolved array of field descriptors.
 * Classifies each field's guard type once and caches isExactly() guards for constants.
 */
function compileShape(shape: TypeGuardShape): FieldDescriptor[] {
  const descriptors: FieldDescriptor[] = [];

  for (const key of Object.keys(shape)) {
    const guard = shape[key];

    // Primitive constant — cache as a typeGuard wrapping isExactly
    if (guard === null || (typeof guard !== "object" && typeof guard !== "function")) {
      descriptors.push({ kind: "typeGuard", key, guard: isExactly(guard) });
      continue;
    }

    // Nested shape — recursively compile
    if (isTypeGuardShape(guard)) {
      descriptors.push({ kind: "nested", key, fields: compileShape(guard) });
      continue;
    }

    if (typeof guard !== "function") continue;

    // TypeGuard (with _.context for path tracking)
    if (hasContext(guard as Predicate<unknown>)) {
      descriptors.push({
        kind: "typeGuard",
        key,
        guard: guard as unknown as TypeGuard<unknown>,
      });
      continue;
    }

    // Plain type predicate function
    descriptors.push({ kind: "typePredicate", key, guard: guard as (value: unknown) => boolean });
  }

  return descriptors;
}

/**
 * Validates a single pre-compiled field descriptor against an object value.
 *
 * Path handling: `pushPath`/`popPath` is gated on `'key' in desc` so that future
 * non-keyed variants (e.g. union descriptors from `or()`) skip path tracking —
 * those are choices across the whole value, not property-scoped. Inside each
 * `case`, the switch has already narrowed `desc` to the specific variant, so
 * `desc.key` is type-safe without an extra guard.
 */
function validateCompiledField(
  obj: Record<string, unknown>,
  desc: FieldDescriptor,
  ctx: Context | undefined,
  localIssues: StandardSchemaV1.Issue[],
  result: Record<string, unknown>,
): void {
  if ("key" in desc && ctx) ctx.pushPath(desc.key);

  try {
    switch (desc.kind) {
      case "nested": {
        const r = validateCompiledShape(obj[desc.key], desc.fields, ctx);
        if ("value" in r) {
          result[desc.key] = r.value;
        } else if (!ctx) {
          localIssues.push(...r.issues);
        }
        break;
      }

      case "typeGuard": {
        if (ctx) {
          const r = desc.guard._.context(obj[desc.key], ctx);
          if ("value" in r) result[desc.key] = r.value;

          // Issues are already in ctx.issues — guards write directly via addIssue.
        } else {
          // No ctx — call without context arg to hit the bypass path (defaultHelpers,
          // no createContext/createHelpers allocation). Prepend the field key to paths.
          const r = desc.guard._.context(obj[desc.key]);
          if ("value" in r) {
            result[desc.key] = r.value;
          } else {
            for (const issue of r.issues) {
              localIssues.push({
                message: issue.message,
                path: issue.path ? [desc.key, ...issue.path] : [desc.key],
              });
            }
          }
        }
        break;
      }

      case "typePredicate": {
        if (desc.guard(obj[desc.key])) {
          result[desc.key] = obj[desc.key];
        } else {
          const message = `Validation failed for property "${String(desc.key)}"`;
          if (ctx) {
            ctx.addIssue(message);
          } else {
            localIssues.push({ message, path: [desc.key] });
          }
        }
        break;
      }
      case "required": {
        if (desc.key in obj) {
          result[desc.key] = obj[desc.key];
        } else {
          const message = `Missing required property: ${desc.key}`;
          if (ctx) {
            ctx.addIssue(message);
          } else {
            localIssues.push({ message, path: [desc.key] });
          }
        }
        break;
      }
      case "absent": {
        if (desc.key in obj) {
          const message = `Property must not be present: ${desc.key}`;
          if (ctx) {
            ctx.addIssue(message);
          } else {
            localIssues.push({ message, path: [desc.key] });
          }
        }
        break;
      }
      case "union": {
        // Unreachable today: tryCompileParser falls back to the original closure
        // whenever helpers._ctx is set (the validate/slow path), and shape-
        // compiled guards never produce union descriptors. Loud-fail so that
        // any future change to either invariant surfaces immediately instead
        // of silently miscompiling.
        throw new Error(
          "Internal: union descriptor reached validateCompiledField — " +
            "slow-path union handling is not implemented. " +
            "See docs/plans/2026-04-15-001-feat-or-helper-for-parser-forks-plan.md",
        );
      }
    }
  } finally {
    if ("key" in desc && ctx) ctx.popPath();
  }
}

/**
 * Fast path for shape validation when no context is provided.
 * Returns true/false without allocating result, issues, or Context objects.
 * Used by boolean guard calls (the common case) via compileShapeParser.
 */
function validateCompiledShapeBoolean(
  value: unknown,
  fields: FieldDescriptor[],
): boolean {
  if (!isRecord(value)) return false;

  for (let i = 0; i < fields.length; i++) {
    const desc = fields[i];

    switch (desc.kind) {
      case "nested": {
        if (!validateCompiledShapeBoolean(value[desc.key], desc.fields)) return false;
        break;
      }
      case "typeGuard": {
        // Call the raw boolean callback directly — no context, no helpers, no issues.
        if (!desc.guard(value[desc.key])) return false;
        break;
      }
      case "typePredicate": {
        if (!desc.guard(value[desc.key])) return false;
        break;
      }
      case "required": {
        if (!(desc.key in value)) return false;
        break;
      }
      case "absent": {
        if (desc.key in value) return false;
        break;
      }
      case "union": {
        // Any-branch-matches wins. Each branch is a FieldDescriptor[] that
        // must all pass for that branch to match. If no branch matches, the
        // whole union fails and this field — and thus the outer shape — fails.
        let matched = false;
        for (const branch of desc.branches) {
          if (validateCompiledShapeBoolean(value, branch)) {
            matched = true;
            break;
          }
        }
        if (!matched) return false;
        break;
      }
    }
  }
  return true;
}

/**
 * Slow path for shape validation when a context is provided.
 * Tracks issues and path information for .validate() calls.
 */
function validateCompiledShape(
  value: unknown,
  fields: FieldDescriptor[],
  ctx?: Context,
): StandardSchemaV1.Result<Record<string, unknown>> {
  if (!isRecord(value)) {
    const message = "Expected an object";

    if (!ctx) return { issues: [{ message }] };

    ctx.addIssue(message);
    return { issues: ctx.issues };
  }

  const result: Record<string, unknown> = {};

  if (ctx) {
    for (let i = 0; i < fields.length; i++) {
      validateCompiledField(value, fields[i], ctx, null!, result);
    }
    return ctx.issues.length > 0 ? { issues: ctx.issues } : { value: result };
  }

  const localIssues: StandardSchemaV1.Issue[] = [];
  for (let i = 0; i < fields.length; i++) {
    validateCompiledField(value, fields[i], undefined, localIssues, result);
  }
  return localIssues.length > 0 ? { issues: localIssues } : { value: result };
}

/**
 * Creates a type guard that strictly checks the type, throwing
 * a TypeError if it fails. Uses strict context for detailed error messages
 * with path information on nested validations.
 * @param parser The parser function to use for validation
 * @param name Optional name of the type guard for error messages
 * @returns A strict type guard that throws on failure
 */
const createStrictTypeGuard = <T>(
  parser: Parser<T>,
  name?: string,
): StrictTypeGuard<T> => {
  return (value: unknown, errorMsg?: string): value is T => {
    const ctx = createStrictContext();
    const helpers = getHelpers(ctx);
    const result = parser(value, helpers);

    if (result === null) {
      throw new TypeError(errorMsg ?? formatErrorMessage(value, name));
    }

    return true;
  };
};

/**
 * Creates a callback to construct a union type guard from two existing type guards.
 *
 * @template T1 - The type checked by the first type guard.
 * @template T2 - The type checked by the second type guard.
 *
 * @param guard - A type guard function that checks if a value is of type `T1`.
 * @returns A function that takes a second type guard `guardTwo` and returns a new
 * type guard that checks if a value is of type `T1 | T2`.
 *
 * @example
 * ```typescript
 * const isString = (value: unknown): value is string => typeof value === 'string';
 * const isNumber = (value: unknown): value is number => typeof value === 'number';
 *
 * const isStringOrNumber = createOrTypeGuard(isString)(isNumber);
 *
 * console.log(isStringOrNumber("hello")); // true
 * console.log(isStringOrNumber(42)); // true
 * console.log(isStringOrNumber(false)); // false
 * ```
 */
const createOrTypeGuard =
  <T1>(guard: Predicate<T1>) => <T2 extends Predicate<unknown>[]>(...others: T2) => {
    type R = T1 | (T2[number] extends Predicate<infer U> ? U : never);

    if (others.length === 0) return guard as TypeGuard<R>;

    const allGuards: Predicate<unknown>[] = [guard, ...others];

    // Build a union name from all named guards
    const names: string[] = [];
    for (const g of allGuards) {
      if (hasName(g)) names.push(g._.name!);
    }
    const name = names.length === allGuards.length ? names.join(" | ") : undefined;

    const parser = (v: unknown) => {
      for (const g of allGuards) {
        if (g(v)) return v === null ? true : v;
      }
      return null;
    };

    return (name ? createTypeGuard(name, parser) : createTypeGuard(parser)) as TypeGuard<R>;
  };

/**
 * Creates an optional variant of a type guard that accepts undefined.
 * The returned guard is context-aware for path tracking in shapes.
 *
 * @template T - The type checked by the base type guard.
 *
 * @param guard - The base type guard predicate to wrap.
 * @param parser - The parser function from the base type guard.
 * @param context - The context-aware validation function from the base type guard.
 * @returns A new type guard that checks if a value is of type `T | undefined`.
 *
 * @example
 * ```typescript
 * const optionalString = createOptionalTypeGuard(isString, stringParser, stringContext);
 *
 * console.log(optionalString("hello")); // true
 * console.log(optionalString(undefined)); // true
 * console.log(optionalString(42)); // false
 * ```
 */
const createOptionalTypeGuard = <T>(
  guard: Predicate<T>,
  parser: Parser<T>,
  context: (value: unknown, ctx?: Context) => StandardSchemaV1.Result<T>,
) => {
  const optional = (value: unknown): value is T | undefined => value === undefined || guard(value);

  const name = hasName(guard) ? `${guard._.name} | undefined` : undefined;
  const optionalParser: Parser<T | undefined> = (v, h) => v === undefined ? v : parser(v, h);
  const optionalContext = (value: unknown, ctx?: Context) =>
    value === undefined ? { value } : context(value, ctx ?? createContext());

  optional._ = {
    name,
    parser: optionalParser,
    context: optionalContext,
    optional: true as const,
  };

  optional.strict = createStrictTypeGuard(optionalParser, name);
  optional.assert = optional.strict;
  optional.validate = (value: unknown) => optionalContext(value, createContext());
  optional.or = createOrTypeGuard(optional);

  optional[GUARDIS_PARENT] = guard as TypeGuard<unknown>;
  optional[GUARDIS_EXT] = {} as GuardisPlugins<T | undefined>;
  runConstructionHooks(optional);

  return optional;
};

/**
 * Creates a notEmpty variant of a type guard that rejects empty values
 * (null, undefined, empty string, empty array, empty object).
 */
const createNotEmptyTypeGuard = <T>(guard: Predicate<T>) => {
  const notEmpty = (value: unknown): value is T => !isEmptyValue(value) && guard(value);
  const innerName = guardNameOrParens(guard as TypeGuard<T>);
  const name = innerName ? `non-empty ${innerName}` : undefined;
  const notEmptyParser = (value: unknown) => notEmpty(value) && guard(value) ? value : null;

  const context = (value: unknown, ctx?: Context): StandardSchemaV1.Result<T> => {
    if (notEmpty(value)) return { value };

    const message = formatErrorMessage(value, name);
    if (ctx) {
      ctx.addIssue(message);
      return { issues: ctx.issues };
    }

    return { issues: [{ message }] };
  };

  notEmpty._ = {
    name,
    parser: notEmptyParser,
    context,
  };

  notEmpty.strict = createStrictTypeGuard(notEmptyParser, name);
  notEmpty.assert = notEmpty.strict;
  notEmpty.validate = (value: unknown) => context(value, createContext());

  notEmpty.optional = createOptionalTypeGuard(notEmpty, notEmptyParser, context);

  notEmpty.or = createOrTypeGuard(notEmpty);

  notEmpty[GUARDIS_PARENT] = guard as TypeGuard<unknown>;
  notEmpty[GUARDIS_EXT] = {} as GuardisPlugins<T>;
  runConstructionHooks(notEmpty);

  return notEmpty as CanBeEmpty<T> extends false ? never : typeof notEmpty;
};

/**
 * Classifies a guard into a FieldDescriptor, reusing the same logic as compileShape.
 */
function classifyGuard(
  key: string,
  guard: ((v: unknown) => boolean) | TypeGuard<unknown>,
): FieldDescriptor {
  return hasContext(guard as Predicate<unknown>)
    ? { kind: "typeGuard", key, guard: guard as TypeGuard<unknown> }
    : { kind: "typePredicate", key, guard: guard as (value: unknown) => boolean };
}

/**
 * Attempts to auto-compile a parser callback into pre-compiled field descriptors.
 * Runs the parser once at creation time against a Proxy probe that records
 * has/hasOptional/hasNot calls. If the parser follows a compilable pattern
 * (isObject + unconditional has-chain, returning value unchanged), returns
 * a compiled parser equivalent to shape-based guards. Otherwise returns null
 * and the caller falls back to the original closure-based parser.
 */
function tryCompileParser<T1>(parser: Parser<T1>): Parser<T1> | null {
  // `fields` is a mutable holder rather than a closure-local const so that the
  // probe's `or` entry can swap in a fresh per-branch accumulator, run the
  // branch, and restore. Every probe helper push site references
  // `fieldsHolder.current` — not a captured `fields` variable — so swaps are
  // visible to `has`, `hasOptional`, `hasNot`, and nested `or`.
  const fieldsHolder: { current: FieldDescriptor[] } = { current: [] };
  let failed: boolean = false;

  const probe = new Proxy({} as Record<string, unknown>, {
    has() {
      return true;
    },
    get() {
      failed = true;
      return undefined;
    },
    ownKeys() {
      failed = true;
      return [];
    },
    set() {
      failed = true;
      return true;
    },
    deleteProperty() {
      failed = true;
      return true;
    },
  });

  const probeHelpers: HelpersWithContext = {
    has: ((_t: object, k: PropertyKey, guard?: (v: unknown) => boolean) => {
      if (failed) return true;

      if (guard) {
        fieldsHolder.current.push(classifyGuard(String(k), guard));
      } else {
        fieldsHolder.current.push({ kind: "required", key: String(k) });
      }
      return true;
    }) as HelpersWithContext["has"],
    hasOptional: ((_t: object, k: PropertyKey, guard?: (v: unknown) => boolean) => {
      if (failed) return true;

      if (guard && hasContext(guard as Predicate<unknown>)) {
        const g = guard as TypeGuard<unknown>;
        if (g.optional) {
          fieldsHolder.current.push({
            kind: "typeGuard",
            key: String(k),
            guard: g.optional as TypeGuard<unknown>,
          });
        } else {
          fieldsHolder.current.push(classifyGuard(String(k), guard));
        }
      } else if (guard) {
        fieldsHolder.current.push({ kind: "typePredicate", key: String(k), guard });
      }
      return true;
    }) as HelpersWithContext["hasOptional"],
    hasNot: ((_t: object, k: PropertyKey) => {
      if (failed) return true;

      fieldsHolder.current.push({ kind: "absent", key: String(k) });
      return true;
    }) as HelpersWithContext["hasNot"],
    tupleHas: (() => failed = true) as unknown as HelpersWithContext["tupleHas"],
    includes:
      ((arr: readonly unknown[], val: unknown) =>
        failed = true && arr.includes(val)) as HelpersWithContext["includes"],
    keyOf: (() => failed = true && false) as unknown as HelpersWithContext["keyOf"],
    exact: ((a: unknown, b: unknown) => failed = true && a === b) as HelpersWithContext["exact"],
    fail: (() => {
      failed = true;
      return null;
    }) as HelpersWithContext["fail"],
    or: ((
      _val: unknown,
      // deno-lint-ignore no-explicit-any
      ...branches: ReadonlyArray<(v: unknown) => any>
    ) => {
      if (failed) return true;
      if (branches.length === 0) return failed = true && false;

      const perBranchFields: FieldDescriptor[][] = [];
      for (const branch of branches) {
        // Save outer state.
        const savedFields: FieldDescriptor[] = fieldsHolder.current;
        const savedFailed: boolean = failed;

        // Install fresh per-branch accumulator.
        fieldsHolder.current = [];
        failed = false;

        try {
          branch(probe as unknown);
        } catch {
          // User branch threw — treat as uncompilable.
          failed = true;
        }

        const branchFields = fieldsHolder.current;
        const branchFailed = failed;

        // Restore outer state, OR'ing the branch's failed flag into outer.
        fieldsHolder.current = savedFields;
        failed = savedFailed || branchFailed;

        // Bail the whole `or` — caller will fall back to closure path.
        if (branchFailed) return true;

        // Empty branch: the branch called no compile-trackable helpers, so
        // its compiled semantics would be "matches anything" — which doesn't
        // match the branch's actual runtime behavior (e.g., a branch that
        // just returns false/undefined). Bail compilation to preserve
        // correctness.
        if (branchFields.length === 0) return failed = true;

        perBranchFields.push(branchFields);
      }

      fieldsHolder.current.push({ kind: "union", branches: perBranchFields });
      return true;
    }) as unknown as HelpersWithContext["or"],
    _ctx: undefined,
  };

  try {
    const result = parser(probe as unknown, probeHelpers);
    if (result !== probe || failed || fieldsHolder.current.length === 0) return null;
  } catch {
    return null;
  }

  // Snapshot the fields at compile time — the holder is mutable but compilation
  // is done, so we freeze a reference to what was accumulated.
  const fields = fieldsHolder.current;

  // Compilation succeeded — use compiled fields for the boolean fast path,
  // but fall back to the original parser for the validate path to preserve
  // exact behavioral parity (original object returned, custom error messages, etc.)
  return (val: unknown, helpers: HelpersWithContext) => {
    if (helpers._ctx === undefined) {
      return validateCompiledShapeBoolean(val, fields) ? (val as T1) : null;
    }

    // Validate path: use original parser to preserve exact error messages and return value
    return parser(val, helpers);
  };
}

/** Pre-compiles a shape into a parser that uses cached field descriptors. */
function compileShapeParser<T1>(shape: TypeGuardShape): Parser<T1> {
  const fields = compileShape(shape);

  return (val: unknown, helpers: HelpersWithContext) => {
    const ctx = helpers._ctx;
    // Fast path: no context means no issue tracking needed — skip all allocations
    // (result object, localIssues array, per-field Context instances, helpers objects).
    if (ctx === undefined) {
      return validateCompiledShapeBoolean(val, fields) ? (val as T1) : null;
    }
    // Slow path: caller wants issue tracking via .validate() or nested validation.
    const result = validateCompiledShape(val, fields, ctx);

    return "value" in result ? result.value as T1 : null;
  };
}

/**
 * Creates a type guard from a parser function.
 *
 * The parser should perform whatever checks are necessary to safely establish
 * that the input is of the specified type.
 *
 * Injects the `has` utility method as the second argument of any parser, as
 * a convenience to check if a property exists in an object.
 *
 * @param parser A function that returns the value if valid, or null if invalid.
 * @returns A type guard function with utility methods.
 *
 * @example
 * ```typescript
 * const parseString = (val: unknown): string | null => typeof val === 'string' ? val : null;
 * const isString = createTypeGuard(parseString);
 * ```
 */
export function createTypeGuard<T1>(parser: Parser<T1>): TypeGuard<T1>;
/**
 * Creates a type guard from a parser function with a custom type name.
 *
 * The name is used for error messages when the type guard fails.
 *
 * @param name The type name to use for error messages.
 * @param parser A function that returns the value if valid, or null if invalid.
 * @returns A type guard function with utility methods.
 *
 * @example
 * ```typescript
 * const isPositive = createTypeGuard("positive number", (val: unknown): number | null =>
 *   typeof val === 'number' && val > 0 ? val : null
 * );
 * ```
 */
export function createTypeGuard<T1>(name: string, parser: Parser<T1>): TypeGuard<T1>;
/**
 * Creates a type guard from a shape object.
 *
 * The shape maps property names to guard predicates or nested shapes.
 * The resulting type guard validates that an object matches the shape.
 *
 * @param shape A shape object mapping keys to guards or nested shapes.
 * @returns A type guard function with utility methods.
 *
 * @example
 * ```typescript
 * const isUser = createTypeGuard({ name: isString, age: isNumber });
 * ```
 */
export function createTypeGuard<const S extends TypeGuardShape>(shape: S): TypeGuard<InferShape<S>>;
/**
 * Creates a type guard from a shape object with a custom type name.
 *
 * @param name The type name to use for error messages.
 * @param shape A shape object mapping keys to guards or nested shapes.
 * @returns A type guard function with utility methods.
 */
export function createTypeGuard<const S extends TypeGuardShape>(
  name: string,
  shape: S,
): TypeGuard<InferShape<S>>;
/**
 * Creates a type guard from a shape object, verified against an explicit type parameter.
 *
 * The shape must match the structure of T1 — TypeScript will error if fields are
 * missing, extra, or have wrong guard types. The returned guard is typed as
 * `TypeGuard<T1>`, preserving your existing type as the source of truth.
 *
 * @param shape A shape object whose fields are verified against T1.
 * @returns A type guard function typed as TypeGuard<T1>.
 *
 * @example
 * ```typescript
 * type User = { id: number; name: string };
 * const isUser = createTypeGuard<User>({ id: isNumber, name: isString });
 * ```
 */
export function createTypeGuard<T1 extends Record<string, unknown>>(
  shape: VerifiedShape<T1>,
): TypeGuard<T1>;
/**
 * Creates a type guard from a shape object with a custom name, verified against
 * an explicit type parameter.
 *
 * @param name The type name to use for error messages.
 * @param shape A shape object whose fields are verified against T1.
 * @returns A type guard function typed as TypeGuard<T1>.
 */
export function createTypeGuard<T1 extends Record<string, unknown>>(
  name: string,
  shape: VerifiedShape<T1>,
): TypeGuard<T1>;
export function createTypeGuard<T1>(
  ...args: [Parser<T1> | TypeGuardShape] | [string, Parser<T1> | TypeGuardShape]
): TypeGuard<T1> {
  const parserOrShape = args.length === 1 ? args[0] : args[1];
  const name = args.length === 2 ? args[0] as string : undefined;
  return buildTypeGuard(parserOrShape, name);
}

/**
 * Shared construction body for createTypeGuard() and extend(). `parent` and
 * `ownShape`, when provided, are stamped on the guard BEFORE construction
 * hooks run -- the same ordering `.optional`/`.notEmpty` already use -- so a
 * hook inspecting either one during construction sees the real value, not
 * the pre-stamp default. `ownShape` lets extend()'s shape-based overload
 * retain the newly-added fields (not the parent's) at `_.shape`, since the
 * combined parser extend() builds is a function, not a shape, and would
 * otherwise leave `_.shape` unset the way any parser-built guard does.
 */
function buildTypeGuard<T1>(
  parserOrShape: Parser<T1> | TypeGuardShape,
  name: string | undefined,
  parent?: TypeGuard<unknown>,
  ownShape?: TypeGuardShape,
): TypeGuard<T1> {
  // Convert shape to parser, or try to auto-compile parser callbacks into
  // field descriptors for parity with shape-based performance.
  const parser: Parser<T1> = isTypeGuardShape(parserOrShape)
    ? compileShapeParser(parserOrShape)
    : tryCompileParser(parserOrShape) ?? parserOrShape;
  const shape = ownShape ?? (isTypeGuardShape(parserOrShape) ? parserOrShape : undefined);

  /**
   * Internal validation method that accepts a context for path tracking.
   * This is used by nested validations to propagate paths.
   *
   * Fast path: when no caller context is provided, reuse the module-level
   * defaultHelpers constant instead of allocating a fresh HelpersWithContext
   * (which would create 8 closures per call).
   */
  const context = (value: unknown, ctx?: Context): StandardSchemaV1.Result<T1> => {
    // Bypass path: no caller context, no issue tracking needed. Reuse defaultHelpers.
    if (ctx === undefined) {
      const result = parser(value, defaultHelpers);
      if (result !== null) {
        // Special case: isNull parser returns `true` when value is null
        return { value: result === true && value === null ? value as T1 : result };
      }
      return { issues: [{ message: formatErrorMessage(value, name) }] };
    }

    const issuesBefore = ctx.issues.length;
    const helpers = getHelpers(ctx);
    const result = parser(value, helpers);

    // If parser returned null and no child issues were added, add this guard's error
    if (result === null && ctx.issues.length === issuesBefore) {
      ctx.addIssue(formatErrorMessage(value, name));
    }

    // Check if THIS guard added any issues (not sibling issues from shared context)
    const hasNewIssues = ctx.issues.length > issuesBefore;

    if (result !== null && !hasNewIssues) {
      // Special case: isNull parser returns `true` when value is null
      return { value: result === true && value === null ? value as T1 : result };
    }

    // Return accumulated issues if this guard contributed any
    if (hasNewIssues) {
      return { issues: ctx.issues };
    }

    return { issues: [{ message: formatErrorMessage(value, name) }] };
  };

  const callback = (value: unknown): value is T1 => parser(value, defaultHelpers) !== null;
  callback._ = { name, parser, context, shape };

  /**
   * Creates a new type guard that checks if the value is of type T1 or T2.
   * This is useful for creating unions of types.
   * @param {Function} guard A type guard for T2
   * @returns {Function} A new type guard that checks if the value is of type T1 or T2
   */
  callback.or = createOrTypeGuard(callback);

  /**
   * Creates a new type guard by extending the current one with an additional parser.
   * The new type guard will first check if the value passes the original type guard,
   * and if it does, it will then apply the additional parser.
   * @param parser An additional parser to further validate the type.
   * @returns A new type guard that combines the original and additional parsers.
   */
  function extend<S extends TypeGuardShape>(shape: S): TypeGuard<T1 & InferShape<S>>;
  function extend<S extends TypeGuardShape>(name: string, shape: S): TypeGuard<T1 & InferShape<S>>;
  function extend<T2 extends T1>(parser: ExtendedParser<T1, T2>): TypeGuard<T2>;
  function extend<T2 extends T1>(name: string, parser: ExtendedParser<T1, T2>): TypeGuard<T2>;
  function extend<T2 extends T1>(
    ...args:
      | [ExtendedParser<T1, T2> | TypeGuardShape]
      | [string, ExtendedParser<T1, T2> | TypeGuardShape]
  ): TypeGuard<T2> {
    const parserOrShape = args.length === 1 ? args[0] : args[1];
    const extendName = args.length === 2 ? args[0] : undefined;

    // Build a combined parser that first checks the base guard, then the extension
    let combinedParser: Parser<T2>;
    let ownShape: TypeGuardShape | undefined;

    if (isTypeGuardShape(parserOrShape)) {
      const shapeGuard = createTypeGuard(parserOrShape);
      combinedParser = (v) => callback(v) && shapeGuard(v) ? v as T2 : null;
      ownShape = parserOrShape;
    } else {
      combinedParser = (v, h) => callback(v) ? parserOrShape(v, h) : null;
    }

    // Route through buildTypeGuard directly (not the public createTypeGuard)
    // so the parent reference and the newly-added fields' shape are stamped
    // BEFORE construction hooks run for the child -- see buildTypeGuard's doc.
    return buildTypeGuard<T2>(
      combinedParser,
      extendName,
      callback as unknown as TypeGuard<unknown>,
      ownShape,
    );
  }
  callback.extend = extend as IsExtensible<T1> extends false ? never : typeof extend;

  /**
   * Returns false if the value fails the "empty" type guard
   * or if it fails the parser.
   * @param {unknown} value
   * @returns
   */
  callback.notEmpty = createNotEmptyTypeGuard(callback);

  const optional = createOptionalTypeGuard(callback, parser, context) as
    & ReturnType<typeof createOptionalTypeGuard<T1>>
    & {
      notEmpty: typeof callback.notEmpty.optional;
    };

  optional.notEmpty = callback.notEmpty.optional;
  callback.optional = optional;

  /**
   * Throws a TypeError if the type guard fails. Optionally you may define an
   * error message to be included.
   * @param {unknown} value
   * @param {string?} errorMsg Optional
   * @returns
   */
  callback.strict = createStrictTypeGuard(parser, name);
  callback.assert = callback.strict;

  // StandardSchemaV1 compatibility - uses context-aware validation for path tracking
  callback.validate = (value: unknown) => context(value, createContext());

  // Branding: returns the same guard retyped as Brand<T, B>. Zero runtime cost.
  callback.brand = () => callback;

  callback["~standard"] = {
    version: 1,
    vendor: "guardis",
    validate: callback.validate,
    types: {} as StandardSchemaV1.Types<T1>,
  };

  // Reserved plugin extension slot. Always an empty object — guardis never
  // writes into it itself. See plugin.ts for what this is and isn't.
  callback[GUARDIS_EXT] = {} as GuardisPlugins<T1>;
  if (parent) callback[GUARDIS_PARENT] = parent;

  // Attach the type to the function for easy access
  const guard: TypeGuard<T1> = (<T1>(t: unknown): TypeGuard<T1> => t as TypeGuard<T1>)(callback);
  runConstructionHooks(guard);
  return guard;
}

function isParser(entry: ParserEntry): entry is Parser {
  return typeof entry === "function";
}

function isNamedParser(entry: ParserEntry): entry is NamedParser {
  return typeof entry === "object" && "parse" in entry && typeof entry.parse === "function";
}

/**
 * Converts a ParserEntry (parser function, named parser object, or shape) into a TypeGuard.
 * Shared by `batch` and `extend` to avoid duplicating entry detection logic.
 */
export function entryToGuard(entry: ParserEntry): TypeGuard<unknown> {
  if (isParser(entry)) return createTypeGuard(entry);
  if (isNamedParser(entry)) return createTypeGuard(entry.name, entry.parse);
  return createTypeGuard(entry);
}

/**
 * Returns true if input satisfies type null.
 *
 * Defined here (not in modules/primitives.ts, where the rest of the primitive
 * guards live) so that `isExactly` can return this exact guard for the `null`
 * case instead of rebuilding an equivalent parser -- primitives.ts imports
 * `createTypeGuard` from this module, so the reverse import would cycle.
 * Re-exported from primitives.ts to keep its public surface unchanged.
 *
 * @param {unknown} t
 * @return {boolean}
 */
export const isNull: TypeGuard<null> = createTypeGuard<null>(
  "null",
  (t: unknown) => (t === null ? true : null) as null,
);

/**
 * Returns true if input satisfies type undefined.
 *
 * Lives here alongside `isNull` for the same reason -- see its comment.
 *
 * @param {unknown} t
 * @return {boolean}
 */
export const isUndefined: TypeGuard<undefined> = createTypeGuard(
  "undefined",
  (t): undefined | null => t === undefined ? t : null,
);

/**
 * Returns a guard that checks if a value strictly equals the given constant.
 * Narrows the TypeScript type to the exact literal type of the argument.
 *
 * @example
 * isExactly('admin')('admin') // true — narrows to 'admin'
 * isExactly(42)(43)           // false
 * isExactly(null)(null)       // true — narrows to null
 */
export function isExactly<const T>(expected: T): TypeGuard<T> {
  if (expected === null) return isNull as TypeGuard<T>;
  if (expected === undefined) return isUndefined as TypeGuard<T>;

  return createTypeGuard(
    safeStringify(expected),
    (t): T | null => exact(expected, t) ? expected : null,
  );
}

/**
 * Factory that returns a TypeGuard for `instanceof` checks against a
 * class constructor. Generalizes the pattern behind `isDate`, `isNativeURL`,
 * etc. so consumers can build guards for their own classes without writing
 * a custom parser.
 *
 * @example
 * ```typescript
 * class MyService {}
 * const isMyService = isInstanceOf(MyService);
 * isMyService(new MyService()); // true, narrows to MyService
 * isMyService({});               // false
 *
 * class CustomError extends Error {}
 * const isCustomError = isInstanceOf(CustomError);
 * ```
 *
 * @param ctor The class constructor to check against.
 * @param name Optional name for error messages. Defaults to `ctor.name`.
 * @returns A TypeGuard<T> where T is the constructor's instance type.
 */
// deno-lint-ignore no-explicit-any
export function isInstanceOf<T>(ctor: new (...args: any[]) => T, name?: string): TypeGuard<T> {
  return createTypeGuard(
    name ?? ctor.name ?? "instance",
    (t): T | null => t instanceof ctor ? t : null,
  );
}

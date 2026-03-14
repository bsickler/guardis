import { validator } from "hono/validator";
import type { Env, MiddlewareHandler, ValidationTargets } from "hono/types";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { isArray, isFunction, isObject, type TypeGuard } from "@spudlabs/guardis";

type ValidationTargetKeysWithBody = "form" | "json";

/** The path segment interface of a validation issue. */
export interface ValidationPathSegment {
  /** The key representing a path segment. */
  readonly key: PropertyKey;
}

/** A validation issue from StandardSchemaV1. */
export interface ValidationIssue {
  /** The error message of the issue. */
  readonly message: string;
  /** The path of the issue, if any. */
  readonly path?: ReadonlyArray<PropertyKey | ValidationPathSegment> | undefined;
}

/** Context provided to the error formatting callback */
export interface ValidationErrorContext {
  target: string;
  issues: ReadonlyArray<ValidationIssue>;
  message: string;
  value: unknown;
}

/** Callback type for formatting validation errors */
export type ErrorFormatter = (ctx: ValidationErrorContext) => {
  body: unknown;
  status?: ContentfulStatusCode;
};

/** Options for creating a custom describeInput */
export interface DescribeInputOptions {
  formatError?: ErrorFormatter;
}

type ValidationTargetByMethod<M> = M extends "get" | "head"
  ? Exclude<keyof ValidationTargets, ValidationTargetKeysWithBody>
  : keyof ValidationTargets;

// deno-lint-ignore no-explicit-any
type GuardPredicate = ((value: unknown) => boolean) & { validate?: (value: unknown) => any };

/** A shape object mapping property names to guard predicates or nested shapes. */
export type GuardShape = { [key: string]: GuardPredicate | GuardShape };

// deno-lint-ignore ban-types
type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** Infers the validated type from a GuardShape. */
type InferShape<S extends GuardShape> = Simplify<{
  [K in keyof S]: S[K] extends TypeGuard<infer T> ? T
    : S[K] extends (value: unknown) => value is infer T ? T
    : S[K] extends GuardShape ? InferShape<S[K]>
    : never;
}>;

/** Type of the describeInput function - preserves full Hono type inference */
interface DescribeInputFn {
  // Overload 1: Shape object
  <
    S extends GuardShape,
    OutputType = InferShape<S>,
    M extends string = string,
    T extends ValidationTargetByMethod<M> = ValidationTargetByMethod<M>,
    // deno-lint-ignore no-explicit-any
    E extends Env = any,
  >(
    target: T,
    shape: S,
    transformFn?: (input: InferShape<S>) => OutputType,
  ): MiddlewareHandler<E, string, { in: { [K in T]: OutputType }; out: { [K in T]: OutputType } }>;

  // Overload 2: TypeGuard (existing)
  <
    ValidationType,
    OutputType = ValidationType,
    M extends string = string,
    T extends ValidationTargetByMethod<M> = ValidationTargetByMethod<M>,
    // deno-lint-ignore no-explicit-any
    E extends Env = any,
  >(
    target: T,
    validationFn: TypeGuard<ValidationType>,
    transformFn?: (input: ValidationType) => OutputType,
  ): MiddlewareHandler<E, string, { in: { [K in T]: OutputType }; out: { [K in T]: OutputType } }>;
}

function isGuardShape(value: unknown): value is GuardShape {
  return isObject(value) && !isFunction(value);
}

function validateShape(
  value: unknown,
  shape: GuardShape,
  path: PropertyKey[] = [],
): { value: Record<string, unknown> } | { issues: ValidationIssue[] } {
  if (!isObject(value) || isArray(value)) {
    return { issues: [{ message: "Expected an object", path: [...path] }] };
  }
  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const issues: ValidationIssue[] = [];

  for (const key of Object.keys(shape)) {
    const guard = shape[key];
    const currentPath = [...path, key];

    if (isFunction(guard)) {
      if ("validate" in guard && isFunction(guard.validate)) {
        const r = guard.validate(obj[key]);
        if ("value" in r) {
          result[key] = r.value;
        } else {
          for (const issue of r.issues) {
            issues.push({
              message: issue.message,
              path: issue.path ? [...currentPath, ...issue.path] : currentPath,
            });
          }
        }
      } else {
        if (guard(obj[key])) {
          result[key] = obj[key];
        } else {
          issues.push({
            message: `Validation failed for property "${String(key)}"`,
            path: currentPath,
          });
        }
      }
    } else {
      const r = validateShape(obj[key], guard, currentPath);
      if ("value" in r) {
        result[key] = r.value;
      } else {
        issues.push(...r.issues);
      }
    }
  }

  return issues.length > 0 ? { issues } : { value: result };
}

/**
 * Creates a customized describeInput function with custom error handling.
 *
 * @example
 * ```typescript
 * const customDescribeInput = createDescribeInput({
 *   formatError: (ctx) => ({
 *     body: {
 *       code: 'VALIDATION_ERROR',
 *       details: ctx.issues.map(i => ({
 *         path: i.path?.join('.') ?? 'root',
 *         message: i.message,
 *       })),
 *     },
 *     status: 422,
 *   }),
 * });
 * ```
 */
export function createDescribeInput({ formatError }: DescribeInputOptions = {}): DescribeInputFn {
  return ((
    target: keyof ValidationTargets,
    // deno-lint-ignore no-explicit-any
    validationFnOrShape: TypeGuard<any> | GuardShape,
    // deno-lint-ignore no-explicit-any
    transformFn?: (input: any) => any,
  ) => {
    return validator(target, (value, c) => {
      const result = isGuardShape(validationFnOrShape)
        ? validateShape(value, validationFnOrShape)
        : validationFnOrShape.validate(value);

      if ("value" in result) {
        return transformFn ? transformFn(result.value) : result.value;
      }

      const message = `Input validation failed for target: ${target}`;

      if (formatError) {
        const { body, status = 400 } = formatError({
          target,
          issues: result.issues,
          message,
          value,
        });
        return c.json(body, status);
      }

      return c.json({ message, issues: result.issues }, 400);
    });
    // deno-lint-ignore no-explicit-any
  }) as any;
}

/**
 * Describes and validates input for a specific validation target.
 *
 * This function is a higher-order utility that wraps a validation process
 * for a given input type and validation target. It ensures that the input
 * conforms to the expected structure and type, and provides a mechanism
 * to handle validation failures.
 *
 * @template P - A string parameter representing additional context or path.
 * @template M - A string parameter representing the validation method.
 * @template U - The validation target, which is a key in `ValidationTargetByMethod<M>`.
 *
 * @param target - The validation target, which determines the type of validation to perform.
 * @param validationFn - A type guard function that validates the input and returns a boolean.
 *
 * @returns A validator function that validates the input and either returns the validated value
 *          or responds with an error message and a 400 status code if validation fails.
 *
 * @example
 * ```typescript
 * const validateJsonInput = describeInput(
 *   'json',
 *   (value): value is MyExpectedType => {
 *     return typeof value === 'object' && value !== null;
 *   }
 * );
 * ```
 */
export const describeInput: DescribeInputFn = createDescribeInput();

import { validator } from "hono/validator";
import type { Env, MiddlewareHandler, ValidationTargets } from "hono/types";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { TypeGuard } from "@spudlabs/guardis";

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

/** Type of the describeInput function - preserves full Hono type inference */
export type DescribeInputFn = <
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
) => MiddlewareHandler<E, string, { in: { [K in T]: OutputType }; out: { [K in T]: OutputType } }>;

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
    validationFn: TypeGuard<any>,
    // deno-lint-ignore no-explicit-any
    transformFn?: (input: any) => any,
  ) => {
    return validator(target, (value, c) => {
      const result = validationFn.validate(value);

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

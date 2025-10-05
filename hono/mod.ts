import { validator } from "hono/validator";
import type { Env, MiddlewareHandler, TypedResponse, ValidationTargets } from "hono/types";
import type { TypeGuard } from "@spudlabs/guardis";

type ValidationTargetKeysWithBody = "form" | "json";

type ValidationTargetByMethod<M> = M extends "get" | "head"
  ? Exclude<keyof ValidationTargets, ValidationTargetKeysWithBody>
  : keyof ValidationTargets;

// deno-lint-ignore no-explicit-any
type ExcludeResponseType<T> = T extends Response & TypedResponse<any> ? never
  : T;

/**
 * Describes and validates input for a specific validation target.
 *
 * This function is a higher-order utility that wraps a validation process
 * for a given input type and validation target. It ensures that the input
 * conforms to the expected structure and type, and provides a mechanism
 * to handle validation failures.
 *
 * @template InputType - The type of the input data to be validated.
 * @template P - A string parameter representing additional context or path.
 * @template M - A string parameter representing the validation method.
 * @template U - The validation target, which is a key in `ValidationTargetByMethod<M>`.
 * @template OutputType - The expected output type after validation.
 * @template OutputTypeExcludeResponseType - The output type excluding response-specific fields.
 * @template P2 - A secondary string parameter, defaulting to `P`.
 * @template V - The validation schema for input and output, inferred from `U`.
 * @template E - The environment type, defaulting to `any`.
 *
 * @param target - The validation target, which determines the type of validation to perform.
 * @param fn - A type guard function that validates the input and returns a boolean.
 *
 * @returns A validator function that validates the input and either returns the validated value
 *          or responds with an error message and a 400 status code if validation fails.
 *
 * @example
 * ```typescript
 * const validateJsonInput = describeInput<'json', 'path', 'method', 'json'>(
 *   'json',
 *   (value): value is MyExpectedType => {
 *     return typeof value === 'object' && value !== null;
 *   }
 * );
 * ```
 */
export const describeInput = <
  InputType,
  P extends string,
  M extends string,
  U extends ValidationTargetByMethod<M>,
  OutputType = ValidationTargets[U],
  OutputTypeExcludeResponseType = ExcludeResponseType<OutputType>,
  P2 extends string = P,
  V extends {
    in: {
      [K in U]: K extends "json" ? unknown extends InputType ? OutputTypeExcludeResponseType
        : InputType
        : {
          [K2 in keyof OutputTypeExcludeResponseType]: ValidationTargets[K][K2];
        };
    };
    out: {
      [K in U]: OutputTypeExcludeResponseType;
    };
  } = {
    in: {
      [K in U]: K extends "json" ? unknown extends InputType ? OutputTypeExcludeResponseType
        : InputType
        : {
          [K2 in keyof OutputTypeExcludeResponseType]: ValidationTargets[K][K2];
        };
    };
    out: {
      [K in U]: OutputTypeExcludeResponseType;
    };
  },
  // deno-lint-ignore no-explicit-any
  E extends Env = any,
>(
  target: U,
  fn: TypeGuard<OutputType>,
): MiddlewareHandler<E, P, V> =>
  validator<InputType, P, M, U, OutputType, OutputTypeExcludeResponseType, P2, V, E>(
    target,
    (value, c) => {
      if (fn(value)) return value;

      return c.json(
        { message: `Input validation failed for target: ${target}` },
        400,
      );
    },
  );

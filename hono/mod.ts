import { validator } from "hono/validator";
import type { ValidationTargets } from "hono/types";
import type { TypeGuard } from "@spudlabs/guardis";

type ValidationTargetKeysWithBody = "form" | "json";

type ValidationTargetByMethod<M> = M extends "get" | "head"
  ? Exclude<keyof ValidationTargets, ValidationTargetKeysWithBody>
  : keyof ValidationTargets;

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
export const describeInput = <
  ValidationType,
  OutputType = ValidationType,
  M extends string = string,
  // deno-lint-ignore no-explicit-any
  T extends ValidationTargetByMethod<M> = any,
>(
  target: T,
  validationFn: TypeGuard<ValidationType>,
  transformFn?: (input: ValidationType) => OutputType,
) => {
  return validator(target, (value, c): OutputType | Response => {
    if (validationFn(value)) return transformFn ? transformFn(value) : value;

    return c.json({ message: `Input validation failed for target: ${target}` }, 400);
  });
};

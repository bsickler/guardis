import { createTypeGuard } from "./guard.ts";
import type { InferShape, Parser, TypeGuard, TypeGuardShape } from "./types.ts";

/**
 * Creates a nominal type by intersecting a base type `T` with a unique brand `B`.
 * This helps distinguish between types that are structurally identical but conceptually different.
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/**
 * Removes the property with the key `brand` from the given type `T`.
 */
export type RemoveBrand<T> = T extends string ? string
  : T extends number ? number
  : T extends Record<infer K, infer V> ? Record<Exclude<K, "__brand">, V>
  : T extends (infer U)[] ? U[]
  : T extends object ? { [P in Exclude<keyof T, "__brand">]: T[P] }
  : T[Exclude<keyof T, "__brand">];

/**
 * Creates a type guard for branded types, allowing runtime validation of nominal types.
 *
 * Branded types (also known as nominal types) are a TypeScript pattern that allows
 * distinguishing between types that are structurally identical but conceptually different.
 * This function creates a type guard that validates the underlying type while preserving
 * the brand in the type system.
 *
 * @template T1 - The base type or a branded type
 * @template B - The brand string (when using the first overload)
 *
 * @param parse - A parser function that validates the underlying type (without the brand)
 * @returns A TypeGuard that validates the value and narrows it to the branded type
 *
 * @example
 * ```typescript
 * // Define branded types
 * type UserId = Brand<string, "UserId">;
 * type ProductId = Brand<string, "ProductId">;
 *
 * // Create parsers for the underlying type
 * const parseUserId = (val: unknown): string | null =>
 *   typeof val === "string" && val.startsWith("user_") ? val : null;
 *
 * // Create branded type guards
 * const isUserId = createBrandedTypeGuard<string, "UserId">(parseUserId);
 * const isProductId = createBrandedTypeGuard<ProductId>(isString._parser);
 *
 * // Create a named branded type guard (name infers the brand and appears in error messages)
 * const isNamedUserId = createBrandedTypeGuard("UserId", parseUserId);
 *
 * // Create a branded type guard from a shape
 * const isBrandedUser = createBrandedTypeGuard("User", { name: isString, age: isNumber });
 *
 * // Use the type guards
 * const id: unknown = "user_123";
 * if (isUserId(id)) {
 *   // id is now typed as UserId
 *   const userId: UserId = id;
 * }
 * ```
 */
export function createBrandedTypeGuard<S extends TypeGuardShape, B extends string>(
  name: B,
  shape: S,
): TypeGuard<Brand<InferShape<S>, B>>;
export function createBrandedTypeGuard<S extends TypeGuardShape, B extends string>(
  shape: S,
): TypeGuard<Brand<InferShape<S>, B>>;
export function createBrandedTypeGuard<T1, B extends string>(
  name: B,
  parse: Parser<T1>,
): TypeGuard<Brand<T1, B>>;
export function createBrandedTypeGuard<T1, B extends string>(
  parse: Parser<T1>,
): TypeGuard<Brand<T1, B>>;
export function createBrandedTypeGuard<T1 extends Brand<unknown, string>>(
  parse: Parser<RemoveBrand<T1>>,
): TypeGuard<T1>;
export function createBrandedTypeGuard<T1 extends Brand<unknown, string>>(
  ...args:
    | [Parser<RemoveBrand<T1>>]
    | [string, Parser<RemoveBrand<T1>>]
    | [TypeGuardShape]
    | [string, TypeGuardShape]
): TypeGuard<T1> {
  const parserOrShape = args.length === 2 ? args[1] : args[0];
  const name = args.length === 2 ? args[0] as string : undefined;
  if (name !== undefined) {
    return createTypeGuard<T1>(name, parserOrShape as unknown as Parser<T1>);
  }
  return createTypeGuard<T1>(parserOrShape as unknown as Parser<T1>);
}

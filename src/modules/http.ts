import { createTypeGuard } from "../guard.ts";

/**
 * Returns true if input is an instance of the native URL
 * class.
 * @param {unknown} t
 * @return {boolean}
 */
export const isURL = createTypeGuard((t: unknown) => {
  return t instanceof URL ? t : null;
});

/**
 * Returns true if input is an instance of the native Request
 * class.
 * @param {unknown} t
 * @return {boolean}
 */
export const isRequest = createTypeGuard((t: unknown) => {
  return t instanceof Request ? t : null;
});

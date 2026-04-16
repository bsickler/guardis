/**
 * Type guards for the Web Streams API.
 *
 * @see https://streams.spec.whatwg.org/ — WHATWG Streams Standard
 * @module
 */

import { createTypeGuard } from "../guard.ts";
import type { TypeGuard } from "../types.ts";

/**
 * Returns true if input is an instance of the native ReadableStream class.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
 */
export const isReadableStream: TypeGuard<ReadableStream> = createTypeGuard(
  "ReadableStream",
  (t: unknown) => t instanceof ReadableStream ? t : null,
);

/**
 * Returns true if input is an instance of the native WritableStream class.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WritableStream
 */
export const isWritableStream: TypeGuard<WritableStream> = createTypeGuard(
  "WritableStream",
  (t: unknown) => t instanceof WritableStream ? t : null,
);

/**
 * Returns true if input is an instance of the native TransformStream class.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TransformStream
 */
export const isTransformStream: TypeGuard<TransformStream> = createTypeGuard(
  "TransformStream",
  (t: unknown) => t instanceof TransformStream ? t : null,
);

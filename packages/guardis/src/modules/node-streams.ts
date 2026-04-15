/**
 * Type guards for Node.js streams (from `node:stream`).
 *
 * Node streams are distinct from the WHATWG Web Streams API exposed in
 * `streams.ts`. Use these guards when working with Node's legacy streaming
 * primitives (pipes, event-based `data`/`end`, etc.).
 *
 * This module imports from `node:stream` and is therefore only available in
 * runtimes that support Node built-ins (Node, Deno with `--compat` or recent
 * versions, Bun). It will not load in browsers.
 *
 * @see https://nodejs.org/api/stream.html
 * @module
 */

import { Duplex, Readable, Transform, Writable } from "node:stream";
import { createTypeGuard } from "../guard.ts";
import type { TypeGuard } from "../types.ts";

/**
 * Returns true if input is an instance of Node's `stream.Readable`.
 * Because `Duplex` and `Transform` extend `Readable`, instances of those
 * classes will also pass this guard.
 *
 * @see https://nodejs.org/api/stream.html#class-streamreadable
 */
export const isNodeReadable: TypeGuard<Readable> = createTypeGuard(
  "node:stream.Readable",
  (t: unknown) => t instanceof Readable ? t : null,
);

/**
 * Returns true if input is an instance of Node's `stream.Writable`.
 * Note: `Duplex` instances do not pass this check on all Node versions
 * because `Duplex` extends `Readable` and composes `Writable` via a mixin.
 *
 * @see https://nodejs.org/api/stream.html#class-streamwritable
 */
export const isNodeWritable: TypeGuard<Writable> = createTypeGuard(
  "node:stream.Writable",
  (t: unknown) => t instanceof Writable ? t : null,
);

/**
 * Returns true if input is an instance of Node's `stream.Duplex`.
 * Because `Transform` extends `Duplex`, Transform instances also pass.
 *
 * @see https://nodejs.org/api/stream.html#class-streamduplex
 */
export const isNodeDuplex: TypeGuard<Duplex> = createTypeGuard(
  "node:stream.Duplex",
  (t: unknown) => t instanceof Duplex ? t : null,
);

/**
 * Returns true if input is an instance of Node's `stream.Transform`.
 *
 * @see https://nodejs.org/api/stream.html#class-streamtransform
 */
export const isNodeTransform: TypeGuard<Transform> = createTypeGuard(
  "node:stream.Transform",
  (t: unknown) => t instanceof Transform ? t : null,
);

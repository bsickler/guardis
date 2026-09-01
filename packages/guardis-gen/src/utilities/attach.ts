/**
 * attach.ts - A single, minimal escape hatch for installing a new own-
 * property method on a guard whose declared type (`ConstructedGuard`,
 * deliberately narrow -- see plugin.ts's doc in core) doesn't know about it
 * yet. Shared by shared.ts/define-generator.ts/or.ts so none of them repeats
 * its own inline `(guard as unknown as { name: Fn }).name = value` cast.
 * @module
 */
import type { ConstructedGuard } from "@spudlabs/guardis";

/** Installs `value` as an own property named `name` on `guard`. */
export function attachMethod<T>(guard: ConstructedGuard, name: string, value: T): void {
  (guard as unknown as Record<string, T>)[name] = value;
}

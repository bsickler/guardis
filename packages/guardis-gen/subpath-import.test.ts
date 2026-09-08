// Every other test imports this package's own modules by relative path
// (./src/modules/primitives.ts), so deno.json's `exports` map -- the shape a
// real published consumer actually imports through -- is otherwise never
// exercised. A typo there would ship silently. This test imports via the
// real subpath specifiers instead, so a broken export is caught here.
import "@spudlabs/guardis-gen";
import "@spudlabs/guardis-gen/modules/primitives";

import { assertEquals } from "@std/assert";
import { createTypeGuard, isString } from "@spudlabs/guardis";
import { seed } from "@spudlabs/guardis-gen";

Deno.test("generation works when guardis-gen is imported by its published subpath specifiers", () => {
  const isUser = createTypeGuard({ name: isString });
  seed("subpath-import");
  const a = isUser.generate();
  seed("subpath-import");
  const b = isUser.generate();
  assertEquals(a, b);
});

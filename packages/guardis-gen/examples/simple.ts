/**
 * examples/simple.ts - The smallest useful tour of guardis-gen: derive
 * sample data straight from guardis type guards, no registration ceremony
 * beyond importing the modules you're using. Run with:
 *
 *   deno run examples/simple.ts
 */
import "@spudlabs/guardis-gen";
import "@spudlabs/guardis-gen/modules/primitives";
import "@spudlabs/guardis-gen/modules/strings";

import { createTypeGuard, isBoolean, isDate, isNumber, isString } from "@spudlabs/guardis";
import { isEmail } from "@spudlabs/guardis/strings";

function section(title: string): void {
  console.log(`\n--- ${title} ---`);
}

// --- 1. Generate a value straight from a primitive guard --------------------

section("1. Primitive guards");

console.log("isString.generate():", isString.generate());
console.log("isNumber.generate():", isNumber.generate());
console.log("isBoolean.generate():", isBoolean.generate());
console.log("isDate.generate():", isDate.generate());

// --- 2. Chain methods narrow what gets generated, same as they narrow what
//        the guard accepts --------------------------------------------------

section("2. Constrained guards");

console.log("isString.min(5).max(10).generate():", isString.min(5).max(10).generate());
console.log("isNumber.gt(0).lt(1).generate():", isNumber.gt(0).lt(1).generate());

// --- 3. A format guard's generator produces values shaped like the real
//        thing, not just an arbitrary string ---------------------------------

section("3. Format guards");

console.log("isEmail.generate():", isEmail.generate());

// --- 4. createTypeGuard(shape) builds a matching object guard AND a
//        matching generator, from the same shape -----------------------------

section("4. Object guards");

const isUser = createTypeGuard({
  name: isString,
  age: isNumber.gte(0),
  isActive: isBoolean,
});

const user = isUser.generate();
console.log("isUser.generate():", user);
console.log("isUser(user):", isUser(user));

// --- 5. Call-time options override a guard's registered constraints, for
//        that one call only --------------------------------------------------

section("5. Call-time options");

console.log("isString.generate({ ofLength: 8 }):", isString.generate({ ofLength: 8 }));

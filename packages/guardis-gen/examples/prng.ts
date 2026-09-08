/**
 * examples/prng.ts - Runnable tour of guardis-gen's seedable PRNG:
 * `seed()`, the low-level primitives (`next`/`randomInt`/`pick`/
 * `randomBoolean`), and how they combine with generation features
 * (structural specs, `.defineGenerator()`, format guards). Run with:
 *
 *   deno run examples/prng.ts
 */
import "@spudlabs/guardis-gen";
import "@spudlabs/guardis-gen/modules/primitives";
import "@spudlabs/guardis-gen/modules/strings";
import "@spudlabs/guardis-gen/modules/collections";

import { createTypeGuard, isArray, isBoolean, isNumber, isString } from "@spudlabs/guardis";
import { isEmail, isUUIDv4 } from "@spudlabs/guardis/strings";
import { next, pick, randomBoolean, randomInt, seed } from "@spudlabs/guardis-gen";

function section(title: string): void {
  console.log(`\n--- ${title} ---`);
}

// --- 1. seed() makes structural generation reproducible --------------------
// Any spec-driven guard -- strings, numbers, dates, arrays, objects, unions,
// optionals -- draws from the same seedable generator under the hood, so
// reseeding to the same value replays the exact same output.

section("1. seed() + a structural (object) guard");

const isUser = createTypeGuard({
  id: isNumber,
  name: isString,
  active: isBoolean,
  tags: isArray.of(isString),
  nickname: isString.optional,
});

seed(20260828);
const user1 = isUser.generate();
seed(20260828);
const user2 = isUser.generate();

console.log("user1:", user1);
console.log("user2:", user2);
console.log("identical:", JSON.stringify(user1) === JSON.stringify(user2));

// --- 2. seed() also covers built-in format generators -----------------------
// isUUIDv4/isEmail/etc. are bound via .defineGenerator(), but those built-in
// generators are themselves written against guardis-gen's own primitives, so
// they're reproducible too, with no extra work.

section("2. seed() + built-in format guards (isUUIDv4, isEmail)");

seed("format-demo");
console.log("uuid:", isUUIDv4.generate(), " email:", isEmail.generate());
seed("format-demo");
console.log("uuid:", isUUIDv4.generate(), " email:", isEmail.generate());

// --- 3. Low-level primitives, used directly ---------------------------------
// next()/randomInt()/pick()/randomBoolean() are the same primitives every
// built-in generator is built from -- useful on their own for anything that
// isn't shaped like a guard.

section("3. Low-level primitives");

seed(1);
console.log("next():", next());
console.log("randomInt(1, 6) (a die roll):", randomInt(1, 6));
console.log("pick(['red', 'green', 'blue']):", pick(["red", "green", "blue"]));
console.log("randomBoolean(0.9) (90% true):", randomBoolean(0.9));

// --- 4. A custom .defineGenerator() built on the same primitives ------------
// Any custom generator that reaches for these primitives (instead of raw
// Math.random()) automatically participates in seed()'s reproducibility --
// no separate opt-in mechanism needed.

section("4. A seedable custom generator");

const isProductSku = createTypeGuard(
  "ProductSku",
  (v: unknown): string | null => typeof v === "string" && /^[A-Z]-\d{4}$/.test(v) ? v : null,
);
isProductSku.defineGenerator(() => `${pick(["A", "B", "C"])}-${randomInt(1000, 9999)}`);

seed(42);
const sku1 = isProductSku.generate();
seed(42);
const sku2 = isProductSku.generate();
console.log("sku1:", sku1, " sku2:", sku2, " identical:", sku1 === sku2);

// --- 5. Reseeding per fixture, for stable test data -------------------------
// Reseeding before each fixture keeps fixtures independent of call order and
// independent of unrelated code paths consuming randomness in between --
// each block below always sees the same sequence starting from its own seed.

section("5. Independent, reseeded fixtures");

function userFixture(fixtureSeed: number | string) {
  seed(fixtureSeed);
  return isUser.generate();
}

console.log("fixture 'alice':", userFixture("alice"));
console.log("fixture 'bob':", userFixture("bob"));
console.log("fixture 'alice' again:", userFixture("alice"));

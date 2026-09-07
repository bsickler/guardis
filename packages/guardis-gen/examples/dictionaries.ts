/**
 * examples/dictionaries.ts - Drawing generated values from a named pool
 * ("dictionary") instead of blind random strings/numbers, and how it relates
 * to `defineGenerator()`/`generate()`.
 *
 * A `Dictionary<T>` is anything with a `pick(): T` method -- see
 * `Dictionary.of()` below -- and it's parameterized by the exact type it
 * produces, so a `Dictionary<string>` can be handed to a string field but not
 * a number one, and a plain `Dictionary<string>` can't be handed to a branded
 * type (like an email or a UUID) without going through validation first. Run
 * with:
 *
 *   deno run examples/dictionaries.ts
 *
 * The `// =>` block under each section is real output from one run. Generation
 * is random, so the VALUES differ every run except where a dictionary of size
 * one pins them down.
 *
 * `defineGenerator()` registers PERMANENTLY on whatever guard it's called
 * on -- calling it directly on a bare, shared primitive like `isString`
 * would silently change every OTHER `isString` field in the same process,
 * including this package's own built-in bindings (isEmail, isUUIDv4, ...).
 * Sections 3-4 bind to `isString.min(1)` instead -- a genuinely distinct
 * derived guard, not `isString` itself -- which is the same idiom every
 * other example in this package uses. Section 5 is the one deliberate
 * exception: rebinding the shared `isEmail` singleton globally is exactly
 * what you'd do to make every email in an app's fixtures look realistic.
 */
import "@spudlabs/guardis-gen";
import "@spudlabs/guardis-gen/modules/primitives";
import "@spudlabs/guardis-gen/modules/strings";

import { createTypeGuard, isString } from "@spudlabs/guardis";
import { isEmail } from "@spudlabs/guardis/strings";
import { Dictionaries, Dictionary } from "@spudlabs/guardis-gen";

function section(title: string): void {
  console.log(`\n--- ${title} ---`);
}

// --- 1. Dictionary.of() builds a flat pool -----------------------------------
// pick() draws uniformly from the pool given.

section("1. Building a dictionary");

const colors = Dictionary.of(["red", "green", "blue"]);
console.log("colors.pick():", colors.pick());
// =>
// colors.pick(): green

// --- 2. A per-field dictionary scopes to just that field --------------------
// A Dictionary handed directly as a field's own prop value reaches exactly
// that field, the same way any other per-field option does -- the sibling
// field keeps generating normally.

section("2. A per-field dictionary override");

const isSwatch = createTypeGuard({ name: isString, hex: isString });
console.log(
  "isSwatch.generate({ props: { name: colors } }):",
  isSwatch.generate({ props: { name: colors } }),
);
// =>
// isSwatch.generate({ props: { name: colors } }): { name: "red", hex: "wexqf" }

// --- 3. defineGenerator(() => dictionary.pick()) binds a dictionary to a guard
// This composes anywhere the guard is used -- as a top-level generate() call,
// a field, or a collection element -- just like any other function passed to
// defineGenerator(). Bound to a dedicated guard, not isString itself, which
// stays untouched for section 2's "hex" field and everywhere else it's used.

section("3. Binding a dictionary via defineGenerator()");

const isColorName = createTypeGuard(
  "color",
  (v: unknown) => typeof v === "string" ? v : null,
);
isColorName.defineGenerator(() => colors.pick());
console.log("isColorName.generate():", isColorName.generate());
// =>
// isColorName.generate(): blue

// --- 4. generate(dictionary) overrides at call time --------------------------
// A call-time dictionary, handed directly, wins even over a registered
// defineGenerator() -- same "call-time options override registered
// defaults" rule every other option already follows. Cast to unknown
// options: a custom guard built via createTypeGuard's parser overload has no
// branded name to key a typed GenerateOptionsFor entry off of, the same
// limitation documented in define-generator.test.ts for constraint options --
// isColorName's runtime behavior is unaffected, only the .generate() call's
// typed surface is.

section("4. Overriding with a different dictionary at call time");

const primaryColors = Dictionary.of(["red", "yellow", "blue"]);
const overridden = (isColorName.generate as (options?: unknown) => string)(primaryColors);
console.log("isColorName.generate(primaryColors):", overridden);
// =>
// isColorName.generate(primaryColors): yellow

// --- 5. Composing a realistic value from several built-in dictionaries ------
// A dictionary only ever draws ONE value from a flat pool -- an email needs
// its parts composed by hand, so this binds a short generator function
// rather than a single dictionary pick.

section("5. Composing a realistic email from the built-in dictionaries");

const { First: firstNames, Last: lastNames } = Dictionaries.People.Names;
const { DomainWords, Tlds } = Dictionaries.Internet;
isEmail.defineGenerator(
  () => `${firstNames.pick()}.${lastNames.pick()}@${DomainWords.pick()}.${Tlds.pick()}`,
);
console.log("isEmail.generate():", isEmail.generate());
// =>
// isEmail.generate(): grace.hopper@acme.dev

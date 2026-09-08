// Deliberately does NOT import modules/primitives.ts -- proves this module
// is independently usable (tree-shakeable) without pulling primitives in.
import "./strings.ts";

import { assert, assertThrows } from "@std/assert";
import {
  isCommaDelimited,
  isCommaDelimitedIntegers,
  isCommaDelimitedNumbers,
  isEmail,
  isEmoji,
  isInternationalPhone,
  isPeriodDelimited,
  isPhoneNumber,
  isUlid,
  isUSPhone,
  isUUIDv4,
  isUUIDv7,
} from "@spudlabs/guardis/strings";
import { isInternationalPhone as isInternationalPhoneBranded } from "@spudlabs/guardis/strings-branded";
import { createTypeGuard } from "@spudlabs/guardis";

const roundTripCases = [
  ["isEmail", isEmail],
  ["isInternationalPhone", isInternationalPhone],
  ["isUSPhone", isUSPhone],
  ["isPhoneNumber", isPhoneNumber],
  ["isUUIDv4", isUUIDv4],
  ["isUUIDv7", isUUIDv7],
  ["isCommaDelimited", isCommaDelimited],
  ["isPeriodDelimited", isPeriodDelimited],
  ["isCommaDelimitedIntegers", isCommaDelimitedIntegers],
  ["isCommaDelimitedNumbers", isCommaDelimitedNumbers],
  ["isUlid", isUlid],
  ["isEmoji", isEmoji],
] as const;

Deno.test("string-format round trips", async (t) => {
  for (const [name, guard] of roundTripCases) {
    await t.step(`${name}.generate() actually passes ${name}()`, () => {
      for (let i = 0; i < 20; i++) guard.generate();
    });
  }
});

Deno.test("isInternationalPhone.generate(options) -- branded guard only", async (t) => {
  await t.step("respects an explicit countryCode and still passes the guard", () => {
    for (let i = 0; i < 20; i++) {
      const value = isInternationalPhoneBranded.generate({ countryCode: "44" });
      assert(value.startsWith("+44"), `expected ${value} to start with +44`);
      assert(isInternationalPhone(value), `${value} failed isInternationalPhone`);
    }
  });

  await t.step("still works with no options", () => {
    const value = isInternationalPhoneBranded.generate();
    assert(isInternationalPhone(value), `${value} failed isInternationalPhone`);
  });
});

Deno.test("guard.defineGenerator()", async (t) => {
  await t.step("binds a generator directly to a custom branded guard", () => {
    const isProductSku = createTypeGuard(
      "product-sku",
      (v: unknown): string | null => typeof v === "string" && /^SKU-\d{4,}$/.test(v) ? v : null,
    );

    isProductSku.defineGenerator(() => `SKU-${1000 + Math.floor(Math.random() * 9000)}`);

    isProductSku.generate();
  });

  await t.step("throws immediately if the generator's own output fails its guard", () => {
    // Simulates a generator that's drifted out of sync with its guard (e.g.
    // the guard's validation logic changed after the generator was written).
    const isStrictlyLowercase = createTypeGuard(
      "lowercase",
      (v: unknown): string | null => typeof v === "string" && v === v.toLowerCase() ? v : null,
    );
    isStrictlyLowercase.defineGenerator(() => "NOT-LOWERCASE");

    assertThrows(
      () => isStrictlyLowercase.generate(),
      TypeError,
      "produced a value that fails its own guard",
    );
  });
});

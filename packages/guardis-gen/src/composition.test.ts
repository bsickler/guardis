// Seeded behavioral coverage, one row per composition site (object fields,
// .extend(), isArray.of(), isMap.of(), isSet.of(), .or(), gen.tuple(), plus
// mergeConstraint's element carry-forward). Every value below was obtained
// by actually running `.generate()` against a fixed seed on THIS tree and
// pasting the real output -- none is hand-computed.
//
// A diff here means the PRNG draw order moved for that composition site.
// Investigate rather than re-freeze: the golden is only useful as long as it
// reflects a real run, and a silent draw-order change would otherwise slip
// through unnoticed.
//
// Side-effect imports: registers the object-spec construction hook, stamps
// base specs/patches chain methods for primitives and collections. Needed so
// every composition site below (object fields, .extend(), isArray.of(),
// isMap.of(), isSet.of(), .or(), gen.tuple()) is actually wired up.
import "./object.ts";
import "./modules/primitives.ts";
import "./modules/collections.ts";

import { assertEquals } from "@std/assert";
import { createTypeGuard, isArray, isBoolean, isMap, isNumber, isString } from "@spudlabs/guardis";
import { gen, seed } from "../mod.ts";

Deno.test("golden table: composition-site generation is seeded and reproducible", async (t) => {
  await t.step("1. object fields (createTypeGuard shape)", () => {
    const isRow = createTypeGuard({ a: isString, n: isNumber.gte(5) });
    seed(1);
    assertEquals(isRow.generate(), { a: "ecw", n: 100.30938467942178 });
  });

  await t.step("2. nested raw shape (a shape value used directly within a larger shape)", () => {
    const isRow = createTypeGuard({ inner: { leaf: isString }, b: isString });
    seed(2);
    assertEquals(isRow.generate(), { inner: { leaf: "dtvigz" }, b: "sxlhpwft" });
  });

  await t.step("3. .extend() merge", () => {
    const isBase = createTypeGuard({ a: isString });
    const isExtended = isBase.extend({ c: isString });
    seed(3);
    assertEquals(isExtended.generate(), { a: "hbam", c: "hanrmgy" });
  });

  await t.step("4. isArray.of(objectGuard).ofLength(3) -- patchArrayOf", () => {
    const isItem = createTypeGuard({ x: isString, y: isNumber });
    const isRow = isArray.of(isItem).ofLength(3);
    seed(4);
    assertEquals(isRow.generate(), [
      { x: "vknuoatj", y: 9.241277119144797 },
      { x: "giqjd", y: 8.07123789563775 },
      { x: "mfcgv", y: 65.03309688996524 },
    ]);
  });

  await t.step("6. isMap.of(isString, isNumber).ofSize(2) -- patchMapOf", () => {
    const isRow = isMap.of(isString, isNumber).ofSize(2);
    seed(6);
    assertEquals(
      [...isRow.generate().entries()],
      [["mgpmnxgm", 74.41683220677078], ["psp", 4.812801885418594]],
    );
  });

  await t.step("8. gen.tuple(isString, isNumber, isBoolean)", () => {
    const isRow = gen.tuple(isString, isNumber, isBoolean);
    seed(8);
    assertEquals(isRow.generate(), ["ymnzntav", 36.78585703019053, false]);
  });

  await t.step("9a. isString.or(isNumber)", () => {
    const isRow = isString.or(isNumber);
    seed(9);
    assertEquals(isRow.generate(), "lewt");
  });

  await t.step("9b. isString.or(bare predicate) -- catches branch-arity drift", () => {
    const barePredicate = (v: unknown): v is string => typeof v === "string" && v.length > 0;
    const isRow = isString.or(barePredicate);
    seed(9);
    assertEquals(isRow.generate(), "lewt");
  });

  await t.step("10. isArray.of(isString).min(2) -- mergeConstraint element carry-forward", () => {
    const isRow = isArray.of(isString).min(2);
    seed(10);
    assertEquals(isRow.generate(), ["frga", "xjgo", "ygzku", "rppx", "oob"]);
  });
});

import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { next, pick, randomBoolean, randomInt, seed } from "./rng.ts";

Deno.test("seed makes next() reproducible", () => {
  seed(12345);
  const a = Array.from({ length: 10 }, () => next());
  seed(12345);
  const b = Array.from({ length: 10 }, () => next());
  assertEquals(a, b);
});

Deno.test("different seeds diverge", () => {
  seed(1);
  const a = Array.from({ length: 10 }, () => next());
  seed(2);
  const b = Array.from({ length: 10 }, () => next());
  assertNotEquals(a, b);
});

Deno.test("next() stays within [0, 1)", () => {
  seed("range-check");
  for (let i = 0; i < 1000; i++) {
    const value = next();
    assert(value >= 0 && value < 1);
  }
});

Deno.test("randomInt stays within bounds and is reproducible", () => {
  seed("int-check");
  for (let i = 0; i < 500; i++) {
    const value = randomInt(5, 10);
    assert(value >= 5 && value <= 10);
    assert(Number.isInteger(value));
  }

  seed(999);
  const a = Array.from({ length: 20 }, () => randomInt(0, 100));
  seed(999);
  const b = Array.from({ length: 20 }, () => randomInt(0, 100));
  assertEquals(a, b);
});

Deno.test("pick only returns elements from the input and is reproducible", () => {
  const pool = ["a", "b", "c", "d"];
  seed("pick-check");
  for (let i = 0; i < 200; i++) {
    assert(pool.includes(pick(pool)));
  }

  seed(42);
  const a = Array.from({ length: 20 }, () => pick(pool));
  seed(42);
  const b = Array.from({ length: 20 }, () => pick(pool));
  assertEquals(a, b);
});

Deno.test("randomBoolean respects probability edges and is reproducible", () => {
  seed("bool-check");
  assertEquals(randomBoolean(0), false);
  seed("bool-check");
  assertEquals(randomBoolean(1), true);

  seed(7);
  const a = Array.from({ length: 20 }, () => randomBoolean());
  seed(7);
  const b = Array.from({ length: 20 }, () => randomBoolean());
  assertEquals(a, b);
});

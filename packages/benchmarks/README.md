# Guardis Benchmarks

Comparative benchmarks for [Guardis](https://jsr.io/@spudlabs/guardis) against
[Zod](https://zod.dev), [ArkType](https://arktype.io), and
[Valibot](https://valibot.dev) across three scenarios:

- **Primitives** — single-field type checks (`string`, `number`, `boolean`)
- **Object schema** — a flat DTO with 5 fields including an optional field
- **Real world** — a nested API payload with nested objects, an array of strings,
  and a metadata object

Each scenario is measured on both valid and invalid input. All libraries validate
identical input data defined once in `data/`.

## Running the benchmarks

From the repository root:

```bash
deno task bench
```

This runs the raw `deno bench` output across every library's bench file. For a
formatted markdown comparison table (the one below), run the formatting script:

```bash
cd packages/benchmarks
deno run -A scripts/format-results.ts
```

The formatting script executes `deno bench --json` and parses the structured
output into the table format shown here. Results vary by hardware — the numbers
below were captured on an Apple M4 Pro running Deno 2.7.11.

## About these numbers

Guardis is shown as two columns:

- **Guardis (fast)** is the boolean type guard call `isUser(x)` — the idiomatic
  Guardis API, which returns true/false and does not build error details. This
  is the API shape most Guardis users hit, and no other library in this
  comparison exposes a direct equivalent.
- **Guardis (validate)** is `isUser.validate(x)`, which returns a Standard
  Schema result with full issue tracking. This is the strictly comparable path
  against the other libraries' `safeParse` methods.

Relative performance (e.g. `1.5x`) is computed against **Guardis (validate)**
so the comparison across libraries is apples-to-apples. The fast-path column
shows raw ops/sec without a relative multiplier because it represents a
different API shape that the other libraries don't expose.

The other libraries use their respective `safeParse` equivalents:

- Zod: `schema.safeParse(value)`
- ArkType: `type(value)` (returns value or ArkErrors, no throw)
- Valibot: `v.safeParse(schema, value)`

## Results

- **Runtime:** Deno/2.7.11 aarch64-apple-darwin
- **CPU:** Apple M4 Pro

### Primitives

#### Valid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| string  | 252.12M | 39.45M (baseline) | 44.70M (1.13x) | 263.95M (6.69x) | 115.65M (2.93x) |
| number  | 236.24M | 38.33M (baseline) | 41.34M (1.08x) | 128.07M (3.34x) | 84.16M (2.20x)  |
| boolean | 250.74M | 30.13M (baseline) | 51.98M (1.73x) | 70.44M (2.34x)  | 84.29M (2.80x)  |

#### Invalid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| string  | 256.49M | 20.62M (baseline) | 3.73M (0.18x) | 739.86K (0.04x) | 23.50M (1.14x) |
| number  | 246.93M | 20.35M (baseline) | 3.80M (0.19x) | 737.88K (0.04x) | 16.30M (0.80x) |
| boolean | 254.72M | 16.06M (baseline) | 3.78M (0.24x) | 278.71K (0.02x) | 15.40M (0.96x) |

### Object Schema

A flat DTO: `{ name: string, age: number, active: boolean, score: number, email?: string }`

#### Valid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| object | 19.20M | 6.26M (baseline) | 3.67M (0.59x) | 187.19M (29.92x) | 6.05M (0.97x) |

#### Invalid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| object | 73.30M | 3.48M (baseline) | 860.87K (0.25x) | 103.47K (0.03x) | 2.48M (0.71x) |

### Real World

A nested API payload: user profile (name, email, age, active), address (street, city, state, zip),
tags (string array), and metadata (source, version, referral).

#### Valid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| real-world | 6.94M | 2.52M (baseline) | 1.04M (0.41x) | 63.16M (25.11x) | 1.99M (0.79x) |

#### Invalid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| real-world | 52.41M | 1.54M (baseline) | 355.82K (0.23x) | 41.52K (0.03x) | 733.46K (0.48x) |

## What these numbers don't tell you

These benchmarks measure single-call validation throughput in isolation. They
do not measure:

- **Bundle size** — Guardis is ~5 KB gzipped. See the main README for
  comparisons. Bundle size matters for frontend use.
- **Schema compilation time** — ArkType's compiled-function advantage has a
  one-time cost at schema definition. For short-lived validators (one-off
  scripts, tests), that cost can dominate. These benchmarks define the schema
  once outside the `Deno.bench` block, so ArkType's compilation cost is not
  reflected in the per-call numbers.
- **Complex features** — transforms, refinements, coercion, branded types, and
  error formatting are all out of scope for this comparison. Each library has
  different tradeoffs in those areas.
- **Real application overhead** — JIT warmup, GC pressure in sustained loads,
  and allocator behavior under concurrent traffic can shift the picture. Treat
  these as microbenchmarks for library comparison, not production capacity
  planning.

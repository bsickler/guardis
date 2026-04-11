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
| string  | 257.69M | 170.61M (baseline) | 44.65M (0.26x) | 256.32M (1.50x) | 117.48M (0.69x) |
| number  | 247.90M | 75.82M (baseline)  | 40.17M (0.53x) | 129.13M (1.70x) | 83.38M (1.10x)  |
| boolean | 251.47M | 34.03M (baseline)  | 51.82M (1.52x) | 69.53M (2.04x)  | 82.20M (2.42x)  |

#### Invalid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| string  | 260.60M | 28.11M (baseline) | 3.77M (0.13x) | 731.08K (0.03x) | 23.37M (0.83x) |
| number  | 250.14M | 27.93M (baseline) | 3.82M (0.14x) | 728.76K (0.03x) | 15.91M (0.57x) |
| boolean | 240.79M | 16.38M (baseline) | 3.78M (0.23x) | 281.27K (0.02x) | 15.35M (0.94x) |

### Object Schema

A flat DTO: `{ name: string, age: number, active: boolean, score: number, email?: string }`

#### Valid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| object | 18.84M | 5.61M (baseline) | 3.78M (0.67x) | 188.65M (33.63x) | 6.07M (1.08x) |

#### Invalid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| object | 73.98M | 3.10M (baseline) | 854.94K (0.28x) | 99.84K (0.03x) | 2.23M (0.72x) |

### Real World

A nested API payload: user profile (name, email, age, active), address (street, city, state, zip),
tags (string array), and metadata (source, version, referral).

#### Valid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| real-world | 7.23M | 1.83M (baseline) | 1.06M (0.58x) | 60.63M (33.16x) | 1.92M (1.05x) |

#### Invalid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| real-world | 52.28M | 1.30M (baseline) | 336.52K (0.26x) | 42.78K (0.03x) | 654.87K (0.50x) |

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

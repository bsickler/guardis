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
| string  | 258.19M | 173.33M (baseline) | 44.66M (0.26x) | 260.73M (1.50x) | 116.22M (0.67x) |
| number  | 249.71M | 76.36M (baseline)  | 41.48M (0.54x) | 128.28M (1.68x) | 82.27M (1.08x)  |
| boolean | 257.82M | 33.51M (baseline)  | 53.01M (1.58x) | 69.91M (2.09x)  | 82.92M (2.47x)  |

#### Invalid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| string  | 281.81M | 28.15M (baseline) | 3.67M (0.13x) | 736.98K (0.03x) | 23.00M (0.82x) |
| number  | 255.64M | 28.03M (baseline) | 3.77M (0.13x) | 743.73K (0.03x) | 15.73M (0.56x) |
| boolean | 236.98M | 16.81M (baseline) | 3.77M (0.22x) | 284.14K (0.02x) | 14.94M (0.89x) |

### Object Schema

A flat DTO: `{ name: string, age: number, active: boolean, score: number, email?: string }`

#### Valid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| object | 18.91M | 5.55M (baseline) | 3.73M (0.67x) | 188.10M (33.86x) | 6.26M (1.13x) |

#### Invalid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| object | 74.59M | 793.17K (baseline) | 838.81K (1.06x) | 103.67K (0.13x) | 2.41M (3.04x) |

### Real World

A nested API payload: user profile (name, email, age, active), address (street, city, state, zip),
tags (string array), and metadata (source, version, referral).

#### Valid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| real-world | 6.72M | 1.97M (baseline) | 1.04M (0.53x) | 62.05M (31.57x) | 1.94M (0.99x) |

#### Invalid Input

| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |
|-----------|---------------:|-------------------:|----:|--------:|--------:|
| real-world | 51.84M | 144.65K (baseline) | 350.80K (2.43x) | 43.41K (0.30x) | 711.33K (4.92x) |

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

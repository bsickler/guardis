/**
 * Runs `deno bench --json` and formats results as markdown comparison tables.
 *
 * Guardis is shown as two columns:
 *   - Guardis (fast) — the boolean type guard call, `isUser(x)`, which returns
 *     true/false without allocating error details. This is the idiomatic Guardis API.
 *   - Guardis (validate) — the Standard Schema path, `isUser.validate(x)`, which
 *     returns a Result object with full issue tracking. This is the apples-to-apples
 *     comparison against Zod.safeParse, ArkType, and valibot.safeParse.
 *
 * Relative performance (e.g. "1.5x") is computed against the Guardis (validate)
 * baseline since that's the strictly comparable path across all libraries.
 *
 * Usage: deno run -A scripts/format-results.ts
 */

interface BenchResult {
  ok?: {
    n: number;
    avg: number;
    min: number;
    max: number;
    p75: number;
    p99: number;
    highPrecision: boolean;
  };
  error?: unknown;
}

interface BenchEntry {
  origin: string;
  name: string;
  results: BenchResult[];
}

interface BenchOutput {
  version: number;
  runtime: string;
  cpu: string;
  benches: BenchEntry[];
}

interface ParsedResult {
  library: string;
  scenario: string;
  benchName: string;
  path: string;
  opsPerSec: number;
}

// Order matters: longer library names must come first so "guardis-validate"
// matches before "guardis" in the regex alternation.
const LIBRARIES = ["guardis-validate", "guardis", "zod", "arktype", "valibot"] as const;
const SCENARIO_ORDER = ["primitives", "object-schema", "real-world"];

function identifyLibrary(origin: string): string | null {
  const match = origin.match(
    /\/benchmarks\/(guardis-validate|guardis|zod|arktype|valibot)\//,
  );
  return match ? match[1] : null;
}

function identifyScenario(origin: string): string | null {
  for (const scenario of SCENARIO_ORDER) {
    if (origin.includes(`${scenario}.bench.ts`)) return scenario;
  }
  return null;
}

function parseBenchName(name: string): { benchName: string; path: string } {
  // Library prefix may contain a hyphen (e.g. "guardis-validate:")
  const match = name.match(/^[\w-]+:\s+(.+?)\s+\((valid|invalid)\)$/);
  if (match) return { benchName: match[1], path: match[2] };
  return { benchName: name, path: "unknown" };
}

function computeOpsPerSec(result: BenchResult): number | null {
  if (!result.ok) return null;
  // Deno bench reports avg in nanoseconds regardless of highPrecision.
  // highPrecision indicates timer source precision, not a unit change.
  return 1_000_000_000 / result.ok.avg;
}

function formatOps(ops: number): string {
  if (ops >= 1_000_000_000) return `${(ops / 1_000_000_000).toFixed(2)}B`;
  if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(2)}M`;
  if (ops >= 1_000) return `${(ops / 1_000).toFixed(2)}K`;
  return ops.toFixed(0);
}

function formatRelative(opsPerSec: number, baseline: number): string {
  if (baseline === 0) return "-";
  const ratio = opsPerSec / baseline;
  return `${ratio.toFixed(2)}x`;
}

async function main() {
  const cmd = new Deno.Command("deno", {
    args: ["bench", "--json"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await cmd.output();

  if (code !== 0) {
    console.error("deno bench failed:");
    console.error(new TextDecoder().decode(stderr));
    Deno.exit(1);
  }

  const data: BenchOutput = JSON.parse(new TextDecoder().decode(stdout));

  console.log(`# Benchmark Results\n`);
  console.log(`- **Runtime:** ${data.runtime}`);
  console.log(`- **CPU:** ${data.cpu}\n`);

  console.log(`## About these numbers\n`);
  console.log(
    "Guardis is shown as two columns. **Guardis (fast)** is the boolean type guard call " +
      "`isUser(x)` — the idiomatic Guardis API, which returns true/false and does not " +
      "build error details. **Guardis (validate)** is `isUser.validate(x)`, which " +
      "returns a Standard Schema result with full issue tracking. The other libraries " +
      "use their respective `safeParse` equivalents.\n",
  );
  console.log(
    "Relative performance is computed against **Guardis (validate)** so it's a strict " +
      "apples-to-apples comparison. The fast path column shows raw ops/sec without a " +
      "relative multiplier because it represents a different API shape that the other " +
      "libraries don't expose.\n",
  );

  // Parse all results
  const parsed: ParsedResult[] = [];
  for (const bench of data.benches) {
    const library = identifyLibrary(bench.origin);
    const scenario = identifyScenario(bench.origin);
    if (!library || !scenario) continue;

    const { benchName, path } = parseBenchName(bench.name);

    for (const result of bench.results) {
      const opsPerSec = computeOpsPerSec(result);
      if (opsPerSec === null) continue;

      parsed.push({ library, scenario, benchName, path, opsPerSec });
    }
  }

  for (const scenario of SCENARIO_ORDER) {
    const scenarioResults = parsed.filter((r) => r.scenario === scenario);
    if (scenarioResults.length === 0) continue;

    const title = scenario.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    console.log(`## ${title}\n`);

    // Get unique bench names preserving order of first appearance
    const benchNames: string[] = [];
    for (const r of scenarioResults) {
      if (!benchNames.includes(r.benchName)) benchNames.push(r.benchName);
    }

    // Get unique paths
    const paths = [...new Set(scenarioResults.map((r) => r.path))].sort();

    for (const path of paths) {
      console.log(`### ${path === "valid" ? "Valid Input" : "Invalid Input"}\n`);
      console.log(
        "| Benchmark | Guardis (fast) | Guardis (validate) | Zod | ArkType | Valibot |",
      );
      console.log(
        "|-----------|---------------:|-------------------:|----:|--------:|--------:|",
      );

      for (const benchName of benchNames) {
        const row = parsed.filter(
          (r) => r.scenario === scenario && r.benchName === benchName && r.path === path,
        );
        if (row.length === 0) continue;

        const guardisFast = row.find((r) => r.library === "guardis")?.opsPerSec ?? 0;
        const guardisValidate = row.find((r) => r.library === "guardis-validate")?.opsPerSec ??
          0;
        const baseline = guardisValidate;

        // Guardis (fast): raw ops/sec, no relative multiplier
        const fastCell = guardisFast > 0 ? formatOps(guardisFast) : "-";

        // Guardis (validate): marked as baseline
        const validateCell = guardisValidate > 0
          ? `${formatOps(guardisValidate)} (baseline)`
          : "-";

        // Other libraries: ops/sec + relative to guardis-validate
        const otherCells = (["zod", "arktype", "valibot"] as const).map((lib) => {
          const result = row.find((r) => r.library === lib);
          if (!result) return "-";
          return `${formatOps(result.opsPerSec)} (${
            formatRelative(result.opsPerSec, baseline)
          })`;
        });

        console.log(
          `| ${benchName} | ${fastCell} | ${validateCell} | ${otherCells.join(" | ")} |`,
        );
      }
      console.log("");
    }
  }
}

main();

/**
 * Runs `deno bench --json` and formats results as markdown comparison tables.
 * Guardis is the 1.0x baseline; other libraries show relative performance.
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

function identifyLibrary(origin: string): string | null {
  const match = origin.match(/\/benchmarks\/(guardis|zod|arktype|valibot)\//);
  return match ? match[1] : null;
}

const SCENARIO_ORDER = ["primitives", "object-schema", "real-world"];

function identifyScenario(origin: string): string | null {
  for (const scenario of SCENARIO_ORDER) {
    if (origin.includes(`${scenario}.bench.ts`)) return scenario;
  }
  return null;
}

function parseBenchName(name: string): { benchName: string; path: string } {
  const match = name.match(/^\w+:\s+(.+?)\s+\((valid|invalid)\)$/);
  if (match) return { benchName: match[1], path: match[2] };
  return { benchName: name, path: "unknown" };
}

function computeOpsPerSec(result: BenchResult): number | null {
  if (!result.ok) return null;
  const { avg, highPrecision } = result.ok;
  return highPrecision ? 1_000_000_000 / avg : 1_000_000 / avg;
}

function formatOps(ops: number): string {
  if (ops >= 1_000_000_000) return `${(ops / 1_000_000_000).toFixed(2)}B`;
  if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(2)}M`;
  if (ops >= 1_000) return `${(ops / 1_000).toFixed(2)}K`;
  return ops.toFixed(0);
}

function formatRelative(opsPerSec: number, baseline: number, library: string): string {
  if (library === "guardis") return "baseline";
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
      console.log("| Benchmark | Guardis | Zod | ArkType | Valibot |");
      console.log("|-----------|---------|-----|---------|---------|");

      for (const benchName of benchNames) {
        const row = parsed.filter(
          (r) => r.scenario === scenario && r.benchName === benchName && r.path === path,
        );
        if (row.length === 0) continue;

        const guardisOps = row.find((r) => r.library === "guardis")?.opsPerSec ?? 0;

        const cells = ["guardis", "zod", "arktype", "valibot"].map((lib) => {
          const result = row.find((r) => r.library === lib);
          if (!result) return "-";
          const ops = formatOps(result.opsPerSec);
          const rel = formatRelative(result.opsPerSec, guardisOps, lib);
          return `${ops} (${rel})`;
        });

        console.log(`| ${benchName} | ${cells.join(" | ")} |`);
      }
      console.log("");
    }
  }
}

main();

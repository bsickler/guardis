import { build, emptyDir } from "jsr:@deno/dnt";

const denoConfig = JSON.parse(await Deno.readTextFile("./deno.json"));
const { name, version, description, license, exports } = denoConfig;

// Derive dnt entryPoints from deno.json exports
const entryPoints = Object.entries(exports).map(([key, path]) =>
  key === "." ? (path as string) : { name: key, path: path as string }
);

await emptyDir("./npm");

await build({
  entryPoints,
  outDir: "./npm",
  shims: {
    deno: false,
  },
  test: false,
  compilerOptions: {
    lib: ["ES2022", "DOM"],
  },
  package: {
    name,
    version: Deno.args[0] || version,
    description,
    license,
    keywords: [
      "typescript",
      "type-guard",
      "typeguard",
      "runtime-validation",
      "type-safety",
      "validation",
      "type-check",
      "branded-types",
      "standard-schema",
      "runtime-type-check",
      "parser",
      "assertion",
      "schema",
      "zod",
      "arktype",
      "valibot",
      "typebox",
    ],
    repository: {
      type: "git",
      url: "git+https://github.com/bsickler/guardis.git",
    },
  },
  postBuild() {
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});

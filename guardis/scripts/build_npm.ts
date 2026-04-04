import { build, emptyDir } from "jsr:@deno/dnt";

await emptyDir("./npm");

await build({
  entryPoints: [
    "./mod.ts",
    { name: "./async", path: "./src/modules/async.ts" },
    { name: "./http", path: "./src/modules/http.ts" },
    { name: "./http-branded", path: "./src/modules/http.branded.ts" },
    { name: "./strings", path: "./src/modules/strings.ts" },
    { name: "./strings-branded", path: "./src/modules/strings.branded.ts" },
  ],
  outDir: "./npm",
  shims: {
    deno: false,
  },
  test: false,
  compilerOptions: {
    lib: ["ES2022", "DOM"],
  },
  package: {
    name: "@spudlabs/guardis",
    version: Deno.args[0] || "0.4.0",
    description: "Guardis is a modular library of type guards, built to be easy to use and extend.",
    license: "MIT",
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

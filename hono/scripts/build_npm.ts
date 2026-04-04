import { build, emptyDir } from "jsr:@deno/dnt";

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    deno: false,
  },
  test: false,
  typeCheck: false,
  skipNpmInstall: true,
  compilerOptions: {
    lib: ["ES2022", "DOM"],
  },
  importMap: "../import_map.json",
  package: {
    name: "@spudlabs/guardis-hono",
    version: Deno.args[0] || "0.0.9",
    description: "Guardis utilities for use with the Hono API framework.",
    license: "MIT",
    peerDependencies: {
      hono: "^4.10.0",
    },
    dependencies: {
      "@spudlabs/guardis": "^0.4.0",
    },
    keywords: [
      "guardis",
      "hono",
      "validation",
      "middleware",
      "type-guard",
      "typeguard",
      "hono-middleware",
      "runtime-validation",
      "typescript",
    ],
    repository: {
      type: "git",
      url: "git+https://github.com/bsickler/guardis.git",
    },
  },
  postBuild() {
    Deno.copyFileSync("README.md", "npm/README.md");
    // Remove hono from dependencies — it should only be a peerDependency
    const pkg = JSON.parse(Deno.readTextFileSync("npm/package.json"));
    delete pkg.dependencies.hono;
    Deno.writeTextFileSync("npm/package.json", JSON.stringify(pkg, null, 2) + "\n");
  },
});

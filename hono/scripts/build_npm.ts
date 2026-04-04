import { build, emptyDir } from "jsr:@deno/dnt";

const denoConfig = JSON.parse(await Deno.readTextFile("./deno.json"));
const guardisConfig = JSON.parse(await Deno.readTextFile("../guardis/deno.json"));
const { name, version, description, license } = denoConfig;

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
    name,
    version: Deno.args[0] || version,
    description,
    license,
    peerDependencies: {
      hono: "^4.10.0",
    },
    dependencies: {
      [guardisConfig.name]: `^${guardisConfig.version}`,
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

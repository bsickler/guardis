import { build, emptyDir } from "jsr:@deno/dnt";

const denoConfig = JSON.parse(await Deno.readTextFile("./deno.json"));
const guardisConfig = JSON.parse(await Deno.readTextFile("../guardis/deno.json"));
const { name, version, description, license, exports } = denoConfig;

// Derive dnt entryPoints from deno.json exports (mirrors packages/guardis/scripts/build_npm.ts)
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
  typeCheck: false,
  skipNpmInstall: true,
  compilerOptions: {
    lib: ["ES2022", "DOM"],
  },
  importMap: "../../import_map.json",
  package: {
    name,
    version: Deno.args[0] || version,
    description,
    license,
    peerDependencies: {
      [guardisConfig.name]: `^${guardisConfig.version}`,
    },
    keywords: [
      "guardis",
      "data-generation",
      "fixtures",
      "mock-data",
      "type-guard",
      "typeguard",
      "typescript",
    ],
    repository: {
      type: "git",
      url: "git+https://github.com/bsickler/guardis.git",
    },
  },
  postBuild() {
    Deno.copyFileSync("README.md", "npm/README.md");
    // dnt duplicates peerDependencies into dependencies so its ESM/CJS output
    // can resolve them at build time. Strip the duplicate back out so
    // @spudlabs/guardis remains a peer only.
    const pkg = JSON.parse(Deno.readTextFileSync("npm/package.json"));
    if (pkg.dependencies) {
      delete pkg.dependencies[guardisConfig.name];
      if (Object.keys(pkg.dependencies).length === 0) delete pkg.dependencies;
    }
    Deno.writeTextFileSync("npm/package.json", JSON.stringify(pkg, null, 2) + "\n");
  },
});

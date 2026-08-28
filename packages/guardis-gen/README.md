# Guardis Gen

Data generation for [Guardis](https://jsr.io/@spudlabs/guardis) type guards — derive sample or
fixture data directly from the guards that already validate your types.

## Install

**Deno**

```bash
deno add jsr:@spudlabs/guardis-gen jsr:@spudlabs/guardis
```

**npm**

```bash
npm install @spudlabs/guardis-gen @spudlabs/guardis
```

## Publishing note

This package augments `@spudlabs/guardis`'s `GuardisPlugins<T>` interface via TypeScript declaration
merging (`declare module "@spudlabs/guardis" { ... }` in `src/spec.ts`). JSR's fast type-checking
doesn't support ambient module augmentation, so publishing requires
`deno publish --allow-slow-types`. This only affects JSR's own type-checking speed and
auto-generated docs/`.d.ts` for Node — the npm build (`deno task build:npm`, via `dnt`) generates
its own compiler-checked `.d.ts` regardless.

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

## Import order

Import each `"@spudlabs/guardis-gen/modules/*"` entry point you need once, up front, before chaining
off the guards it covers (`isString.min(5)`, `isNumber.gt(0)`, `isArray.of(...)`, etc.):

```ts
import "@spudlabs/guardis-gen/modules/primitives";
import "@spudlabs/guardis-gen/modules/strings";
```

Each entry point installs `.generate()`/`.defineGenerator()`/`.or()` on newly-constructed guards and
monkey-patches guardis core's own chain methods (`.min`, `.max`, `.gt`, `.of`, ...) directly on its
pre-existing singletons (`isString`, `isNumber`, `isArray`, ...). Neither of those is retroactive: a
guard built before its entry point is imported never gets `.generate()` at all, and a chain call
made before its patch is installed (`isString.min(5)` with no entry point imported yet) returns a
guard whose constraint is silently ignored, not enforced.

Composition itself has no such requirement. `.defineGenerator()`/`registerGen()` may be called at
any point before the first `.generate()`, in any order relative to how guards are composed --
`createTypeGuard({ company: isCompany, ... })` built before `isCompany.defineGenerator(...)` works
fine, since a field holds a reference to its guard, resolved fresh at generation time rather than
snapshotted when the object was built.

## Seeding

All generation is driven by a seedable PRNG, so output is reproducible:

```ts
import { seed } from "@spudlabs/guardis-gen";

seed(12345); // or seed("some-string")
const a = isUser.generate();

seed(12345);
const b = isUser.generate();
// a and b are identical
```

`next`, `randomInt`, `pick`, and `randomBoolean` are also exported, so a custom `.defineGenerator()`
callback can build on the same PRNG to participate in reproducibility:

```ts
import { pick, randomInt } from "@spudlabs/guardis-gen";

isProductSku.defineGenerator(() => `SKU-${pick(["A", "B", "C"])}${randomInt(1000, 9999)}`);
```

A generator that calls `Math.random()` directly instead stays non-deterministic even after `seed()`
is called.

## Relating values across nesting levels

A derive function under `props` receives the generated siblings as its first argument and a
`GenContext` as its second. `ctx.parent` is the enclosing object -- a live proxy, so reading a field
off it generates that field on demand, whatever order the fields were declared in.

A collection's options bag is forwarded to each of its elements, minus the size keys
(`min`/`max`/`ofLength`) the collection consumes for its own length. A collection introduces a
position rather than an object level, so an element's `ctx.parent` is the object that owns the
collection:

```ts
const isTeam = createTypeGuard({
  company: isCompany,
  members: isArray.of(isTeamMember).ofLength(3),
  headcount: isNumber,
});

const team = isTeam.generate({
  props: {
    // Outer -> inner: every member's email uses the one shared company.
    members: {
      props: { email: (m, ctx) => `${m.name}@${ctx.parent.company.name.toLowerCase()}.com` },
    },
    // Inner -> outer: a parent field aggregating the children.
    headcount: (props) => props.members.length,
  },
});
```

`ctx` also carries `ancestors` (root-first, so `parent === ancestors.at(-1)`), `root`, `index`
(position within the enclosing collection), and `path`. Mutually dependent derivations throw rather
than looping, including cycles that only close by going up a level.

`.defineGenerator(options)` registers a guard's own default `.generate()` options -- applied only
when `.generate()` is called on that guard directly, never when it's nested as a field, element, or
branch of another guard. `.defineGenerator(fn)`, the function overload, is different: it registers a
full generator, which composes normally and applies at any nesting depth.

Because a collection consumes the size keys rather than forwarding them, element length bounds on a
collection of strings aren't separately expressible -- `min` on `isArray.of(isString)` is always the
array's length.

## Publishing note

This package augments `@spudlabs/guardis`'s `GuardisPlugins<T>` interface via TypeScript declaration
merging (`declare module "@spudlabs/guardis" { ... }` in `src/spec.ts`). JSR's fast type-checking
doesn't support ambient module augmentation, so publishing requires
`deno publish --allow-slow-types`. This only affects JSR's own type-checking speed and
auto-generated docs/`.d.ts` for Node — the npm build (`deno task build:npm`, via `dnt`) generates
its own compiler-checked `.d.ts` regardless.

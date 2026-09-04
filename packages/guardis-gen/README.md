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

`.defineGenerator()` registers directly on whatever guard it's called on -- there's no cloning, so
calling it on a widely-shared guard like `isString`/`isNumber`/`isMap` changes every OTHER place
that exact guard is referenced too, for the life of the process (including this package's own
built-in format bindings, if you target something like `isEmail`). The options-form overload is
already blocked by the type system for plain (non-branded, non-object) primitives --
`isString.defineGenerator({...})` doesn't compile -- but the function-form overload is deliberately
generic over any guard's own type, so it can't be restricted the same way without also blocking it
on ordinary custom guards, which is most of what this package is for. Prefer deriving a guard first
-- `isString.min(1)`, `isString.extend(...)`, or a dedicated `createTypeGuard(...)` -- and calling
`defineGenerator()` on that instead, which is what every example in this package does.

## Dictionaries

`Dictionary<T>` is a plain interface -- the whole contract is `pick(): T`. It's parameterized by the
exact type it produces, so a `Dictionary<string>` can back a string field but not a number one, and
a plain `Dictionary<string>` can't back a branded type (an email, a UUID, ...) without going through
validation first -- unlike faker.js's locale objects, which are one big untyped bag of unrelated
pools, a dictionary here is tied to the type of the position it fills.

`defineDictionary(pool)` builds the common case: a flat, validated, deduplicated pool backed by a
`Set<T>` (its return type is named `DictionarySet<T>`, but it's a plain object, not a class --
there's nothing to instantiate or extend). Duplicate entries in the source collapse for free, and an
empty pool throws immediately instead of failing confusingly later. A dictionary that's more than a
flat pool -- composing several pools, projecting one field off another dictionary, or deriving its
value some other way -- implements `Dictionary<T>` directly instead: a class or a plain object with
its own `pick()`. `dictionaryOf(fn)` is the shorthand for the plain-object case --
`dictionaryOf(() => expr)` instead of writing `{ pick: () => expr }` out by hand -- for a dictionary
that's just one expression, not a whole class. This is the same pattern for this package's own
built-in dictionaries and for a project's own custom ones -- see `dictionaries/people/names.ts`,
`dictionaries/location/countries.ts`, and `dictionaries/company.ts`, none of which call
`defineDictionary()` for their composed fields: each builds them with `dictionaryOf()` instead,
drawing straight from its own data (or another of its own dictionaries) via the low-level `pick()`
primitive, rather than building a second dictionary object just to immediately delegate to it.

```ts
import {
  defineDictionary,
  dictionaries,
  dictionaryOf,
  fromDictionary,
} from "@spudlabs/guardis-gen";

const colors = defineDictionary(["red", "green", "blue"]);

// A one-off Dictionary<T> built from a single expression -- no defineDictionary()
// pool and no class needed for a dictionary that's just "shout one of these colors".
const shoutingColors = dictionaryOf(() => colors.pick().toUpperCase());

// Bound via defineGenerator(): composes anywhere isColorName is used. Bound
// to a dedicated guard, never a bare shared primitive like isString --
// defineGenerator() registers PERMANENTLY on whatever guard it's called on,
// so patching isString itself would silently change every OTHER isString
// field in the process, including this package's own built-in bindings.
isColorName.defineGenerator(fromDictionary(colors));

// Overridden at call time -- wins even over a registered defineGenerator().
isColorName.generate({ dictionary: defineDictionary(["red", "yellow", "blue"]) });

// Scoped to one field via props, same as any other per-field option.
isSwatch.generate({ props: { name: { dictionary: colors } } });
```

`defineGenerator(fromDictionary(dictionary))`'s return type is unified against the guard's own type
by `defineGenerator`'s existing generic signature, so handing a `Dictionary<number>` to a
`string`-typed guard is already a compile error with no dictionary-specific type-checking needed.
Composing dictionaries needs no dedicated merge function either -- `Dictionary` is iterable, so
`defineDictionary([...poolA, ...poolB])` combines and dedupes two of them into a new one.

A small built-in starter set ships under `dictionaries` (`dictionaries.people.names`,
`dictionaries.company.companies`, `dictionaries.location.cities`/`countries`,
`dictionaries.internet.domainWords`/`tlds`) -- English-only, a few dozen entries each, not
exhaustive locale data (`src/dictionaries/**`, one dataset per file, grouped into a directory per
category). Most of these are plain `defineDictionary([...])` pools with no subclass needed. Three
aren't, because a flat pool genuinely doesn't fit them:

- `dictionaries.people.names` (a `Names`) has `female`/`male` (gendered first-name pools),
  `first`/`middle` (each gender-neutral, combining both), and `last` (which includes some hyphenated
  surnames alongside plain ones) -- each its own minimal `Dictionary<string>`. `pick()` composes a
  full name, since there's no single stored pool of already-combined names to draw from: it picks a
  gender once per call and draws first (and, about 3 times in 10, a middle name) from that same
  pool, so a generated name's parts don't mix genders, then appends an independent last name --
  "First Last" or "First Middle Last". Middle names reuse the first-name pools rather than a
  separate list, since the two overlap heavily in practice.
- `dictionaries.location.countries` (a `Countries`, covering the full ISO 3166-1 list) has one real
  pool, `record` -- full `{ name, standardizedName, alpha2, alpha3, numeric }` records.
  `name`/`standardizedName`/`alpha2`/`alpha3`/`numeric` aren't separate pools of their own (that
  would just be the same data stored five times) -- each draws a record via `record.pick()` and
  projects one field off it, so every field pick is still uniformly random over that field's values.
  `name` is the common name where a country has one (e.g. "United States"), falling back to the
  formal ISO name where it doesn't; `standardizedName` is always the formal/official ISO name (e.g.
  "United States of America (the)"). `Countries.pick()` itself is deliberately different: it mixes
  `name`/`alpha2`/`alpha3` representations across calls ("Japan", then "US", then "GBR", ...) rather
  than drawing one consistent record, for mimicking varied, inconsistent real-world user input.
  `standardizedName`/`numeric` are left out of that mix on purpose -- neither a formal ISO name nor
  a numeric code is something a person types into a form the way a common name or letter code is --
  but both stay available on their own via
  `countries.standardizedName.pick()`/`countries.numeric.pick()`. Want a single correlated record
  instead of the mixed representations? Use `record.pick()`.
- `dictionaries.company.companies` (a `Companies`) is not a `Dictionary<string>` itself -- it has
  `name`/`jobTitle`, each its own `Dictionary<string>`, instead of one ambiguous `pick()`, since
  "pick a company" doesn't say whether you want its name or a job title there.
  `brand`/`llc`/`corporation`/ `medicalPractice`/`lawFirm`/`investmentFirm`/`bank`/`restaurant` are
  its eight business-entity types -- a company name isn't one shape: an LLC, a corporation, and a
  medical practice are named by genuinely different real-world conventions, not the same pool with a
  different suffix. `brand`/`bank`/`restaurant` lean on well-known parody company names from film/TV
  (e.g. "Wayne Enterprises", "Krusty Burger", "Gringotts Wizarding Bank"), since real businesses of
  those kinds are usually known by name rather than by a generic naming _pattern_.
  `lawFirm`/`investmentFirm` are the opposite -- real ones are usually known BY a pattern (one or
  two surnames plus a suffix, e.g. "Ramirez & Chen LLP", "Ramirez Capital Partners") -- so
  `medicalPractice`, `lawFirm`, and `investmentFirm` all draw their namesake(s) from
  `dictionaries.people.names`'s surnames rather than maintaining a separate surname list here, the
  same "don't duplicate data" rule `Names`/`Countries` already follow. `companies.name.pick()` mixes
  all eight types across calls, on purpose -- a real dataset of company names is a mixed bag of
  entity types, not a uniform one -- and `companies.jobTitle.pick()` does the same for job titles,
  independently of `name`'s own pick.

  Each of those eight is a plain `{ name: Dictionary<string>, jobTitle: Dictionary<string> }`
  object, not a shared field on one `record` the way `Countries` composes `name`/`alpha2`/`alpha3`
  off a single picked record, since a country has exactly one alpha2, but a company type doesn't
  have "one" job title. Each carries its own `jobTitle` pool instead (e.g.
  `companies.medicalPractice.jobTitle.pick()` might return "Physician" or "Registered Nurse"), drawn
  independently of that type's own `name.pick()` draw -- the same way `Names.pick()` draws
  first/middle independently once gender narrows which lists they come from, rather than pinning
  them to fields of one fixed record.

A dictionary only ever draws one value from a flat pool, so a composed value like an email needs a
short hand-written generator (`` `${firstNames.pick()}@${domainWords.pick()}.${tlds.pick()}` ``),
not a single `fromDictionary()` call -- see `examples/dictionaries.ts`.

A dictionary handed to a position whose type doesn't match is a compile error, not a silent no-op at
runtime -- the type system is the whole enforcement mechanism here, there's no separate runtime
check. That check is only for TYPE, though: a dictionary's values are never re-validated against the
guard's own refinements once the type matches, so
`isNumber.gt(10).generate({ dictionary:
defineDictionary([1, 2, 3]) })` type-checks and happily
returns `3`, which fails `isNumber.gt(10)`. Nothing re-runs the guard on a dictionary pick, the same
way nothing re-runs it on a normal generated value either -- `.generate()` isn't guaranteed to only
ever produce guard-passing output, dictionaries included.

`dictionary` and `props` are both optional on the same object-typed position, but only one has any
effect: `dictionary` wins outright and any `props` derivers supplied alongside it are silently
skipped -- the same "call-time dictionary overrides everything" rule described above, just easy to
trip over when reaching for "seed most fields from a canned example, override one with a deriver" in
a single call.

`isMap.of(keyGuard, valueGuard)`'s own `dictionary` option (when `keyGuard`/`valueGuard` share a
type) is shared, undifferentiated, between key and value -- each entry draws its key and its value
as two independent picks from the same pool, not a caller-distinguished "key pool" vs. "value pool".
When the key and value types differ, that option's type becomes an intersection of two incompatible
`Dictionary<T>`s and is effectively impossible to satisfy with any real dictionary. A bare
`isMap`/`isSet` (no `.of()`) has no `dictionary` option at all.

## Publishing note

This package augments `@spudlabs/guardis`'s `GuardisPlugins<T>` interface via TypeScript declaration
merging (`declare module "@spudlabs/guardis" { ... }` in `src/spec.ts`). JSR's fast type-checking
doesn't support ambient module augmentation, so publishing requires
`deno publish --allow-slow-types`. This only affects JSR's own type-checking speed and
auto-generated docs/`.d.ts` for Node — the npm build (`deno task build:npm`, via `dnt`) generates
its own compiler-checked `.d.ts` regardless.

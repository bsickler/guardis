# Guardis Gen

Data generation for [Guardis](https://jsr.io/@spudlabs/guardis) type guards. Instead of hand-writing
fixture and sample data next to your validators, call `.generate()` on a guard you've already
defined and get back a value that guard accepts — constraints, formats, and nested shapes included.

## Install

**Deno**

```bash
deno add jsr:@spudlabs/guardis-gen jsr:@spudlabs/guardis
```

**npm**

```bash
npm install @spudlabs/guardis-gen @spudlabs/guardis
```

## Quick start

Import the entry points that cover the guards you use, then call `.generate()`:

```ts
import "@spudlabs/guardis-gen/modules/primitives";
import "@spudlabs/guardis-gen/modules/strings";

import { createTypeGuard, isBoolean, isNumber, isString } from "@spudlabs/guardis";
import { isEmail } from "@spudlabs/guardis/strings";

isString.generate(); // "kxlmz"
isNumber.generate(); // 42
isBoolean.generate(); // true

isString.min(5).max(10).generate(); // a string 5-10 chars long
isEmail.generate(); // "jsmith@example.com" -- shaped like a real email, not a random string

const isUser = createTypeGuard({
  name: isString,
  age: isNumber.gte(0),
  isActive: isBoolean,
});

isUser.generate(); // { name: "...", age: 17, isActive: false }
```

Generation follows the same constraints and shape you already declared for validation — one
definition, not two things to keep in sync.

## Setting it up

`guardis-gen` ships as a few side-effect entry points instead of one big import, so you only pay for
what you use:

| Import                                      | Adds `.generate()` to                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@spudlabs/guardis-gen`                     | `seed`, `Dictionary`, `Dictionaries`, `gen.tuple`, and the core plugin                                        |
| `@spudlabs/guardis-gen/modules/primitives`  | `isString`, `isNumber`, `isBoolean`, `isDate`, `isArray`, and their chain methods (`.min`, `.gt`, `.of`, ...) |
| `@spudlabs/guardis-gen/modules/strings`     | `isEmail`, `isUUIDv4`/`isUUIDv7`, `isUlid`, phone numbers, delimited lists, emoji                             |
| `@spudlabs/guardis-gen/modules/http`        | `isIpv4`/`isIpv6`, `isCidr`, and their variants                                                               |
| `@spudlabs/guardis-gen/modules/collections` | `isMap.of()` / `isSet.of()`                                                                                   |

Import each module you need **once, up front** — before you build schemas or chain off the guards it
covers (`isString.min(5)`, `isArray.of(...)`, etc.). A guard built or chained before its module is
imported won't pick up generation support, so the safest habit is to import all your modules at the
top of your entry file, before anything else runs.

## Reproducible output

All generation runs on a seedable PRNG:

```ts
import { seed } from "@spudlabs/guardis-gen";

seed(12345); // a number or a string both work
const a = isUser.generate();

seed(12345);
const b = isUser.generate();
// a and b are identical -- handy for stable test fixtures
```

## Building structured data

`createTypeGuard(shape)` derives both the validating guard and a matching generator from the same
shape, and that composes the way you'd expect:

```ts
import { createTypeGuard, isArray, isMap, isString } from "@spudlabs/guardis";

const isAddress = createTypeGuard({ street: isString, city: isString });
const isCompany = createTypeGuard({ name: isString, address: isAddress });

isCompany.generate();
// { name: "...", address: { street: "...", city: "..." } }

// Arrays and maps of objects
isArray.of(isCompany).ofLength(2).generate();
isMap.of(isString, isCompany).ofSize(2).generate();

// extend() layers new fields onto an existing shape, with no shape duplicated by hand
const isCustomer = isCompany.extend({ accountEmail: isString, since: isString });
isCustomer.generate();
```

Two more guard shapes get the same treatment:

- **Unions** — `.or()` picks one branch at random each call: `isString.or(isNumber).generate()`.
- **Tuples** — core's `isTuple` has no per-position guards to hang generation off of, so use
  `gen.tuple(...)` instead: `gen.tuple(isString, isNumber).generate()` returns a real
  `[string, number]`.

## Relating values across a shape

A derive function passed under `props` sees its object's other fields as its first argument, and a
`GenContext` (`parent`, `ancestors`, `root`, `index`, `path`) as its second — so fields can depend
on each other in either direction, even across nesting levels:

```ts
const isTeamMember = createTypeGuard({ name: isString, email: isString });
const isTeam = createTypeGuard({
  company: isCompany,
  members: isArray.of(isTeamMember).ofLength(3),
  headcount: isNumber,
});

isTeam.generate({
  props: {
    // Outward: every member's email uses the one shared company.
    members: {
      props: { email: (member, ctx) => `${member.name}@${ctx.parent.company.name}.com` },
    },
    // Inward: a parent field aggregating its children.
    headcount: (props) => props.members.length,
  },
});
```

`ctx.parent` is a live proxy — reading a field off it generates that field on demand, regardless of
declaration order. A collection forwards its options to each element (minus the size keys it
consumes for its own length), and a dependency cycle throws with the full path rather than looping
forever. See `examples/nested-objects.ts` for the full set of these, including reaching past
`parent` to `ctx.root`.

## Writing custom generators

`.defineGenerator()` binds a generator directly to a guard:

```ts
import { pick, randomInt } from "@spudlabs/guardis-gen";

const isProductSku = createTypeGuard(
  "ProductSku",
  (v: unknown) => typeof v === "string" && /^[A-Z]-\d{4}$/.test(v) ? v : null,
);

isProductSku.defineGenerator(() => `${pick(["A", "B", "C"])}-${randomInt(1000, 9999)}`);
isProductSku.generate(); // "B-4821"
```

Build custom generators on `next`/`randomInt`/`pick`/`randomBoolean` (the same primitives every
built-in generator uses) rather than `Math.random()`, so they stay reproducible under `seed()` too.

`.defineGenerator()` registers **permanently** on whatever guard it's called on — calling it on a
shared singleton like `isString` changes every other place that guard is used. Prefer deriving a
guard first (`isString.min(1)`, or a dedicated `createTypeGuard(...)`) and binding to that instead.

## Pinning exact values

Anywhere `.generate()` takes options — a top-level call or a per-field entry under `props` — you can
hand it a literal value, a zero-arg thunk, or a `Dictionary` instead, and it wins over any
registered generator:

```ts
const isSwatch = createTypeGuard({ name: isString, hex: isString });

isSwatch.generate({ props: { name: "red" } }); // a literal, scoped to one field
isSwatch.generate({ props: { hex: () => "#ff0000" } }); // a thunk, same way
```

### Dictionaries

A `Dictionary<T>` wraps a pool of realistic sample values behind a uniform `pick(): T`, typed to the
exact value it produces — a `Dictionary<string>` can fill a string field but not a number one.

```ts
import { Dictionary } from "@spudlabs/guardis-gen";

const colors = Dictionary.of(["red", "green", "blue"]); // uniform pick from an array
const isColorName = createTypeGuard("Color", (v: unknown) => typeof v === "string" ? v : null);

isSwatch.generate({ props: { name: colors } }); // scoped to one field, like any other value
isColorName.defineGenerator(() => colors.pick()); // bound permanently, composes anywhere isColorName is used
```

A `.of()` collection (`isArray.of(...)`, `isMap.of(...)`, `isSet.of(...)`) has no per-call element
dictionary — bind the dictionary to the _element guard's_ own `.defineGenerator()` instead, and
every element draws from it:

```ts
isColorName.defineGenerator(() => colors.pick());
isArray.of(isColorName).generate({ ofLength: 10 }); // every element drawn from colors
```

A handful of starter dictionaries ship under `Dictionaries`, in `@spudlabs/guardis-gen` — small,
English-only pools meant as a base to extend, not exhaustive locale data:

| Dictionary                          | Produces                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Dictionaries.People.Names`         | Full names — `.Female`/`.Male`/`.First`/`.Middle`/`.Last` for the parts                                                |
| `Dictionaries.Companies`            | Company names and job titles across 8 entity types (`.Llc`, `.LawFirm`, `.Restaurant`, ...) — `.Name`/`.Title` on each |
| `Dictionaries.Location.Cities`      | City names                                                                                                             |
| `Dictionaries.Location.Countries`   | Countries (full ISO 3166-1 list) — `.Name`/`.Alpha2`/`.Alpha3`/`.StandardizedName`/`.Numeric`/`.Record`                |
| `Dictionaries.Internet.DomainWords` | Domain-like words                                                                                                      |
| `Dictionaries.Internet.Tlds`        | Top-level domains — `.Countries` for country-code TLDs alone                                                           |

A dictionary only ever draws one value from a flat pool, so a composed value like an email needs a
short hand-written generator instead of a single `Dictionary`:

```ts
const { First, Last } = Dictionaries.People.Names;
const { DomainWords, Tlds } = Dictionaries.Internet;

isEmail.defineGenerator(() =>
  `${First.pick()}.${Last.pick()}@${DomainWords.pick()}.${Tlds.pick()}`
);
```

See `examples/dictionaries.ts` for a fuller tour, and the module docs for exactly which pools each
built-in dictionary composes from.

## Good to know

- **A literal or `Dictionary` value is never re-validated** against the guard's own refinements
  (`.gt()`, `.min()`, a custom predicate) — only its _type_ is checked, at compile time.
- **Unsatisfiable constraints throw** instead of silently producing an invalid value (e.g. asking a
  `Set` for more unique elements than its element domain can supply).
- **`.notEmpty` generates a non-empty value** — `isArray.notEmpty` never generates `[]`.

## Publishing note

This package augments `@spudlabs/guardis`'s plugin types via TypeScript declaration merging, which
JSR's fast type-checker doesn't support for ambient module augmentation — publishing requires
`deno publish --allow-slow-types`. This only affects JSR's own checking speed and generated `.d.ts`;
the npm build produces its own compiler-checked types regardless.

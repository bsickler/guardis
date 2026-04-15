# Guardis

**Composable type guards for TypeScript** — start from your types or start from your guards. Either way, you get runtime validation with full type narrowing.

Guardis works however your project does. Have 200 existing interfaces? Write guards that follow them. Starting fresh? Define a guard and extract the type. No schema language to learn — just TypeScript functions that compose.

## Two Ways In

### You already have types — add validation to them

You've got `User` defined across your codebase. You need runtime validation. With schema-first libraries, you rewrite the type:

```ts
// ❌ Zod: rewrite your type as a schema, keep both in sync manually
const UserSchema = z.object({ id: z.number(), name: z.string(), email: z.string().optional() });
type User = z.infer<typeof UserSchema>; // replaces your original type
```

With Guardis, your type stays. The guard follows it:

```ts
import { createTypeGuard, isObject, isNumber, isString } from "@spudlabs/guardis";

type User = { id: number; name: string; email?: string };

const isUser = createTypeGuard<User>((val, { has, hasOptional }) =>
  isObject(val) && has(val, "id", isNumber) && has(val, "name", isString)
    && hasOptional(val, "email", isString)
    ? val : null
);
```

### Starting fresh — let the guard define the type

No existing type? Define the guard with shape syntax and extract the type with `_TYPE`:

```ts
import { createTypeGuard, isNumber, isString } from "@spudlabs/guardis";

const isUser = createTypeGuard({
  id: isNumber,
  name: isString,
  email: isString.optional,
});

type User = typeof isUser._TYPE;
// { id: number; name: string; email?: string }
```

One definition, one source of truth — same as the schema-first workflow you're used to, but with plain TypeScript guards instead of a schema DSL.

### Use it everywhere

Either way, you get the same full-featured guard:

```ts
// Narrow types in conditionals
if (isUser(response.data)) {
  console.log(response.data.name); // TypeScript knows this is a User
}

// Throw on invalid data
isUser.strict(untrustedInput, "Expected a valid user");

// Validate with structured errors (StandardSchemaV1)
const result = isUser.validate(formData);
if (result.issues) {
  console.log(result.issues); // [{ message, path }]
}
```

## Migrating from Zod

Whether you want to keep your existing types or let Guardis derive them, the migration is straightforward. Here's a real-world form before and after:

**Before — Zod**
```ts
import { z } from "zod";

const ContactFormSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150),
  nickname: z.string().nullable(),
  message: z.string().min(1),
});

type ContactForm = z.infer<typeof ContactFormSchema>;
```

**After — Guardis (keeping your existing type)**
```ts
import { createTypeGuard, isObject, isNumber, isString, isNull } from "@spudlabs/guardis";
import { isEmail } from "@spudlabs/guardis/strings";

type ContactForm = {
  name: string;
  email: string;
  age: number;
  nickname: string | null;
  message: string;
};

const isContactForm = createTypeGuard<ContactForm>((val, { has }) =>
  isObject(val)
    && has(val, "name", isString.notEmpty)
    && has(val, "email", isEmail)
    && has(val, "age", isNumber.gte(0).lte(150))
    && has(val, "nickname", isString.or(isNull))
    && has(val, "message", isString.notEmpty)
    ? val : null
);
```

**After — Guardis (deriving the type from the guard)**
```ts
import { createTypeGuard, isNumber, isString, isNull } from "@spudlabs/guardis";
import { isEmail } from "@spudlabs/guardis/strings";

const isContactForm = createTypeGuard({
  name: isString.notEmpty,
  email: isEmail,
  age: isNumber.gte(0).lte(150),
  nickname: isString.or(isNull),
  message: isString.notEmpty,
});

type ContactForm = typeof isContactForm._TYPE;
```

Both approaches give you the same guard with the same runtime behavior. The callback syntax lets you annotate an existing type with `<ContactForm>` for compile-time safety; the shape syntax infers the type for you. Pick whichever fits your codebase.

**What you gain:**
- Every guard gets `.strict()`, `.optional()`, `.validate()`, `.or()`, and `.notEmpty` automatically
- StandardSchemaV1 compliance for framework integration
- Zero dependencies, ~2KB gzipped
- No schema DSL to learn — guards are plain TypeScript functions

**Concept mapping:**
| Zod | Guardis |
|-----|---------|
| `z.infer<typeof Schema>` | `typeof guard._TYPE` (or use your existing type) |
| `.parse()` | `.strict()` (throws on failure) |
| `.safeParse()` | `.validate()` (returns `{ value }` or `{ issues }`) |
| `.min()`, `.max()` | `.gte()`, `.lte()`, or `.extend()` |
| `.email()`, `.uuid()` | `isEmail`, `isUUIDv4` from `/strings` |
| `z.object({...})` | `createTypeGuard({...})` with shape syntax |

## Install

**Deno**
```bash
deno add jsr:@spudlabs/guardis
```

**Node.js**
```bash
npm install @spudlabs/guardis
```

**Bun**
```bash
bun add @spudlabs/guardis
```

## Built-in Guards

Guards are available for common JavaScript types:

```ts
import {
  isString, isNumber, isBoolean, isNull, isUndefined,
  isArray, isObject, isDate, isFunction, isIterable, isTuple,
  isJsonValue, isJsonObject, isJsonArray,
} from "@spudlabs/guardis";

isString("hello");              // true
isNumber(42);                   // true
isArray([1, 2, 3]);             // true
isObject({ key: "value" });     // true
isTuple([1, 2], 2);            // true — array with exact length
isJsonValue({ a: 1, b: "x" }); // true
```

You can also access all built-in guards through the `Is` namespace:

```ts
import { Is } from "@spudlabs/guardis";

Is.String("hello"); // true
Is.Number(42);       // true
Is.Array([1, 2, 3]); // true
```

## Every Guard Has Modes

Every type guard — built-in or custom — automatically gets these modes:

| Mode | Purpose | Example |
|------|---------|---------|
| **Basic** | Type narrowing in conditionals | `isString(val)` |
| **Strict** | Throws `TypeError` on failure | `isString.strict(val, "must be string")` |
| **Assert** | TypeScript assertion function | `assertIsString(val)` |
| **Optional** | Accepts `T \| undefined` | `isString.optional(val)` |
| **NotEmpty** | Rejects empty values (`""`, `[]`, `{}`, `null`, `undefined`) | `isString.notEmpty(val)` |
| **Validate** | Returns `{ value }` or `{ issues }` | `isString.validate(val)` |
| **Or** | Union with another guard | `isString.or(isNumber)` |

```ts
// Optional — allow undefined
isNumber.optional(undefined);   // true
isNumber.optional(42);          // true
isNumber.optional("hello");     // false

// NotEmpty — reject empty values
isString.notEmpty("hello");     // true
isString.notEmpty("");          // false

// Or — union types
const isStringOrNumber = isString.or(isNumber);
isStringOrNumber("hello");      // true
isStringOrNumber(42);           // true

// Validate — structured error reporting (StandardSchemaV1)
const result = isString.validate(42);
// { issues: [{ message: "Validation failed: expected String" }] }
```

## Custom Type Guards

### Shape Syntax

The simplest way to create a guard for an object type — pass a shape mapping properties to guards. TypeScript infers the validated type directly from the shape, so you don't need to define a separate type:

```ts
import { createTypeGuard, isNumber, isString, isNull } from "@spudlabs/guardis";

const isUser = createTypeGuard({
  id: isNumber,
  name: isString,
});
// isUser validates: { id: number; name: string }

// Nested shapes work too
const isUserWithAddress = createTypeGuard({
  id: isNumber,
  name: isString,
  address: { street: isString, city: isString },
});

// Use guard modes directly in the shape
const isContactForm = createTypeGuard({
  name: isString.notEmpty,
  nickname: isString.or(isNull),
  age: isNumber,
});
```

### Callback Syntax

For more complex validation logic, pass a callback with helper functions. The helpers like `has` and `hasOptional` progressively narrow the type as you validate each property, so TypeScript tracks the validated shape through each check:

```ts
import { createTypeGuard, isObject, isNumber, isString } from "@spudlabs/guardis";

type User = {
  id: number;
  name: string;
  email?: string;
};

const isUser = createTypeGuard<User>((val, { has, hasOptional }) => {
  if (!isObject(val)) return null;

  if (
    has(val, "id", isNumber) &&
    has(val, "name", isString) &&
    hasOptional(val, "email", isString)
  ) {
    return val;
  }

  return null;
});

// All modes work automatically
isUser({ id: 1, name: "Alice" });           // true
isUser.strict(untrustedData);               // throws if invalid
isUser.optional(undefined);                 // true
isUser.validate({ id: "wrong", name: 42 }); // { issues: [...] }
```

### Available Helpers

The callback in `createTypeGuard` provides these helpers:

- **`has(obj, key, guard)`** — validate a required property
- **`hasOptional(obj, key, guard)`** — validate an optional property (`T | undefined`)
- **`hasNot(obj, key)`** — assert a property is absent
- **`tupleHas(arr, index, guard)`** — validate a tuple element at an index
- **`includes(array, value)`** — check membership in a `const` array (useful for union types)
- **`or(val, ...branches)`** — express fork logic: match one of several alternative shapes
- **`fail(message)`** — add a validation issue and return `null`

```ts
type Status = "pending" | "complete" | "failed";

const isStatus = createTypeGuard<Status>((val, { includes }) => {
  const valid: Status[] = ["pending", "complete", "failed"];
  return isString(val) && includes(valid, val) ? val : null;
});
```

### Forking Inside a Parser

When a value can match one of several alternative shapes that share a validation prefix, use `or()`:

```ts
type OrgMember  = { kind: string; orgId:   string };
type UserMember = { kind: string; userId:  string };

const isMember = createTypeGuard<OrgMember | UserMember>((val, { has, or }) => {
  if (!isObject(val) || !has(val, "kind", isString)) return null;
  return or(
    val,
    (v): v is OrgMember  => has(v, "orgId",  isString),
    (v): v is UserMember => has(v, "userId", isString),
  ) ? val : null;
});
```

Each branch is a predicate that receives `val` as `v` and returns a boolean. If any branch matches, `or()` returns `true` and narrows `val` to the union of branch result types. If all branches fail:

- **Boolean mode**: `or()` returns `false`.
- **Validate mode**: all branches' issues surface in `result.issues`.
- **Strict mode**: `or()` throws a `TypeError` with combined branch info.

**Why not `if (has(...))`?** The natural-looking pattern below is a footgun — do not use it for forks:

```ts
// ❌ Broken: in validate/strict modes, has() is designed to collect errors in
// && chains. It returns true on failure when a ctx is present, so the first
// branch always wins and the type assertion lies.
if (has(val, "orgId",  isString)) return val;
if (has(val, "userId", isString)) return val;
```

`has()`'s always-true-on-failure behavior is intentional — it lets
`has(v,'a') && has(v,'b') && has(v,'c')` in validate mode collect every
field's error in one pass. That design means `if (has(...))` can't be used
as a fork condition. `or()` is the correct primitive for branching.

## Extending Guards

Build refined validators from existing ones with `.extend()`:

```ts
// Email from string
const isEmail = isString.extend((val) =>
  val.includes("@") && val.includes(".") ? val : null
);

// Percentage from number
const isPercentage = isNumber.extend((val) =>
  val >= 0 && val <= 100 ? val : null
);

// Adult from User
const isAdult = isUser.extend((val) =>
  val.age >= 18 ? val : null
);

// Chain extensions for increasingly specific validation
const isPositiveNumber = isNumber.extend((val) => val > 0 ? val : null);
const isPositiveInteger = isPositiveNumber.extend((val) => Number.isInteger(val) ? val : null);
```

All modes carry through to extended guards — `.strict()`, `.optional()`, `.validate()`, etc.

## Specialized Modules

### Strings

Common string format validators:

```ts
import { isEmail, isUUIDv4, isUSPhone } from "@spudlabs/guardis/strings";

isEmail("user@example.com");     // true
isUUIDv4("550e8400-...");        // true
isUSPhone("555-123-4567");       // true
```

### HTTP

```ts
import { isNativeURL, isRequest, isResponse } from "@spudlabs/guardis/http";

isNativeURL(new URL("https://example.com")); // true
isRequest(new Request("https://api.com"));   // true
isResponse(new Response("data"));            // true
```

### Async

```ts
import { isPromise, isAsyncFunction } from "@spudlabs/guardis/async";

isPromise(fetch("/api"));              // true
isAsyncFunction(async () => {});       // true
```

## Branded Types

TypeScript is structurally typed — any `string` can be assigned where another `string` is expected, even when they represent different things (an email vs. a URL, for example). Branded types solve this by tagging a type with a unique label, creating a nominal type that the compiler treats as distinct from its base type.

Guardis specialized modules have branded variants (`/strings-branded`, `/http-branded`) that return branded types instead of plain primitives. By branding a value at the point of validation, the type carries proof that it was checked. The rest of your application can require the branded type in function signatures and interfaces — no need to re-validate at every step. You also can't accidentally pass an `Email` where a `UUID` is expected, even though both are strings at runtime.

```ts
import { isEmail, type Email } from "@spudlabs/guardis/strings-branded";
import { isUUIDv4, type UUIDv4 } from "@spudlabs/guardis/strings-branded";

const email: Email = isEmail.strict("user@example.com");
const id: UUIDv4 = isUUIDv4.strict("550e8400-e29b-41d4-a716-446655440000");

// TypeScript error — Email is not assignable to UUIDv4
const oops: UUIDv4 = email;
```

## Advanced

### Batch Creation

Generate multiple guards at once:

```ts
import { batch } from "@spudlabs/guardis";

const { isRed, isBlue, isGreen } = batch({
  Red: (val) => val === "red" ? val : null,
  Blue: (val) => val === "blue" ? val : null,
  Green: (val) => val === "green" ? val : null,
});
```

### Extending the Is Namespace

Add custom guards to the `Is` object:

```ts
import { extend, Is as BaseIs } from "@spudlabs/guardis";

const Is = extend(BaseIs, {
  Email: (val) => typeof val === "string" && val.includes("@") ? val : null,
  PositiveNumber: (val) => typeof val === "number" && val > 0 ? val : null,
});

Is.Email("user@domain.com");     // custom
Is.String("hello");              // built-in
Is.PositiveNumber.strict(-1);    // throws
```

### Type Inference with `_TYPE`

Extract the guarded type from any guard:

```ts
type UserType = typeof isUser._TYPE; // { id: number; name: string }
type UserArray = Array<typeof isUser._TYPE>;
```

## TypeScript Integration

Guardis works seamlessly with TypeScript's type system:

- **Type narrowing** in `if` / ternary / switch statements
- **Assertion functions** via `.assert()` mode
- **Generic support** for parameterized guards
- **Full type inference** — extract types with `_TYPE`

```ts
function process(input: unknown) {
  if (isArray(input)) {
    // TypeScript knows: unknown[]
    input.forEach((item) => {/* ... */});
  }

  // Assertion style (explicit annotation required by TypeScript)
  const assertIsString: typeof isString.assert = isString.assert;
  assertIsString(input);
  // TypeScript knows: string
}
```

## Benchmarks

See [packages/benchmarks](packages/benchmarks/README.md) for comparative benchmarks against Zod, ArkType, and Valibot.

## Zero Dependencies | MIT License

Built for Deno and Node.js with no runtime dependencies.

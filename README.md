# Guardis

**Type-first validation for TypeScript.** Define your types, then validate with them — not the other way around.

Guardis gives you composable type guards that follow your TypeScript types instead of replacing them. Use the built-in guards, extend them, or create your own — each one comes with strict, assert, optional, and validate modes out of the box.

```ts
import { createTypeGuard, isObject, isNumber, isString } from "jsr:@spudlabs/guardis";

type User = { id: number; name: string };

const isUser = createTypeGuard<User>((val, { has }) =>
  isObject(val) && has(val, "id", isNumber) && has(val, "name", isString) ? val : null
);

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
} from "jsr:@spudlabs/guardis";

isString("hello");              // true
isNumber(42);                   // true
isArray([1, 2, 3]);             // true
isObject({ key: "value" });     // true
isTuple([1, 2], 2);            // true — array with exact length
isJsonValue({ a: 1, b: "x" }); // true
```

You can also access all built-in guards through the `Is` namespace:

```ts
import { Is } from "jsr:@spudlabs/guardis";

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
import { createTypeGuard, isNumber, isString, isNull } from "jsr:@spudlabs/guardis";

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
import { createTypeGuard, isObject, isNumber, isString } from "jsr:@spudlabs/guardis";

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
- **`tupleHas(arr, index, guard)`** — validate a tuple element at an index
- **`includes(array, value)`** — check membership in a `const` array (useful for union types)

```ts
type Status = "pending" | "complete" | "failed";

const isStatus = createTypeGuard<Status>((val, { includes }) => {
  const valid: Status[] = ["pending", "complete", "failed"];
  return isString(val) && includes(valid, val) ? val : null;
});
```

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
import { isEmail, isUUIDv4, isUSPhone } from "jsr:@spudlabs/guardis/strings";

isEmail("user@example.com");     // true
isUUIDv4("550e8400-...");        // true
isUSPhone("555-123-4567");       // true
```

### HTTP

```ts
import { isNativeURL, isRequest, isResponse } from "jsr:@spudlabs/guardis/http";

isNativeURL(new URL("https://example.com")); // true
isRequest(new Request("https://api.com"));   // true
isResponse(new Response("data"));            // true
```

### Async

```ts
import { isPromise, isAsyncFunction } from "jsr:@spudlabs/guardis/async";

isPromise(fetch("/api"));              // true
isAsyncFunction(async () => {});       // true
```

## Branded Types

TypeScript is structurally typed — any `string` can be assigned where another `string` is expected, even when they represent different things (an email vs. a URL, for example). Branded types solve this by tagging a type with a unique label, creating a nominal type that the compiler treats as distinct from its base type.

Guardis specialized modules have branded variants (`/strings-branded`, `/http-branded`) that return branded types instead of plain primitives. By branding a value at the point of validation, the type carries proof that it was checked. The rest of your application can require the branded type in function signatures and interfaces — no need to re-validate at every step. You also can't accidentally pass an `Email` where a `UUID` is expected, even though both are strings at runtime.

```ts
import { isEmail, type Email } from "jsr:@spudlabs/guardis/strings-branded";
import { isUUIDv4, type UUIDv4 } from "jsr:@spudlabs/guardis/strings-branded";

const email: Email = isEmail.strict("user@example.com");
const id: UUIDv4 = isUUIDv4.strict("550e8400-e29b-41d4-a716-446655440000");

// TypeScript error — Email is not assignable to UUIDv4
const oops: UUIDv4 = email;
```

## Advanced

### Batch Creation

Generate multiple guards at once:

```ts
import { batch } from "jsr:@spudlabs/guardis";

const { isRed, isBlue, isGreen } = batch({
  Red: (val) => val === "red" ? val : null,
  Blue: (val) => val === "blue" ? val : null,
  Green: (val) => val === "green" ? val : null,
});
```

### Extending the Is Namespace

Add custom guards to the `Is` object:

```ts
import { extend, Is as BaseIs } from "jsr:@spudlabs/guardis";

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

## Zero Dependencies | MIT License

Built for Deno and Node.js with no runtime dependencies.

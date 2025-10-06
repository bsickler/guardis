# Guardis

Guardis is an unopinionated validation and type guard system that prioritizes using TypeScript types
to define your validation logic. Let your _**types**_ dictate validation rather than having your
validation library dictate your types.

Use the included type guards to perform validation or quickly generate your own anywhere in your
code, using your existing type definitions.

```ts
import { createTypeGuard, isString } from "jsr:@spudlabs/guardis";

// Use built-in guards
if (isString(userInput)) {
  console.log(userInput.toUpperCase()); // TypeScript knows this is a string
}

// Create custom guards from your types
type User = { id: number; name: string };

const isUser = createTypeGuard<User>((val, { has }) =>
  has(val, "id", Is.Number) && has(val, "name", Is.String) ? val : null
);
```

## Features

- **Type-First**: Define TypeScript types first, validation follows
- **Zero Dependencies**: No runtime dependencies
- **Multiple Modes**: Basic, strict (throws), assert, optional, and notEmpty variants
- **Helper Functions**: Built-in utilities for object, array and tuple validation
- **Extensible**: Create custom guards and extend the core library
- **Modular**: Import only what you need

## Installation

```bash
# Deno
deno install jsr:@spudlabs/guardis

# Node.js/npm
npx jsr add @spudlabs/guardis
```


## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Type Guard Modes](#type-guard-modes)
  - [Basic Mode](#basic-mode)
  - [Strict Mode (Throws Errors)](#strict-mode-throws-errors)
  - [Assert Mode (TypeScript Assertions)](#assert-mode-typescript-assertions)
  - [Optional Mode](#optional-mode)
  - [NotEmpty Mode](#notempty-mode)
- [Creating Custom Type Guards](#creating-custom-type-guards)
- [Specialized Modules](#specialized-modules)
- [Batch Creation](#batch-creation)
- [Extending the Is Object](#extending-the-is-object)
- [Real-World Examples](#real-world-examples)
  - [API Response Validation](#api-response-validation)
  - [Form Validation](#form-validation)
- [TypeScript Integration](#typescript-integration)

## Quick Start

### Built-in Type Guards

Guardis provides type guards for all common JavaScript types:

```ts
import { Is } from "jsr:@spudlabs/guardis";

// Primitives
Is.String("hello"); // true
Is.Number(42); // true
Is.Boolean(true); // true
Is.Null(null); // true
Is.Undefined(undefined); // true

// Collections
Is.Array([1, 2, 3]); // true
Is.Object({ key: "value" }); // true

// Special types
Is.Date(new Date()); // true
Is.Function(() => {}); // true
Is.Iterable([1, 2, 3]); // true (arrays, sets, maps, etc.)
Is.Tuple([1, 2], 2); // true (array with exact length)

// JSON-safe types
Is.JsonValue({ a: 1, b: "text" }); // true
Is.JsonObject({ key: "value" }); // true
Is.JsonArray([1, "two", true]); // true
```

### Individual Imports

Import specific guards to keep bundles small:

```ts
import { isArray, isNumber, isString } from "jsr:@spudlabs/guardis";

if (isString(userInput)) {
  console.log(userInput.trim());
}

if (isNumber(userInput)) {
  return userInput * 10;
}

if (isArray(userValues)) {
  return userValues.at(-1);
}
```

## Type Guard Modes

Every type guard comes with multiple modes for different use cases:

### Basic Mode

```ts
if (Is.String(value)) {
  // TypeScript knows value is a string here
  console.log(value.toUpperCase());
}
```

### Optional Mode

```ts
// Allows undefined values
Is.String.optional(value); // true for strings OR undefined
Is.Number.optional(undefined); // true
Is.Number.optional(42); // true
Is.Number.optional("hello"); // false
```

### NotEmpty Mode

```ts
// Rejects "empty" values (null, undefined, "", [], {})
Is.String.notEmpty("hello"); // true
Is.String.notEmpty(""); // false
Is.Array.notEmpty([1, 2, 3]); // true
Is.Array.notEmpty([]); // false
```

### Strict Mode (Throws Errors)

Throws an error if the predicate fails.

```ts
// Throws TypeError if validation fails
Is.String.strict(value);

// With custom error message
Is.Number.strict(value, "Expected a number for calculation");
```

### Assert Mode (TypeScript Assertions)

It's a requirement of the TypeScript language that all assertion functions have an explicit type annotation. For that reason, in order for TypeScript to recognize that any use of the variable after `assertIsString` can safely consider the `value` to be a string, you have to explicitly set the type to itself.

See https://github.com/microsoft/TypeScript/issues/47945 for more information.

```ts
// For TypeScript assertion functions
const assertIsString: typeof Is.String.assert = Is.String.assert;

assertIsString(value);

console.log(value.toUpperCase()); // TypeScript now knows value is a string
```


## Creating Custom Type Guards

Use `createTypeGuard` to build validators for your own types:

### Simple Types

```ts
import { createTypeGuard } from "jsr:@spudlabs/guardis";

type Status = "pending" | "complete" | "failed";

const isStatus = createTypeGuard((val, { includes }) => {
  const validStatuses: Status[] = ["pending", "complete", "failed"];
  return isString(val) && includes(validStatuses, val) ? val : null;
});

// All modes available automatically
isStatus("pending"); // true
isStatus.strict("invalid"); // throws TypeError
isStatus.optional(undefined); // true
```

### Complex Objects

Use helper functions for object validation:

```ts
type User = {
  id: number;
  name: string;
  email?: string; // optional property
};

const isUser = createTypeGuard<User>((val, { has, hasOptional }) => {
  if (!Is.Object(val)) return null;

  if (
    has(val, "id", Is.Number) &&
    has(val, "name", Is.String) &&
    hasOptional(val, "email", Is.String)
  ) {
    return val;
  }

  return null;
});
```

### Available Helpers

```ts
const isExample = createTypeGuard((val, helpers) => {
  const { has, hasOptional, tupleHas, includes } = helpers;

  // Check required object property
  has(obj, "key", Is.String);

  // Check optional object property
  hasOptional(obj, "optional", Is.Number); // { optional?: number | undefined }

  // Check tuple element at specific index
  tupleHas(tuple, 0, Is.String); // [string, ...unknown[]]

  // Check if value is in array (for union types)
  const colors = ["red", "blue", "green"] as const;
  includes(colors, val); // "red" | "blue" | "green"

  return val;
});
```

## Specialized Modules

Guardis includes specialized modules for domain-specific types:

### HTTP Module

```ts
import { isNativeURL, isRequest, isResponse } from "jsr:@spudlabs/guardis/http";

// Web API types
isNativeURL(new URL("https://example.com")); // true
isRequest(new Request("https://api.com")); // true
isResponse(new Response("data")); // true

// All modes available
isRequest.strict(value); // throws if not Request
isResponse.optional(value); // allows undefined
```

## Batch Creation

Generate multiple type guards at once:

```ts
import { batch } from "jsr:@spudlabs/guardis";

const { isRed, isBlue, isGreen } = batch({
  Red: (val) => val === "red" ? val : null,
  Blue: (val) => val === "blue" ? val : null,
  Green: (val) => val === "green" ? val : null,
});

// Automatic camelCase conversion
const { isUserRole, isAdminRole } = batch({
  "user-role": (val) => val === "user" ? val : null,
  AdminRole: (val) => val === "admin" ? val : null,
});

// All guards get full mode support
isRed.strict("blue"); // throws
isBlue.optional(undefined); // true
```

## Extending the Is Object

Add your own type guards to the `Is` namespace:

```ts
import { extend, Is as BaseIs } from "jsr:@spudlabs/guardis";

// Create new Is object with custom guards
const Is = extend(BaseIs, {
  Email: (val) => typeof val === "string" && val.includes("@") ? val : null,
  PositiveNumber: (val) => typeof val === "number" && val > 0 ? val : null,
});

// Use built-in and custom guards together
Is.String("hello"); // built-in
Is.Email("user@domain.com"); // custom
Is.PositiveNumber(42); // custom

// All modes work with custom guards
Is.Email.strict(invalidEmail); // throws
Is.PositiveNumber.optional(undefined); // true
```

## Real-World Examples

### API Response Validation

```ts
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

const isApiResponse = <T>(dataGuard: (val: unknown) => val is T) =>
  createTypeGuard<ApiResponse<T>>((val, { has, hasOptional }) => {
    if (!Is.Object(val)) return null;

    if (
      has(val, "success", Is.Boolean) &&
      hasOptional(val, "data", dataGuard) &&
      hasOptional(val, "error", Is.String)
    ) {
      return val;
    }

    return null;
  });

// Usage
const isUserResponse = isApiResponse(isUser);
if (isUserResponse(response)) {
  console.log(response.data?.name); // TypeScript knows the shape
}
```

### Form Validation

```ts
type ContactForm = {
  name: string;
  email: string;
  age: number;
  newsletter: boolean;
};

const isContactForm = createTypeGuard<ContactForm>((val, { has }) => {
  if (!Is.Object(val)) return null;

  if (
    has(val, "name", Is.String) &&
    has(val, "email", (v) => Is.String(v) && v.includes("@") ? v : null) &&
    has(val, "age", (v) => Is.Number(v) && v >= 0 ? v : null) &&
    has(val, "newsletter", Is.Boolean)
  ) {
    return val;
  }

  return null;
});

// Use in form handler
function handleSubmit(formData: unknown) {
  try {
    isContactForm.strict(formData, "Invalid form data");
    // formData is now typed as ContactForm
    saveContact(formData);
  } catch (error) {
    showError(error.message);
  }
}
```

## TypeScript Integration

Guardis is designed to work seamlessly with TypeScript:

- **Type Narrowing**: Guards narrow types in `if` statements
- **Assertion Functions**: `.assert()` methods work as TypeScript assertions
- **Generic Support**: Create guards for generic types
- **Strict Typing**: All guards are fully typed with proper inference

```ts
function processData(input: unknown) {
  if (Is.Array(input)) {
    // TypeScript knows input is unknown[]
    input.forEach((item) => {/* ... */});
  }

  // Assertion style
  const assertIsString: typeof Is.String.assert = Is.String.assert;
  assertIsString(input);
  // TypeScript knows input is string after this line
}
```

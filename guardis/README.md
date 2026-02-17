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
- **Multiple Modes**: Basic, strict (throws), assert, optional, notEmpty, and validate variants
- **StandardSchemaV1 Compatible**: Built-in `validate` method returns structured results with detailed error messages
- **Helper Functions**: Built-in utilities for object, array and tuple validation
- **Extensible**: Create custom guards, extend existing guards, and extend the core library
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
  - [Validate Mode (StandardSchemaV1)](#validate-mode-standardschemav1)
- [Creating Custom Type Guards](#creating-custom-type-guards)
- [Extending Type Guards](#extending-type-guards)
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

Throws a `TypeError` if the predicate fails. Error messages include the expected type name, the received value, and path information for nested validations.

```ts
// Throws TypeError if validation fails
Is.String.strict(value);

// Error messages include type name and received value
Is.String.strict(123);
// TypeError: Expected string. Received: 123

Is.Number.strict("hello");
// TypeError: Expected number. Received: "hello"

// With custom error message (overrides default)
Is.Number.strict(value, "Expected a number for calculation");
```

**Path tracking for nested validations:**

When validating nested objects, strict mode includes the path to the failing property:

```ts
const isAddress = createTypeGuard("Address", (v, { has }) =>
  Is.Object(v) && has(v, "city", Is.String) && has(v, "zip", Is.Number) ? v : null
);

const isPerson = createTypeGuard("Person", (v, { has }) =>
  Is.Object(v) && has(v, "name", Is.String) && has(v, "address", isAddress) ? v : null
);

isPerson.strict({ name: "Alice", address: { city: 456, zip: 12345 } });
// TypeError: Expected string. Received: 456 at path: address.city

// Array indices are also included in paths
const isStringArray = Is.Array.of(Is.String);
isStringArray.strict(["a", "b", 123, "d"]);
// TypeError: Expected string. Received: 123 at path: 2
```

**Fail-fast behavior:**

Strict mode throws on the first validation failure, unlike `validate()` which collects all errors:

```ts
isPerson.strict({ name: 123, address: { city: 456 } });
// TypeError: Expected string. Received: 123 at path: name
// (Only first error - stops immediately)

isPerson.validate({ name: 123, address: { city: 456 } });
// { issues: [
//   { message: "Expected string. Received: 123", path: ["name"] },
//   { message: "Expected string. Received: 456", path: ["address", "city"] }
// ]}
// (Collects all errors)
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

### Validate Mode (StandardSchemaV1)

The `validate` method provides [StandardSchemaV1](https://github.com/standard-schema/standard-schema) compatibility, returning structured results with detailed error messages instead of throwing or returning booleans.

```ts
// Valid inputs return { value: T }
Is.String.validate("hello");
// { value: "hello" }

Is.Number.validate(42);
// { value: 42 }

// Invalid inputs return { issues: [{ message: string }] }
Is.String.validate(123);
// { issues: [{ message: 'Expected string. Received: 123' }] }

Is.Number.validate("not a number");
// { issues: [{ message: 'Expected number. Received: "not a number"' }] }

Is.Boolean.validate(null);
// { issues: [{ message: 'Expected boolean. Received: null' }] }
```

Error messages include the expected type name and a JSON representation of the received value:

```ts
// Complex types show detailed error messages
Is.Array.validate({ key: "value" });
// { issues: [{ message: 'Expected array. Received: {"key":"value"}' }] }

// Union types show combined type names
Is.Nil.validate("string");
// { issues: [{ message: 'Expected null | undefined. Received: "string"' }] }

// notEmpty variants include the constraint in the error
Is.String.notEmpty.validate("");
// { issues: [{ message: 'Expected non-empty string. Received: ""' }] }

Is.Array.notEmpty.validate([]);
// { issues: [{ message: 'Expected non-empty array. Received: []' }] }
```

**Path tracking for nested validations:**

When validating nested objects or arrays, each issue includes a `path` array showing where the error occurred:

```ts
const isAddress = createTypeGuard("Address", (v, { has }) =>
  Is.Object(v) && has(v, "city", Is.String) && has(v, "zip", Is.Number) ? v : null
);

const isPerson = createTypeGuard("Person", (v, { has }) =>
  Is.Object(v) && has(v, "name", Is.String) && has(v, "address", isAddress) ? v : null
);

// Nested validation errors include path information
isPerson.validate({ name: "Alice", address: { city: 123, zip: "invalid" } });
// {
//   issues: [
//     { message: "Expected string. Received: 123", path: ["address", "city"] },
//     { message: "Expected number. Received: \"invalid\"", path: ["address", "zip"] }
//   ]
// }

// Array validation includes indices in the path
const isStringArray = Is.Array.of(Is.String);
isStringArray.validate(["a", 123, "c"]);
// { issues: [{ message: "Expected string. Received: 123", path: [1] }] }

// Deeply nested paths
const isPeople = Is.Array.of(isPerson);
isPeople.validate([{ name: "Alice", address: { city: 456, zip: 12345 } }]);
// { issues: [{ message: "Expected string. Received: 456", path: [0, "address", "city"] }] }
```

**Collecting all errors:**

Unlike strict mode which fails fast, `validate()` collects all validation errors:

```ts
isPerson.validate({ name: 123, address: { city: 456, zip: "bad" } });
// {
//   issues: [
//     { message: "Expected string. Received: 123", path: ["name"] },
//     { message: "Expected string. Received: 456", path: ["address", "city"] },
//     { message: "Expected number. Received: \"bad\"", path: ["address", "zip"] }
//   ]
// }
```

Works with typed arrays and custom type guards:

```ts
// Typed arrays
const isStringArray = Is.Array.of(Is.String);

isStringArray.validate(["a", "b", "c"]);
// { value: ["a", "b", "c"] }

isStringArray.validate([1, 2, 3]);
// { issues: [{ message: 'Expected string. Received: 1', path: [0] }] }

// Custom type guards
const isPositive = Is.Number.extend("positive number", (val) =>
  val > 0 ? val : null
);

isPositive.validate(42);
// { value: 42 }

isPositive.validate(-5);
// { issues: [{ message: 'Expected positive number. Received: -5' }] }
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
  const { has, hasOptional, hasNot, tupleHas, includes, keyOf, fail } = helpers;

  // Check required object property
  has(obj, "key", Is.String);

  // Check required property with custom error message
  has(obj, "email", Is.String, "Email is required");

  // Check optional object property
  hasOptional(obj, "optional", Is.Number); // { optional?: number | undefined }

  // Check that a property does NOT exist
  hasNot(obj, "deleted"); // ensures "deleted" property is absent

  // Check tuple element at specific index
  tupleHas(tuple, 0, Is.String); // [string, ...unknown[]]

  // Check if value is in array (for union types)
  const colors = ["red", "blue", "green"] as const;
  includes(colors, val); // "red" | "blue" | "green"

  // Check if a key exists in an object
  keyOf(key, someObject); // key is keyof typeof someObject

  // Return custom validation error (works with validate and strict modes)
  if (val.age < 0) return fail("Age must be non-negative");

  return val;
});
```

**Custom error messages:**

The `has`, `hasOptional`, `keyOf`, and `fail` helpers support custom error messages that appear in validation results and strict mode errors:

```ts
const isPerson = createTypeGuard("Person", (v, { has, fail }) => {
  if (!Is.Object(v)) return fail("Value must be an object");
  if (!has(v, "name", Is.String, "Name is required and must be a string")) return null;
  if (!has(v, "age", Is.Number, "Age must be a number")) return null;

  const person = v as { name: string; age: number };
  if (person.age < 0) return fail("Age must be non-negative");
  if (person.age > 150) return fail("Age must be realistic");

  return v;
});

// Custom messages appear in validate results
isPerson.validate({ name: 123 });
// { issues: [{ message: "Name is required and must be a string", path: ["name"] }] }

// And in strict mode errors
isPerson.strict({ age: -5, name: "Alice" });
// TypeError: Age must be non-negative
```

## Extending Type Guards

The `extend` method allows you to build upon existing type guards by adding additional validation rules. This is particularly useful when you need to add constraints or refinements to a base type.

### Basic Extension

```ts
// Extend isString to validate email format
const isEmail = isString.extend((val) => {
  return val.includes("@") && val.includes(".") ? val : null;
});

isEmail("user@example.com"); // true
isEmail("invalid-email"); // false
isEmail(123); // false (fails base validation)
```

### Number Range Validation

```ts
// Extend isNumber to create a percentage validator (0-100)
const isPercentage = isNumber.extend((val) => {
  return val >= 0 && val <= 100 ? val : null;
});

isPercentage(50); // true
isPercentage(150); // false
isPercentage("50"); // false
```

### String Pattern Validation

```ts
// Extend isString to validate phone numbers
const isPhoneNumber = isString.extend((val) => {
  return /^\d{3}-\d{3}-\d{4}$/.test(val) ? val : null;
});

isPhoneNumber("555-123-4567"); // true
isPhoneNumber("invalid"); // false
```

### Object Property Refinement

```ts
type User = { name: string; age: number };

const isUser = createTypeGuard<User>((val, { has }) => {
  if (Is.Object(val) && has(val, "name", Is.String) && has(val, "age", Is.Number)) {
    return val;
  }
  return null;
});

// Extend to only accept adults
const isAdult = isUser.extend((val) => {
  return val.age >= 18 ? val : null;
});

isAdult({ name: "Alice", age: 25 }); // true
isAdult({ name: "Bob", age: 16 }); // false
```

### Chained Extensions

Extensions can be chained to create increasingly specific validators:

```ts
const isPositiveNumber = isNumber.extend((val) =>
  val > 0 ? val : null
);

const isPositiveInteger = isPositiveNumber.extend((val) =>
  Number.isInteger(val) ? val : null
);

const isEvenPositiveInteger = isPositiveInteger.extend((val) =>
  val % 2 === 0 ? val : null
);

isEvenPositiveInteger(10); // true
isEvenPositiveInteger(9); // false (not even)
isEvenPositiveInteger(3.5); // false (not integer)
isEvenPositiveInteger(-2); // false (not positive)
```

### Extensions with Helper Functions

Extended validators have access to the same helper functions as the base validators:

```ts
// Create a status type with specific allowed values
const validStatuses = ["active", "inactive", "pending"] as const;

const isStatus = isString.extend((val, { includes }) => {
  if (includes(validStatuses, val)) {
    return val;
  }
  
  return null;
});

isStatus("active"); // true
isStatus("completed"); // false
```

### All Modes Work with Extensions

Extended type guards support all the same modes as base type guards:

```ts
const isPositiveNumber = isNumber.extend((val) =>
  val > 0 ? val : null
);

// Basic mode
isPositiveNumber(10); // true

// Strict mode (throws on failure)
isPositiveNumber.strict(10); // passes
isPositiveNumber.strict(-5); // throws TypeError

// Assert mode
const assertIsPositive: typeof isPositiveNumber.assert = isPositiveNumber.assert;
assertIsPositive(10); // passes
// assertIsPositive(-5); // throws

// Optional mode
isPositiveNumber.optional(10); // true
isPositiveNumber.optional(undefined); // true
isPositiveNumber.optional(-5); // false
```

## Specialized Modules

Guardis includes specialized modules for domain-specific types:

### Async Module

```ts
import { isAsyncFunction, isPromise, isPromiseLike, isThenable } from "jsr:@spudlabs/guardis/async";

// Async types
isAsyncFunction(async () => {}); // true
isPromise(Promise.resolve(42)); // true
isPromiseLike({ then: () => {} }); // true (checks for .then method)
isThenable({ then: () => {} }); // true (alias for isPromiseLike)

// All modes available
isPromise.strict(value); // throws if not Promise
isAsyncFunction.optional(value); // allows undefined
```

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

### String Module

```ts
import { isEmail, isInternationalPhone, isUSPhone, isPhoneNumber, isUUIDv4, isCommaDelimited } from "jsr:@spudlabs/guardis/strings";

// Email validation
isEmail("user@example.com"); // true
isEmail("invalid-email"); // false

// Phone number validation
isInternationalPhone("+1 234 567 8901"); // true (international format)
isUSPhone("555-123-4567"); // true (US format)
isPhoneNumber("+44 20 7946 0958"); // true (accepts both formats)

// UUID v4 validation
isUUIDv4("550e8400-e29b-41d4-a716-446655440000"); // true
isUUIDv4("invalid-uuid"); // false

// Comma-delimited string validation (for CSV-like data)
isCommaDelimited("value1,value2,value3"); // true
isCommaDelimited('"quoted,value",unquoted'); // true (supports quoted values)

// All modes available
isEmail.strict(value); // throws if not a valid email
isPhoneNumber.optional(value); // allows undefined
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
- **Type Inference**: Extract types from guards using the `_TYPE` property

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

### Type Inference with `_TYPE`

Every type guard includes a `_TYPE` property that allows you to extract the guarded type for use in other parts of your code:

```ts
// Extract the type from a built-in guard
type StringType = typeof Is.String._TYPE; // string
type NumberType = typeof Is.Number._TYPE; // number

// Extract the type from a custom guard
type User = { id: number; name: string };
const isUser = createTypeGuard<User>((val, { has }) =>
  has(val, "id", Is.Number) && has(val, "name", Is.String) ? val : null
);

// Use _TYPE to infer the type elsewhere
type UserType = typeof isUser._TYPE; // { id: number; name: string }

// Useful for creating related types
type UserArray = Array<typeof isUser._TYPE>;
type UserResponse = {
  success: boolean;
  user: typeof isUser._TYPE;
};

// Works with extended guards too
const isAdult = isUser.extend((val) => val.age >= 18 ? val : null);
type AdultType = typeof isAdult._TYPE; // inferred type from extension
```

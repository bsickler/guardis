# describeInput

A type-safe input validation utility for Hono framework that integrates with Guardis type guards.

## Overview

`describeInput` is a higher-order function that creates Hono validators for different validation
targets (json, form, query, etc.). It combines Hono's validator middleware with Guardis type guards
to provide runtime type checking with compile-time type safety. It supports both **TypeGuard** and
**shape object** inputs, as well as an optional transformation function to reshape validated data
before it reaches your handler.

## Installation

```typescript
import { describeInput, createDescribeInput } from "@spudlabs/guardis-hono";
import { createTypeGuard, isNumber, isString } from "@spudlabs/guardis";
```

## Basic Usage

### With a Shape Object

The simplest approach — pass a shape object mapping property names to guards. The TypeScript type is inferred automatically:

```typescript
import { Hono } from "hono";
import { describeInput } from "@spudlabs/guardis-hono";
import { isNumber, isString } from "@spudlabs/guardis";

const app = new Hono();

app.post(
  "/users",
  describeInput("json", { name: isString, age: isNumber, email: isString }),
  (c) => {
    const data = c.req.valid("json"); // Typed as { name: string; age: number; email: string }
    return c.json({ message: "User created", data });
  },
);
```

### With a TypeGuard

For more complex validation logic, create a TypeGuard first:

```typescript
import { createTypeGuard, isNumber, isString } from "@spudlabs/guardis";

const isUserInput = createTypeGuard({
  name: isString,
  age: isNumber,
  email: isString,
});

app.post(
  "/users",
  describeInput("json", isUserInput),
  (c) => {
    const data = c.req.valid("json"); // Typed as { name: string; age: number; email: string }
    return c.json({ message: "User created", data });
  },
);
```

## Validation Targets

`describeInput` supports all Hono validation targets:

### JSON Body Validation

```typescript
app.post("/api/users", describeInput("json", { name: isString, age: isNumber }), (c) => {
  const body = c.req.valid("json"); // { name: string; age: number }
  // ...
});
```

### Form Data Validation

```typescript
app.post("/login", describeInput("form", { username: isString, password: isString }), (c) => {
  const formData = c.req.valid("form"); // { username: string; password: string }
  // ...
});
```

### Query Parameters Validation

```typescript
app.get("/items", describeInput("query", { page: isString, limit: isString }), (c) => {
  const query = c.req.valid("query"); // { page: string; limit: string }
  // ...
});
```

### Other Targets

- `header` - Validate request headers
- `param` - Validate URL parameters
- `cookie` - Validate cookies

## Method-Based Restrictions

`describeInput` enforces HTTP method-based validation rules:

- **GET/HEAD requests**: Cannot use `json` or `form` validation targets
- **Other methods**: Can use all validation targets

```typescript
// ✅ Valid
app.get("/users", describeInput("query", { page: isString }), handler);
app.post("/users", describeInput("json", { name: isString }), handler);

// ❌ TypeScript error - GET cannot have json body
app.get("/users", describeInput("json", { name: isString }), handler);
```

## Error Handling

When validation fails, `describeInput` automatically returns a 400 Bad Request response with detailed validation issues:

```json
{
  "message": "Input validation failed for target: json",
  "issues": [
    { "message": "Expected string, got number", "path": ["name"] }
  ]
}
```

### Custom Error Formatting

Use `createDescribeInput` to customize the error response format and status code:

```typescript
import { createDescribeInput } from "@spudlabs/guardis-hono";

const customDescribeInput = createDescribeInput({
  formatError: (ctx) => ({
    body: {
      code: "VALIDATION_ERROR",
      message: ctx.message,
      details: ctx.issues.map((issue) => ({
        path: issue.path?.join(".") ?? "root",
        message: issue.message,
      })),
    },
    status: 422,
  }),
});

app.post(
  "/users",
  customDescribeInput("json", { name: isString, age: isNumber }),
  (c) => {
    const data = c.req.valid("json");
    return c.json({ success: true });
  },
);
```

The `formatError` callback receives a `ValidationErrorContext` with:

- `target` - The validation target (e.g., "json", "query")
- `issues` - Array of validation issues from the type guard
- `message` - Default error message
- `value` - The original value that failed validation

The callback returns an object with:

- `body` - The error response body (any shape)
- `status` - Optional HTTP status code (defaults to 400)

## Transformation Functions

`describeInput` supports an optional transformation function as its third parameter. This allows you to transform validated input into a different shape after validation passes.

### Basic Transformation

```typescript
app.post(
  "/greet",
  describeInput("json", { hello: isString }, (input) => ({
    greeting: `Hello, ${input.hello}!`,
    timestamp: Date.now(),
  })),
  (c) => {
    const data = c.req.valid("json"); // Typed as { greeting: string; timestamp: number }
    return c.json({ greeting: data.greeting, timestamp: data.timestamp });
  },
);
```

### Use Cases

Transformation functions are useful for:

- **Adding computed fields**: Timestamps, UUIDs, derived values
- **Normalizing data**: Converting strings to lowercase, trimming whitespace
- **Enriching input**: Adding default values or server-side data
- **Reshaping data**: Converting between different data structures

### Type Safety

The transformation function receives the validated input type and can return any output type. TypeScript will correctly infer the output type for `c.req.valid()`:

```typescript
// Input: { name: string }
// Output: { name: string; createdAt: Date; id: string }

describeInput("json", { name: isString }, (input) => ({
  ...input,
  createdAt: new Date(),
  id: crypto.randomUUID(),
}));
```

## Advanced Examples

### Nested Objects

```typescript
const isAddress = createTypeGuard({
  street: isString,
  city: isString,
  zipCode: isString,
});

// Use a TypeGuard as a field value for nesting
app.post(
  "/users",
  describeInput("json", { name: isString, address: isAddress }),
  (c) => {
    const user = c.req.valid("json");
    // user.address.city is properly typed as string
    return c.json({ success: true });
  },
);

// Or nest shapes inline
app.post(
  "/users",
  describeInput("json", {
    name: isString,
    address: { street: isString, city: isString, zipCode: isString },
  }),
  (c) => {
    const user = c.req.valid("json");
    return c.json({ success: true });
  },
);
```

### Multiple Validators

```typescript
app.post(
  "/search",
  describeInput("query", { q: isString, page: isString }),
  describeInput("json", { filters: isArray.of(isString) }),
  (c) => {
    const query = c.req.valid("query");
    const body = c.req.valid("json");
    // Both are validated and typed
    return c.json({ results: [] });
  },
);
```

### Guard Modes in Shapes

Shapes support all guard modes as field values:

```typescript
app.post(
  "/users",
  describeInput("json", {
    name: isString.notEmpty,          // rejects empty strings
    email: isString,
    nickname: isString.optional,      // accepts undefined
    role: isString.or(isNumber),      // union type
    tags: isArray.of(isString),       // typed array
  }),
  (c) => {
    const data = c.req.valid("json");
    return c.json({ success: true });
  },
);
```

## Performance Considerations

- Type guards are executed on every request
- Failed validations short-circuit with a 400 response

## TypeScript Support

`describeInput` provides full type inference:

- Input types are validated at compile time
- `c.req.valid()` returns properly typed values
- Method restrictions are enforced by the type system
- Invalid validation targets cause TypeScript errors

## See Also

- [Hono Validator Documentation](https://hono.dev/guides/validation)
- [Guardis Type Guards](https://github.com/spudlabs/guardis)
- [TypeScript Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)

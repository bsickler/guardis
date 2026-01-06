# describeInput

A type-safe input validation utility for Hono framework that integrates with Guardis type guards.

## Overview

`describeInput` is a higher-order function that creates Hono validators for different validation
targets (json, form, query, etc.). It combines Hono's validator middleware with Guardis type guards
to provide runtime type checking with compile-time type safety. It also supports an optional
transformation function to reshape validated data before it reaches your handler.

## Installation

```typescript
import { describeInput } from "@spudlabs/guardis-hono";
import { createTypeGuard } from "@spudlabs/guardis";
```

## Basic Usage

```typescript
import { Hono } from "hono";
import { describeInput } from "@spudlabs/guardis-hono";
import { createTypeGuard } from "@spudlabs/guardis";

const app = new Hono();

// Define your input type
interface UserInput {
  name: string;
  age: number;
  email: string;
}

// Create a type guard
const isUserInput = guard<UserInput>({
  name: "string",
  age: "number",
  email: "string",
});

// Use describeInput to validate JSON body
app.post(
  "/users",
  describeInput("json", isUserInput),
  (c) => {
    const data = c.req.valid("json"); // Fully typed as UserInput
    return c.json({ message: "User created", data });
  },
);
```

## Validation Targets

`describeInput` supports all Hono validation targets:

### JSON Body Validation

```typescript
const validateJson = describeInput("json", isUserInput);

app.post("/api/users", validateJson, (c) => {
  const body = c.req.valid("json"); // UserInput
  // ...
});
```

### Form Data Validation

```typescript
const isFormData = guard<{ username: string; password: string }>({
  username: "string",
  password: "string",
});

const validateForm = describeInput("form", isFormData);

app.post("/login", validateForm, (c) => {
  const formData = c.req.valid("form"); // { username: string; password: string }
  // ...
});
```

### Query Parameters Validation

```typescript
const isQueryParams = guard<{ page: string; limit: string }>({
  page: "string",
  limit: "string",
});

const validateQuery = describeInput("query", isQueryParams);

app.get("/items", validateQuery, (c) => {
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
app.get("/users", describeInput("query", isQuery), handler);
app.post("/users", describeInput("json", isUserInput), handler);

// ❌ TypeScript error - GET cannot have json body
app.get("/users", describeInput("json", isUserInput), handler);
```

## Error Handling

When validation fails, `describeInput` automatically returns a 400 Bad Request response:

```json
{
  "message": "Input validation failed for target: json"
}
```

You can customize error handling by wrapping the validator:

```typescript
const customValidator = (target, guard) => {
  return validator(target, (value, c) => {
    if (guard(value)) return value;

    return c.json(
      {
        error: "Validation Error",
        target,
        details: "Custom error message",
      },
      422,
    );
  });
};
```

## Transformation Functions

`describeInput` supports an optional transformation function as its third parameter. This allows you to transform validated input into a different shape after validation passes.

### Basic Transformation

```typescript
interface RawInput {
  hello: string;
}

interface TransformedOutput {
  greeting: string;
  timestamp: number;
}

const isRawInput = createTypeGuard<RawInput>({
  hello: "string",
});

app.post(
  "/greet",
  describeInput("json", isRawInput, (input) => ({
    greeting: `Hello, ${input.hello}!`,
    timestamp: Date.now(),
  })),
  (c) => {
    const data = c.req.valid("json"); // Typed as TransformedOutput
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

describeInput("json", isNameInput, (input) => ({
  ...input,
  createdAt: new Date(),
  id: crypto.randomUUID(),
}));
```

## Advanced Examples

### Nested Objects

```typescript
interface Address {
  street: string;
  city: string;
  zipCode: string;
}

interface UserWithAddress {
  name: string;
  address: Address;
}

const isAddress = createTypeGuard<Address>({
  street: "string",
  city: "string",
  zipCode: "string",
});

const isUserWithAddress = createTypeGuard<UserWithAddress>({
  name: "string",
  address: isAddress,
});

app.post(
  "/users",
  describeInput("json", isUserWithAddress),
  (c) => {
    const user = c.req.valid("json");
    // user.address.city is properly typed
    return c.json({ success: true });
  },
);
```

### Multiple Validators

```typescript
app.post(
  "/search",
  describeInput("query", isQueryParams),
  describeInput("json", isSearchBody),
  (c) => {
    const query = c.req.valid("query");
    const body = c.req.valid("json");
    // Both are validated and typed
    return c.json({ results: [] });
  },
);
```

### Arrays and Complex Types

```typescript
interface BatchRequest {
  items: Array<{ id: string; quantity: number }>;
  metadata?: Record<string, string>;
}

app.post(
  "/batch",
  describeInput("json", isBatchRequest),
  (c) => {
    const batch = c.req.valid("json");
    return c.json({ processed: batch.items.length });
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

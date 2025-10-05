# describeInput

A type-safe input validation utility for Hono framework that integrates with Guardis type guards.

## Overview

`describeInput` is a higher-order function that creates Hono validators for different validation targets (json, form, query, etc.). It combines Hono's validator middleware with Guardis type guards to provide runtime type checking with compile-time type safety.

## Installation

```typescript
import { describeInput } from "@spudlabs/guardis-hono";
import { guard } from "@spudlabs/guardis";
```

## Basic Usage

```typescript
import { Hono } from "hono";
import { describeInput } from "@spudlabs/guardis-hono";
import { guard } from "@spudlabs/guardis";

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
  }
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
        details: "Custom error message"
      },
      422
    );
  });
};
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

const isAddress = guard<Address>({
  street: "string",
  city: "string",
  zipCode: "string",
});

const isUserWithAddress = guard<UserWithAddress>({
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
  }
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
  }
);
```

### Arrays and Complex Types

```typescript
interface BatchRequest {
  items: Array<{ id: string; quantity: number }>;
  metadata?: Record<string, string>;
}

const isBatchRequest = guard<BatchRequest>({
  items: (value): value is Array<{ id: string; quantity: number }> =>
    Array.isArray(value) &&
    value.every(item =>
      typeof item.id === "string" &&
      typeof item.quantity === "number"
    ),
  metadata: (value): value is Record<string, string> | undefined =>
    value === undefined ||
    (typeof value === "object" &&
     Object.values(value).every(v => typeof v === "string")),
});

app.post(
  "/batch",
  describeInput("json", isBatchRequest),
  (c) => {
    const batch = c.req.valid("json");
    return c.json({ processed: batch.items.length });
  }
);
```

## Type Parameters

```typescript
describeInput<
  InputType,        // The expected input type
  P,                // Path parameter type
  M,                // HTTP method
  U,                // Validation target
  OutputType,       // Output type after validation
  OutputTypeExcludeResponseType,
  P2,
  V,                // Validation schema
  E                 // Environment type
>(target, typeGuard)
```

Most type parameters are inferred automatically. You typically only need to specify the validation target:

```typescript
describeInput("json", myTypeGuard)
```

## Integration with Guardis

`describeInput` works seamlessly with all Guardis type guards:

```typescript
import { guard, batch, extend } from "@spudlabs/guardis";

// Simple guards
const isString = guard<string>("string");

// Batch validation
const isStringArray = batch(isString);

// Extended guards
const isUser = extend(
  guard<{ name: string }>({ name: "string" }),
  guard<{ email: string }>({ email: "string" })
);

// All work with describeInput
describeInput("json", isUser);
```

## Performance Considerations

- Type guards are executed on every request
- Validation happens before your route handler
- Failed validations short-circuit with a 400 response
- Console logging is included for debugging (line 89 in mod.ts)

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

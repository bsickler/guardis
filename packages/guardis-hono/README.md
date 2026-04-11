# Guardis Hono

Type-safe input validation middleware for [Hono](https://hono.dev), powered by [Guardis](https://jsr.io/@spudlabs/guardis) type guards.

Validate request bodies, query parameters, headers, and more — with full TypeScript inference flowing through to your route handlers.

```ts
import { Hono } from "hono";
import { describeInput } from "@spudlabs/guardis-hono";
import { isNumber, isString } from "@spudlabs/guardis";

const app = new Hono();

app.post(
  "/users",
  describeInput("json", { name: isString, age: isNumber, email: isString }),
  (c) => {
    const data = c.req.valid("json"); // { name: string; age: number; email: string }
    return c.json({ message: "User created", data });
  },
);
```

Invalid input automatically returns a `400` response with structured error details — no try/catch needed.

## Install

**Deno**
```bash
deno add jsr:@spudlabs/guardis-hono jsr:@spudlabs/guardis
```

**Node.js**
```bash
npm install @spudlabs/guardis-hono @spudlabs/guardis
```

**Bun**
```bash
bun add @spudlabs/guardis-hono @spudlabs/guardis
```

## Validation Targets

`describeInput` supports all Hono validation targets: `json`, `form`, `query`, `header`, `param`, and `cookie`.

```ts
app.post("/login", describeInput("form", { username: isString, password: isString }), handler);
app.get("/items", describeInput("query", { page: isString, limit: isString }), handler);
app.get("/users/:id", describeInput("param", { id: isString }), handler);
```

GET and HEAD requests cannot use `json` or `form` targets — TypeScript will catch this at compile time.

Guards support modes, nested objects, and union types:

```ts
app.post(
  "/users",
  describeInput("json", {
    name: isString.notEmpty,
    nickname: isString.optional,
    role: isString.or(isNumber),
    address: { street: isString, city: isString },
  }),
  (c) => {
    const data = c.req.valid("json");
    // data.address.city is typed as string
    return c.json({ success: true });
  },
);
```

## Transformations

Pass an optional third argument to reshape validated data before it reaches your handler:

```ts
app.post(
  "/users",
  describeInput("json", { name: isString }, (input) => ({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  })),
  (c) => {
    const data = c.req.valid("json"); // { name: string; id: string; createdAt: Date }
    return c.json(data);
  },
);
```

Useful for adding computed fields, normalizing data, or enriching input with server-side values.

## Multiple Validators

Stack validators to check different parts of the request independently:

```ts
app.post(
  "/search",
  describeInput("query", { q: isString, page: isString }),
  describeInput("json", { filters: isArray.of(isString) }),
  (c) => {
    const query = c.req.valid("query");
    const body = c.req.valid("json");
    return c.json({ results: [] });
  },
);
```

## Error Handling

Failed validation returns a `400` response by default:

```json
{
  "message": "Input validation failed for target: json",
  "issues": [
    { "message": "Expected string, got number", "path": ["name"] }
  ]
}
```

Use `createDescribeInput` to customize the error format and status code:

```ts
import { createDescribeInput } from "@spudlabs/guardis-hono";

const describeInput = createDescribeInput({
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
```

The `formatError` callback receives a `ValidationErrorContext` with `target`, `issues`, `message`, and `value`. It returns `{ body, status? }`.

import { assertEquals } from "@std/assert";
import { Hono } from "hono";
import { createDescribeInput, describeInput } from "./mod.ts";
import type { ValidationErrorContext } from "./mod.ts";
import { createTypeGuard, Is } from "@spudlabs/guardis";

// Test type guard for a User object
type User = { name: string; age: number };
const isUser = createTypeGuard<User>(
  "isUser",
  (v, { has }) => Is.Object(v) && has(v, "name", Is.String) && has(v, "age", Is.Number) ? v : null,
);

// Test type guard for a nested Address object
type Address = { street: string; city: string; zip: number };
const isAddress = createTypeGuard<Address>("isAddress", (v, { has }) =>
  Is.Object(v) &&
    has(v, "street", Is.String) &&
    has(v, "city", Is.String) &&
    has(v, "zip", Is.Number)
    ? v
    : null);

// Test type guard for a User with nested Address
type UserWithAddress = { name: string; address: Address };
const isUserWithAddress = createTypeGuard<UserWithAddress>(
  "isUserWithAddress",
  (v, { has }) =>
    Is.Object(v) &&
      has(v, "name", Is.String) &&
      has(v, "address", isAddress)
      ? v
      : null,
);

Deno.test("describeInput - valid JSON input returns 200", async () => {
  const app = new Hono();

  app.post("/user", describeInput("json", isUser), (c) => {
    return c.json({ success: true });
  });

  const res = await app.request("/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "John", age: 30 }),
  });

  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data, { success: true });
});

Deno.test("describeInput - invalid JSON input returns 400 with issues", async () => {
  const app = new Hono();

  app.post("/user", describeInput("json", isUser), (c) => {
    return c.json({ success: true });
  });

  const res = await app.request("/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: 123, age: "invalid" }),
  });

  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.message, "Input validation failed for target: json");
  assertEquals(Array.isArray(data.issues), true);
  assertEquals(data.issues.length > 0, true);
  assertEquals(typeof data.issues[0].message, "string");
});

Deno.test("describeInput - missing required fields returns 400 with issues", async () => {
  const app = new Hono();

  app.post("/user", describeInput("json", isUser), (c) => {
    return c.json({ success: true });
  });

  const res = await app.request("/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "John" }), // missing 'age'
  });

  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.message, "Input validation failed for target: json");
  assertEquals(Array.isArray(data.issues), true);
});

Deno.test("describeInput - nested object validation returns issues", async () => {
  const app = new Hono();

  app.post("/user-address", describeInput("json", isUserWithAddress), (c) => {
    return c.json({ success: true });
  });

  const res = await app.request("/user-address", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "John",
      address: {
        street: "123 Main St",
        city: 456, // should be string
        zip: "invalid", // should be number
      },
    }),
  });

  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.message, "Input validation failed for target: json");
  assertEquals(Array.isArray(data.issues), true);
});

Deno.test("describeInput - transform function is applied on valid input", async () => {
  const app = new Hono();

  type TransformedUser = User & { transformed: true };

  const transformUser = (user: User): TransformedUser => ({
    ...user,
    transformed: true,
  });

  app.post(
    "/user",
    describeInput<User, TransformedUser>("json", isUser, transformUser),
    (c) => {
      const user = c.req.valid("json");
      return c.json(user);
    },
  );

  const res = await app.request("/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "John", age: 30 }),
  });

  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data, { name: "John", age: 30, transformed: true });
});

Deno.test("describeInput - transform function not called on invalid input", async () => {
  const app = new Hono();

  let transformCalled = false;
  const transformUser = (user: { name: string; age: number }) => {
    transformCalled = true;
    return { ...user, transformed: true };
  };

  app.post("/user", describeInput("json", isUser, transformUser), (c) => {
    return c.json({ success: true });
  });

  const res = await app.request("/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: 123, age: "invalid" }),
  });

  assertEquals(res.status, 400);
  assertEquals(transformCalled, false);
});

Deno.test("describeInput - form validation target", async () => {
  const app = new Hono();

  const isFormData = createTypeGuard<{ email: string }>(
    "isFormData",
    (v, { has }) => Is.Object(v) && has(v, "email", Is.String) ? v : null,
  );

  app.post("/form", describeInput("form", isFormData), (c) => {
    return c.json({ success: true });
  });

  // Valid form data
  const formData = new FormData();
  formData.append("email", "test@example.com");

  const res = await app.request("/form", {
    method: "POST",
    body: formData,
  });

  assertEquals(res.status, 200);
});

Deno.test("describeInput - query validation target", async () => {
  const app = new Hono();

  const isQuery = createTypeGuard<{ page: string }>(
    "isQuery",
    (v, { has }) => Is.Object(v) && has(v, "page", Is.String) ? v : null,
  );

  app.get("/items", describeInput("query", isQuery), (c) => {
    return c.json({ success: true });
  });

  // Valid query params
  const res = await app.request("/items?page=1", {
    method: "GET",
  });

  assertEquals(res.status, 200);
});

Deno.test("describeInput - query validation fails with issues", async () => {
  const app = new Hono();

  const isQuery = createTypeGuard<{ page: string; limit: string }>(
    "isQuery",
    (v, { has }) =>
      Is.Object(v) && has(v, "page", Is.String) && has(v, "limit", Is.String) ? v : null,
  );

  app.get("/items", describeInput("query", isQuery), (c) => {
    return c.json({ success: true });
  });

  // Missing required query param 'limit'
  const res = await app.request("/items?page=1", {
    method: "GET",
  });

  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.message, "Input validation failed for target: query");
  assertEquals(Array.isArray(data.issues), true);
});

// Tests for createDescribeInput factory

Deno.test("createDescribeInput - custom error format returns expected structure", async () => {
  const app = new Hono();

  type CustomError = {
    code: string;
    details: Array<{ path: string; message: string }>;
  };

  const customDescribeInput = createDescribeInput<CustomError>({
    formatError: (ctx: ValidationErrorContext) => ({
      code: "VALIDATION_ERROR",
      details: ctx.issues.map((i) => ({
        path: i.path?.map(String).join(".") ?? "root",
        message: i.message,
      })),
    }),
  });

  app.post("/user", customDescribeInput("json", isUser), (c) => {
    return c.json({ success: true });
  });

  const res = await app.request("/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: 123, age: "invalid" }),
  });

  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.code, "VALIDATION_ERROR");
  assertEquals(Array.isArray(data.details), true);
  assertEquals(data.details.length > 0, true);
  assertEquals(typeof data.details[0].path, "string");
  assertEquals(typeof data.details[0].message, "string");
});

Deno.test("createDescribeInput - custom status code is respected", async () => {
  const app = new Hono();

  const customDescribeInput = createDescribeInput({
    errorStatus: 422,
  });

  app.post("/user", customDescribeInput("json", isUser), (c) => {
    return c.json({ success: true });
  });

  const res = await app.request("/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: 123, age: "invalid" }),
  });

  assertEquals(res.status, 422);
  const data = await res.json();
  assertEquals(data.message, "Input validation failed for target: json");
  assertEquals(Array.isArray(data.issues), true);
});

Deno.test("createDescribeInput - valid input passes through correctly", async () => {
  const app = new Hono();

  const customDescribeInput = createDescribeInput({
    formatError: (ctx) => ({ error: ctx.message }),
    errorStatus: 422,
  });

  app.post("/user", customDescribeInput("json", isUser), (c) => {
    const user = c.req.valid("json");
    return c.json(user);
  });

  const res = await app.request("/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "John", age: 30 }),
  });

  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data, { name: "John", age: 30 });
});

Deno.test("createDescribeInput - transform function works with factory-created validator", async () => {
  const app = new Hono();

  type TransformedUser = User & { validated: true };

  const customDescribeInput = createDescribeInput({
    errorStatus: 422,
  });

  const transformUser = (user: User): TransformedUser => ({
    ...user,
    validated: true,
  });

  app.post(
    "/user",
    customDescribeInput<User, TransformedUser>("json", isUser, transformUser),
    (c) => {
      const user = c.req.valid("json");
      return c.json(user);
    },
  );

  const res = await app.request("/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Jane", age: 25 }),
  });

  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data, { name: "Jane", age: 25, validated: true });
});

Deno.test("createDescribeInput - default options work like describeInput", async () => {
  const app = new Hono();

  const defaultFactoryDescribeInput = createDescribeInput();

  app.post("/user", defaultFactoryDescribeInput("json", isUser), (c) => {
    return c.json({ success: true });
  });

  const res = await app.request("/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: 123, age: "invalid" }),
  });

  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.message, "Input validation failed for target: json");
  assertEquals(Array.isArray(data.issues), true);
});

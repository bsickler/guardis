import {
  createTypeGuard,
  isArray,
  isBoolean,
  isNumber,
  isObject,
  isString,
} from "../src/guard.ts";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

// --- Flat (5 fields) -------------------------------------------------------

const FLAT_VALID = {
  name: "Alice",
  age: 30,
  active: true,
  score: 95.5,
  email: "alice@example.com",
};

const FLAT_INVALID = {
  name: 123,
  age: "thirty",
  active: "yes",
  score: null,
  email: 42,
};

// --- Nested (3 levels, 14 fields) ------------------------------------------

const NESTED_VALID = {
  user: {
    name: "Alice",
    email: "alice@example.com",
    age: 30,
    active: true,
  },
  address: {
    street: "123 Main St",
    city: "Springfield",
    state: "IL",
    zip: "62701",
  },
  tags: ["admin", "verified"],
  metadata: {
    source: "web",
    version: 2,
    referral: "campaign-123",
  },
};

const NESTED_INVALID = {
  user: { name: 42, email: true, age: "old", active: "yes" },
  address: { street: 100, city: null, state: 5, zip: false },
  tags: "not-an-array",
  metadata: { source: 999, version: "two", referral: null },
};

// --- Deep (5 levels, 26 fields) --------------------------------------------

const DEEP_VALID = {
  id: 1,
  name: "Acme Corp",
  active: true,
  config: {
    theme: "dark",
    version: 3,
    features: {
      dashboard: true,
      analytics: true,
      notifications: {
        email: true,
        sms: false,
        push: {
          enabled: true,
          provider: "firebase",
          retries: 3,
        },
      },
    },
  },
  tags: ["enterprise", "premium"],
  contacts: {
    primary: {
      name: "Bob",
      email: "bob@acme.com",
      phone: "555-1234",
    },
    billing: {
      name: "Carol",
      email: "carol@acme.com",
      phone: "555-5678",
    },
  },
};

const DEEP_INVALID = {
  id: "not-a-number",
  name: 42,
  active: "yes",
  config: {
    theme: 123,
    version: "three",
    features: {
      dashboard: "yes",
      analytics: 1,
      notifications: {
        email: "yes",
        sms: 0,
        push: {
          enabled: "true",
          provider: 999,
          retries: "three",
        },
      },
    },
  },
  tags: "not-an-array",
  contacts: {
    primary: { name: 1, email: false, phone: 0 },
    billing: { name: 2, email: null, phone: true },
  },
};

// ---------------------------------------------------------------------------
// Parser guards
// ---------------------------------------------------------------------------

type Flat = { name: string; age: number; active: boolean; score: number; email: string };

const flatParser = createTypeGuard<Flat>((v, { has }) => {
  if (
    isObject(v) &&
    has(v, "name", isString) &&
    has(v, "age", isNumber) &&
    has(v, "active", isBoolean) &&
    has(v, "score", isNumber) &&
    has(v, "email", isString)
  ) return v;
  return null;
});

type User = { name: string; email: string; age: number; active: boolean };
type Address = { street: string; city: string; state: string; zip: string };
type Metadata = { source: string; version: number; referral: string };
type Nested = { user: User; address: Address; tags: string[]; metadata: Metadata };

const nestedUserParser = createTypeGuard<User>((v, { has }) => {
  if (
    isObject(v) &&
    has(v, "name", isString) &&
    has(v, "email", isString) &&
    has(v, "age", isNumber) &&
    has(v, "active", isBoolean)
  ) return v;
  return null;
});

const nestedAddressParser = createTypeGuard<Address>((v, { has }) => {
  if (
    isObject(v) &&
    has(v, "street", isString) &&
    has(v, "city", isString) &&
    has(v, "state", isString) &&
    has(v, "zip", isString)
  ) return v;
  return null;
});

const nestedMetadataParser = createTypeGuard<Metadata>((v, { has }) => {
  if (
    isObject(v) &&
    has(v, "source", isString) &&
    has(v, "version", isNumber) &&
    has(v, "referral", isString)
  ) return v;
  return null;
});

const nestedParser = createTypeGuard<Nested>((v, { has }) => {
  if (
    isObject(v) &&
    has(v, "user", nestedUserParser) &&
    has(v, "address", nestedAddressParser) &&
    has(v, "tags", isArray.of(isString)) &&
    has(v, "metadata", nestedMetadataParser)
  ) return v;
  return null;
});

type Push = { enabled: boolean; provider: string; retries: number };
type Notifications = { email: boolean; sms: boolean; push: Push };
type Features = { dashboard: boolean; analytics: boolean; notifications: Notifications };
type Config = { theme: string; version: number; features: Features };
type Contact = { name: string; email: string; phone: string };
type Contacts = { primary: Contact; billing: Contact };
type Deep = {
  id: number;
  name: string;
  active: boolean;
  config: Config;
  tags: string[];
  contacts: Contacts;
};

const deepPushParser = createTypeGuard<Push>((v, { has }) => {
  if (
    isObject(v) &&
    has(v, "enabled", isBoolean) &&
    has(v, "provider", isString) &&
    has(v, "retries", isNumber)
  ) return v;
  return null;
});

const deepNotificationsParser = createTypeGuard<Notifications>((v, { has }) => {
  if (
    isObject(v) &&
    has(v, "email", isBoolean) &&
    has(v, "sms", isBoolean) &&
    has(v, "push", deepPushParser)
  ) return v;
  return null;
});

const deepFeaturesParser = createTypeGuard<Features>((v, { has }) => {
  if (
    isObject(v) &&
    has(v, "dashboard", isBoolean) &&
    has(v, "analytics", isBoolean) &&
    has(v, "notifications", deepNotificationsParser)
  ) return v;
  return null;
});

const deepConfigParser = createTypeGuard<Config>((v, { has }) => {
  if (
    isObject(v) &&
    has(v, "theme", isString) &&
    has(v, "version", isNumber) &&
    has(v, "features", deepFeaturesParser)
  ) return v;
  return null;
});

const deepContactParser = createTypeGuard<Contact>((v, { has }) => {
  if (
    isObject(v) &&
    has(v, "name", isString) &&
    has(v, "email", isString) &&
    has(v, "phone", isString)
  ) return v;
  return null;
});

const deepContactsParser = createTypeGuard<Contacts>((v, { has }) => {
  if (
    isObject(v) &&
    has(v, "primary", deepContactParser) &&
    has(v, "billing", deepContactParser)
  ) return v;
  return null;
});

const deepParser = createTypeGuard<Deep>((v, { has }) => {
  if (
    isObject(v) &&
    has(v, "id", isNumber) &&
    has(v, "name", isString) &&
    has(v, "active", isBoolean) &&
    has(v, "config", deepConfigParser) &&
    has(v, "tags", isArray.of(isString)) &&
    has(v, "contacts", deepContactsParser)
  ) return v;
  return null;
});

// ---------------------------------------------------------------------------
// Shape guards
// ---------------------------------------------------------------------------

const flatShape = createTypeGuard({
  name: isString,
  age: isNumber,
  active: isBoolean,
  score: isNumber,
  email: isString,
});

const nestedShape = createTypeGuard({
  user: {
    name: isString,
    email: isString,
    age: isNumber,
    active: isBoolean,
  },
  address: {
    street: isString,
    city: isString,
    state: isString,
    zip: isString,
  },
  tags: isArray.of(isString),
  metadata: {
    source: isString,
    version: isNumber,
    referral: isString,
  },
});

const deepShape = createTypeGuard({
  id: isNumber,
  name: isString,
  active: isBoolean,
  config: {
    theme: isString,
    version: isNumber,
    features: {
      dashboard: isBoolean,
      analytics: isBoolean,
      notifications: {
        email: isBoolean,
        sms: isBoolean,
        push: {
          enabled: isBoolean,
          provider: isString,
          retries: isNumber,
        },
      },
    },
  },
  tags: isArray.of(isString),
  contacts: {
    primary: {
      name: isString,
      email: isString,
      phone: isString,
    },
    billing: {
      name: isString,
      email: isString,
      phone: isString,
    },
  },
});

// ---------------------------------------------------------------------------
// Flat — fast-fail (boolean)
// ---------------------------------------------------------------------------

Deno.bench({ name: "flat | parser  | valid   | fast-fail", group: "flat-valid",   fn() { flatParser(FLAT_VALID); } });
Deno.bench({ name: "flat | shape   | valid   | fast-fail", group: "flat-valid",   fn() { flatShape(FLAT_VALID); } });
Deno.bench({ name: "flat | parser  | invalid | fast-fail", group: "flat-invalid", fn() { flatParser(FLAT_INVALID); } });
Deno.bench({ name: "flat | shape   | invalid | fast-fail", group: "flat-invalid", fn() { flatShape(FLAT_INVALID); } });

// ---------------------------------------------------------------------------
// Flat — validate (StandardSchema result)
// ---------------------------------------------------------------------------

Deno.bench({ name: "flat | parser  | valid   | validate",  group: "flat-valid-v",   fn() { flatParser.validate(FLAT_VALID); } });
Deno.bench({ name: "flat | shape   | valid   | validate",  group: "flat-valid-v",   fn() { flatShape.validate(FLAT_VALID); } });
Deno.bench({ name: "flat | parser  | invalid | validate",  group: "flat-invalid-v", fn() { flatParser.validate(FLAT_INVALID); } });
Deno.bench({ name: "flat | shape   | invalid | validate",  group: "flat-invalid-v", fn() { flatShape.validate(FLAT_INVALID); } });

// ---------------------------------------------------------------------------
// Nested — fast-fail (boolean)
// ---------------------------------------------------------------------------

Deno.bench({ name: "nested | parser  | valid   | fast-fail", group: "nested-valid",   fn() { nestedParser(NESTED_VALID); } });
Deno.bench({ name: "nested | shape   | valid   | fast-fail", group: "nested-valid",   fn() { nestedShape(NESTED_VALID); } });
Deno.bench({ name: "nested | parser  | invalid | fast-fail", group: "nested-invalid", fn() { nestedParser(NESTED_INVALID); } });
Deno.bench({ name: "nested | shape   | invalid | fast-fail", group: "nested-invalid", fn() { nestedShape(NESTED_INVALID); } });

// ---------------------------------------------------------------------------
// Nested — validate (StandardSchema result)
// ---------------------------------------------------------------------------

Deno.bench({ name: "nested | parser  | valid   | validate",  group: "nested-valid-v",   fn() { nestedParser.validate(NESTED_VALID); } });
Deno.bench({ name: "nested | shape   | valid   | validate",  group: "nested-valid-v",   fn() { nestedShape.validate(NESTED_VALID); } });
Deno.bench({ name: "nested | parser  | invalid | validate",  group: "nested-invalid-v", fn() { nestedParser.validate(NESTED_INVALID); } });
Deno.bench({ name: "nested | shape   | invalid | validate",  group: "nested-invalid-v", fn() { nestedShape.validate(NESTED_INVALID); } });

// ---------------------------------------------------------------------------
// Deep — fast-fail (boolean)
// ---------------------------------------------------------------------------

Deno.bench({ name: "deep | parser  | valid   | fast-fail", group: "deep-valid",   fn() { deepParser(DEEP_VALID); } });
Deno.bench({ name: "deep | shape   | valid   | fast-fail", group: "deep-valid",   fn() { deepShape(DEEP_VALID); } });
Deno.bench({ name: "deep | parser  | invalid | fast-fail", group: "deep-invalid", fn() { deepParser(DEEP_INVALID); } });
Deno.bench({ name: "deep | shape   | invalid | fast-fail", group: "deep-invalid", fn() { deepShape(DEEP_INVALID); } });

// ---------------------------------------------------------------------------
// Deep — validate (StandardSchema result)
// ---------------------------------------------------------------------------

Deno.bench({ name: "deep | parser  | valid   | validate",  group: "deep-valid-v",   fn() { deepParser.validate(DEEP_VALID); } });
Deno.bench({ name: "deep | shape   | valid   | validate",  group: "deep-valid-v",   fn() { deepShape.validate(DEEP_VALID); } });
Deno.bench({ name: "deep | parser  | invalid | validate",  group: "deep-invalid-v", fn() { deepParser.validate(DEEP_INVALID); } });
Deno.bench({ name: "deep | shape   | invalid | validate",  group: "deep-invalid-v", fn() { deepShape.validate(DEEP_INVALID); } });

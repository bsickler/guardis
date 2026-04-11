// Realistic nested API request payload
export const VALID_API_REQUEST = {
  user: {
    name: "Alice Johnson",
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
  tags: ["admin", "verified", "premium"],
  metadata: {
    source: "web",
    version: 2,
    referral: "campaign-123",
  },
};

export const INVALID_API_REQUEST = {
  user: {
    name: 42,
    email: true,
    age: "old",
    active: "yes",
  },
  address: {
    street: 100,
    city: null,
    state: 5,
    zip: false,
  },
  tags: "not-an-array",
  metadata: {
    source: 999,
    version: "two",
    referral: null,
  },
};

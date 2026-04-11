// Flat DTO shape: { name: string, age: number, active: boolean, score: number, email?: string }
export const VALID_USER = {
  name: "Alice",
  age: 30,
  active: true,
  score: 95.5,
  email: "alice@example.com",
};

export const VALID_USER_MINIMAL = {
  name: "Bob",
  age: 25,
  active: false,
  score: 80.0,
};

export const INVALID_USER = {
  name: 123,
  age: "thirty",
  active: "yes",
  score: null,
  email: 42,
};

import { assert, assertFalse } from "@std/assert";
import { isEmail, isInternationalPhone } from "./strings.ts";

Deno.test("isEmail: returns true for valid emails", () => {
  assert(isEmail("test@example.com"));
  assert(isEmail("user.name+tag+sorting@example.com"));
  assert(isEmail("user_name@example.co.uk"));
  assert(isEmail("user-name@sub.domain.com"));
});

Deno.test("isEmail: returns false for invalid emails", () => {
  assertFalse(isEmail("plainaddress"));
  assertFalse(isEmail("@missingusername.com"));
  assertFalse(isEmail("username@.com"));
  assertFalse(isEmail("username@com"));
  assertFalse(isEmail("username@domain..com"));
  assertFalse(isEmail(123));
  assertFalse(isEmail(null));
  assertFalse(isEmail(undefined));
});

Deno.test("isInternationalPhone: returns true for valid international phone numbers", () => {
  // North America
  assert(isInternationalPhone("+12345678901"));
  assert(isInternationalPhone("+12 345 678 9012"));
  assert(isInternationalPhone("+1 234 567 8901"));
  
  // Europe
  assert(isInternationalPhone("+49 151 12345678")); // Germany
  assert(isInternationalPhone("+44 20 7946 0958")); // UK
  assert(isInternationalPhone("+33 6 12 34 56 78")); // France
  assert(isInternationalPhone("+39 312 345 6789")); // Italy
  assert(isInternationalPhone("+34 612 345 678")); // Spain
  assert(isInternationalPhone("+46 70 123 45 67")); // Sweden
  
  // Asia
  assert(isInternationalPhone("+81 90 1234 5678")); // Japan
  assert(isInternationalPhone("+86 138 0013 8000")); // China
  assert(isInternationalPhone("+91 98765 43210")); // India
  assert(isInternationalPhone("+82 10 1234 5678")); // South Korea
  assert(isInternationalPhone("+65 9123 4567")); // Singapore
  
  // Other regions
  assert(isInternationalPhone("+61 412 345 678")); // Australia
  assert(isInternationalPhone("+55 11 98765 4321")); // Brazil
  assert(isInternationalPhone("+27 82 123 4567")); // South Africa
  assert(isInternationalPhone("+7 916 123 45 67")); // Russia
  
  // Different formatting styles
  assert(isInternationalPhone("+123456789012345")); // No spaces
  assert(isInternationalPhone("+1234567890")); // Minimum length
  assert(isInternationalPhone("+12 3456 7890 1234")); // Multiple space groups
});

Deno.test("isInternationalPhone: returns false for invalid international phone numbers", () => {
  // Missing + prefix
  assertFalse(isInternationalPhone("12345678901"));
  assertFalse(isInternationalPhone("44 20 7946 0958"));
  
  // Invalid formatting with special characters
  assertFalse(isInternationalPhone("+1 (234) 567-8901"));
  assertFalse(isInternationalPhone("+1-234-567-8901"));
  assertFalse(isInternationalPhone("+1.234.567.8901"));
  assertFalse(isInternationalPhone("+1/234/567/8901"));
  
  // Too short
  assertFalse(isInternationalPhone("+123"));
  assertFalse(isInternationalPhone("+12 34 56"));
  assertFalse(isInternationalPhone("+1"));
  assertFalse(isInternationalPhone("+"));
  
  // Too long
  assertFalse(isInternationalPhone("+1234567890123456")); // 16 digits
  assertFalse(isInternationalPhone("+12345678901234567890")); // 20 digits
  
  // Invalid characters
  assertFalse(isInternationalPhone("not a phone"));
  assertFalse(isInternationalPhone("+123abc4567"));
  assertFalse(isInternationalPhone("+123 456 78@90"));
  assertFalse(isInternationalPhone("+123 456 78#90"));
  
  // Leading/trailing spaces
  assertFalse(isInternationalPhone(" +12345678901"));
  assertFalse(isInternationalPhone("+12345678901 "));
  assertFalse(isInternationalPhone(" +12345678901 "));
  
  // Double spaces
  assertFalse(isInternationalPhone("+12  345 678 901"));
  assertFalse(isInternationalPhone("+12 345  678 901"));
  
  // Non-string types
  assertFalse(isInternationalPhone(null));
  assertFalse(isInternationalPhone(undefined));
  assertFalse(isInternationalPhone(123456789));
  assertFalse(isInternationalPhone({}));
  assertFalse(isInternationalPhone([]));
  assertFalse(isInternationalPhone(true));
});

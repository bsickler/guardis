import { assert, assertFalse } from "@std/assert";
import { isCommaDelimited, isEmail, isInternationalPhone, isUUIDv4 } from "./strings.ts";

Deno.test("isEmail", async (t) => {
  await t.step("returns true for valid emails", () => {
    assert(isEmail("test@example.com"));
    assert(isEmail("user.name+tag+sorting@example.com"));
    assert(isEmail("user_name@example.co.uk"));
    assert(isEmail("user-name@sub.domain.com"));
  });

  await t.step("returns false for invalid emails", () => {
    assertFalse(isEmail("plainaddress"));
    assertFalse(isEmail("@missingusername.com"));
    assertFalse(isEmail("username@.com"));
    assertFalse(isEmail("username@com"));
    assertFalse(isEmail("username@domain..com"));
    assertFalse(isEmail(123));
    assertFalse(isEmail(null));
    assertFalse(isEmail(undefined));
  });
});

Deno.test("isInternationalPhone", async (t) => {
  await t.step("returns true for valid international phone numbers", () => {
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

  await t.step("returns false for invalid international phone numbers", () => {
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
});

Deno.test("isUUIDv4", async (t) => {
  await t.step("returns true for valid UUID v4 strings", () => {
    assert(isUUIDv4("550e8400-e29b-41d4-a716-446655440000"));
    assert(isUUIDv4("6ba7b810-9dad-41d1-80b4-00c04fd430c8"));
    assert(isUUIDv4("7c9e6679-7425-40de-944b-e07fc1f90ae7"));
    assert(isUUIDv4("a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6"));
    // Case insensitive
    assert(isUUIDv4("550E8400-E29B-41D4-A716-446655440000"));
    assert(isUUIDv4("6BA7B810-9DAD-41D1-80B4-00C04FD430C8"));
  });

  await t.step("returns false for invalid UUID v4 strings", () => {
    // Not a UUID v4 (wrong version digit)
    assertFalse(isUUIDv4("550e8400-e29b-31d4-a716-446655440000")); // version 3
    assertFalse(isUUIDv4("550e8400-e29b-51d4-a716-446655440000")); // version 5

    // Wrong variant digit
    assertFalse(isUUIDv4("550e8400-e29b-41d4-c716-446655440000")); // should be 8, 9, a, or b
    assertFalse(isUUIDv4("550e8400-e29b-41d4-0716-446655440000")); // should be 8, 9, a, or b

    // Wrong format
    assertFalse(isUUIDv4("550e8400e29b41d4a716446655440000")); // missing hyphens
    assertFalse(isUUIDv4("550e8400-e29b-41d4-a716-44665544000")); // too short
    assertFalse(isUUIDv4("550e8400-e29b-41d4-a716-4466554400000")); // too long
    assertFalse(isUUIDv4("550e8400-e29b-41d4-a716")); // incomplete

    // Invalid characters
    assertFalse(isUUIDv4("550e8400-e29b-41d4-a716-446655440zzz"));
    assertFalse(isUUIDv4("550e8400-e29b-41d4-a716-44665544000g"));

    // Non-string types
    assertFalse(isUUIDv4(null));
    assertFalse(isUUIDv4(undefined));
    assertFalse(isUUIDv4(123));
    assertFalse(isUUIDv4({}));
    assertFalse(isUUIDv4([]));
    assertFalse(isUUIDv4(true));

    // Empty or malformed
    assertFalse(isUUIDv4(""));
    assertFalse(isUUIDv4("not a uuid"));
  });
});

Deno.test("isCommaDelimited", async (t) => {
  await t.step("returns true for valid comma-delimited strings", () => {
    // Simple unquoted values
    assert(isCommaDelimited("value1"));
    assert(isCommaDelimited("value1,value2"));
    assert(isCommaDelimited("value1,value2,value3"));

    // Numerical values
    assert(isCommaDelimited("123,456,789"));
    assert(isCommaDelimited("1.23,4.56,7.89"));

    // Quoted values
    assert(isCommaDelimited('"value1"'));
    assert(isCommaDelimited('"value1","value2"'));
    assert(isCommaDelimited('"value1","value2","value3"'));

    // Quoted values with commas inside
    assert(isCommaDelimited('"value1,with,commas"'));
    assert(isCommaDelimited('"value1,with,commas","value2"'));

    // Mixed quoted and unquoted
    assert(isCommaDelimited('"value1",value2'));
    assert(isCommaDelimited('value1,"value2"'));
    assert(isCommaDelimited('"value1",value2,"value3"'));

    // Escaped characters within quotes
    assert(isCommaDelimited('"value\\"with\\"quotes"'));
    assert(isCommaDelimited('"value\\\\with\\\\backslash"'));

    // Empty string (matches the regex as it's technically a valid component)
    assert(isCommaDelimited(""));

    // Single values with various characters
    assert(isCommaDelimited("abc123"));
    assert(isCommaDelimited("hello-world"));
    assert(isCommaDelimited("test_value"));
    assert(isCommaDelimited("value.with.dots"));
  });

  await t.step("returns false for invalid inputs", () => {
    // Non-string types
    assertFalse(isCommaDelimited(null));
    assertFalse(isCommaDelimited(undefined));
    assertFalse(isCommaDelimited(123));
    assertFalse(isCommaDelimited({}));
    assertFalse(isCommaDelimited([]));
    assertFalse(isCommaDelimited(true));
  });
});

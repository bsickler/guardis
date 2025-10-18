import { assert, assertFalse } from "@std/assert";
import {
  isCommaDelimited,
  isCommaDelimitedIntegers,
  isCommaDelimitedNumbers,
  isEmail,
  isInternationalPhone,
  isPeriodDelimited,
  isUUIDv4,
} from "./strings.ts";

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

Deno.test("isPeriodDelimited", async (t) => {
  await t.step("returns true for valid period-delimited strings", () => {
    // Simple unquoted values
    assert(isPeriodDelimited("value1"));
    assert(isPeriodDelimited("value1.value2"));
    assert(isPeriodDelimited("value1.value2.value3"));

    // Numerical values
    assert(isPeriodDelimited("123.456.789"));
    assert(isPeriodDelimited("1-23.4-56.7-89"));

    // Quoted values
    assert(isPeriodDelimited('"value1"'));
    assert(isPeriodDelimited('"value1"."value2"'));
    assert(isPeriodDelimited('"value1"."value2"."value3"'));

    // Quoted values with periods inside
    assert(isPeriodDelimited('"value1.with.periods"'));
    assert(isPeriodDelimited('"value1.with.periods"."value2"'));

    // Mixed quoted and unquoted
    assert(isPeriodDelimited('"value1".value2'));
    assert(isPeriodDelimited('value1."value2"'));
    assert(isPeriodDelimited('"value1".value2."value3"'));

    // Escaped characters within quotes
    assert(isPeriodDelimited('"value\\"with\\"quotes"'));
    assert(isPeriodDelimited('"value\\\\with\\\\backslash"'));

    // Empty string (matches the regex as it's technically a valid component)
    assert(isPeriodDelimited(""));

    // Single values with various characters
    assert(isPeriodDelimited("abc123"));
    assert(isPeriodDelimited("hello-world"));
    assert(isPeriodDelimited("test_value"));
    assert(isPeriodDelimited("value,with,commas"));
  });

  await t.step("returns false for invalid inputs", () => {
    // Non-string types
    assertFalse(isPeriodDelimited(null));
    assertFalse(isPeriodDelimited(undefined));
    assertFalse(isPeriodDelimited(123));
    assertFalse(isPeriodDelimited({}));
    assertFalse(isPeriodDelimited([]));
    assertFalse(isPeriodDelimited(true));
  });
});

Deno.test("isCommaDelimitedIntegers", async (t) => {
  await t.step("returns true for valid comma-delimited integer strings", () => {
    // Single integers
    assert(isCommaDelimitedIntegers("1"));
    assert(isCommaDelimitedIntegers("123"));
    assert(isCommaDelimitedIntegers("-456"));
    assert(isCommaDelimitedIntegers("0"));

    // Multiple comma-separated integers (no whitespace)
    assert(isCommaDelimitedIntegers("1,2,3"));
    assert(isCommaDelimitedIntegers("123,456,789"));
    assert(isCommaDelimitedIntegers("10,20,30,40,50"));

    // Negative integers
    assert(isCommaDelimitedIntegers("-1,2,-3"));
    assert(isCommaDelimitedIntegers("-123,-456,-789"));
    assert(isCommaDelimitedIntegers("-1,-2,-3,-4"));

    // Mixed positive and negative
    assert(isCommaDelimitedIntegers("1,-2,3,-4,5"));
    assert(isCommaDelimitedIntegers("-100,200,-300"));

    // Large integers
    assert(isCommaDelimitedIntegers("1000000,2000000,3000000"));
    assert(isCommaDelimitedIntegers("-999999999,0,999999999"));
  });

  await t.step("returns false for invalid inputs", () => {
    // Empty string
    assertFalse(isCommaDelimitedIntegers(""));

    // Empty values between commas
    assertFalse(isCommaDelimitedIntegers("1,,3"));
    assertFalse(isCommaDelimitedIntegers(",1,2"));
    assertFalse(isCommaDelimitedIntegers("1,2,"));

    // Any whitespace (not allowed)
    assertFalse(isCommaDelimitedIntegers("1, 2, 3"));
    assertFalse(isCommaDelimitedIntegers("1,2, 3"));
    assertFalse(isCommaDelimitedIntegers("1, 2,3"));
    assertFalse(isCommaDelimitedIntegers("1,  2,  3")); // Multiple spaces
    assertFalse(isCommaDelimitedIntegers("1,\t2,\t3")); // Tabs
    assertFalse(isCommaDelimitedIntegers("1 2,3")); // Whitespace between digits
    assertFalse(isCommaDelimitedIntegers("12 3,456"));
    assertFalse(isCommaDelimitedIntegers(" 1,2,3")); // Leading whitespace
    assertFalse(isCommaDelimitedIntegers("1,2,3 ")); // Trailing whitespace
    assertFalse(isCommaDelimitedIntegers(" 1,2,3 "));

    // Decimal numbers
    assertFalse(isCommaDelimitedIntegers("1.5,2"));
    assertFalse(isCommaDelimitedIntegers("1,2.5,3"));
    assertFalse(isCommaDelimitedIntegers("1.0,2.0"));

    // Non-numeric characters
    assertFalse(isCommaDelimitedIntegers("1,a,3"));
    assertFalse(isCommaDelimitedIntegers("abc,def"));
    assertFalse(isCommaDelimitedIntegers("1,2,three"));

    // Just commas
    assertFalse(isCommaDelimitedIntegers(","));
    assertFalse(isCommaDelimitedIntegers(",,"));
    assertFalse(isCommaDelimitedIntegers("1, ,3"));

    // Non-string types
    assertFalse(isCommaDelimitedIntegers(null));
    assertFalse(isCommaDelimitedIntegers(undefined));
    assertFalse(isCommaDelimitedIntegers(123));
    assertFalse(isCommaDelimitedIntegers({}));
    assertFalse(isCommaDelimitedIntegers([]));
    assertFalse(isCommaDelimitedIntegers(true));
  });
});

Deno.test("isCommaDelimitedNumbers", async (t) => {
  await t.step("returns true for valid comma-delimited number strings", () => {
    // Single numbers
    assert(isCommaDelimitedNumbers("1"));
    assert(isCommaDelimitedNumbers("123"));
    assert(isCommaDelimitedNumbers("-456"));
    assert(isCommaDelimitedNumbers("0"));

    // Decimal numbers
    assert(isCommaDelimitedNumbers("1.5"));
    assert(isCommaDelimitedNumbers("3.14"));
    assert(isCommaDelimitedNumbers("-2.718"));
    assert(isCommaDelimitedNumbers("0.5"));

    // Multiple comma-separated numbers (integers)
    assert(isCommaDelimitedNumbers("1,2,3"));
    assert(isCommaDelimitedNumbers("123,456,789"));
    assert(isCommaDelimitedNumbers("10,20,30,40,50"));

    // Multiple comma-separated decimals
    assert(isCommaDelimitedNumbers("1.5,2.5,3.5"));
    assert(isCommaDelimitedNumbers("3.14,2.718,1.414"));
    assert(isCommaDelimitedNumbers("0.1,0.2,0.3"));

    // Mixed integers and decimals
    assert(isCommaDelimitedNumbers("1,2.5,3"));
    assert(isCommaDelimitedNumbers("-1.5,2,3.14"));
    assert(isCommaDelimitedNumbers("100,99.99,50.5,-25"));

    // Percentages
    assert(isCommaDelimitedNumbers("50%"));
    assert(isCommaDelimitedNumbers("100%"));
    assert(isCommaDelimitedNumbers("12.5%"));
    assert(isCommaDelimitedNumbers("50%,75%,100%"));
    assert(isCommaDelimitedNumbers("10%,20%,30%"));

    // Mixed numbers with percentages
    assert(isCommaDelimitedNumbers("1,50%,3"));
    assert(isCommaDelimitedNumbers("1.5%,2,3%"));
    assert(isCommaDelimitedNumbers("100%,50,25.5%"));

    // Negative numbers
    assert(isCommaDelimitedNumbers("-1,2,-3"));
    assert(isCommaDelimitedNumbers("-1.5,-2.5,-3.5"));
    assert(isCommaDelimitedNumbers("-100,200,-300.5"));

    // Large numbers
    assert(isCommaDelimitedNumbers("1000000,2000000,3000000"));
    assert(isCommaDelimitedNumbers("999999.99,0.01,123456.789"));
  });

  await t.step("returns false for invalid inputs", () => {
    // Empty string
    assertFalse(isCommaDelimitedNumbers(""));

    // Empty values between commas
    assertFalse(isCommaDelimitedNumbers("1,,3"));
    assertFalse(isCommaDelimitedNumbers(",1,2"));
    assertFalse(isCommaDelimitedNumbers("1,2,"));

    // Any whitespace (not allowed)
    assertFalse(isCommaDelimitedNumbers("1, 2, 3"));
    assertFalse(isCommaDelimitedNumbers("1.5, 2.5, 3.5"));
    assertFalse(isCommaDelimitedNumbers("1,2, 3"));
    assertFalse(isCommaDelimitedNumbers("1, 2,3"));
    assertFalse(isCommaDelimitedNumbers("1,  2,  3")); // Multiple spaces
    assertFalse(isCommaDelimitedNumbers("1,\t2,\t3")); // Tabs
    assertFalse(isCommaDelimitedNumbers("1 2,3")); // Whitespace between digits
    assertFalse(isCommaDelimitedNumbers("1.5 ,2"));
    assertFalse(isCommaDelimitedNumbers(" 1,2,3")); // Leading whitespace
    assertFalse(isCommaDelimitedNumbers("1,2,3 ")); // Trailing whitespace
    assertFalse(isCommaDelimitedNumbers(" 1.5,2,3 "));

    // Invalid decimal formats
    assertFalse(isCommaDelimitedNumbers("1..5,2")); // Double decimal
    assertFalse(isCommaDelimitedNumbers("1.5.5,2")); // Multiple decimals
    assertFalse(isCommaDelimitedNumbers(".5,2")); // Leading decimal without digit
    assertFalse(isCommaDelimitedNumbers("1.,2")); // Trailing decimal without digit

    // Multiple percentage signs
    assertFalse(isCommaDelimitedNumbers("50%%,100"));
    assertFalse(isCommaDelimitedNumbers("50%50,100"));

    // Non-numeric characters
    assertFalse(isCommaDelimitedNumbers("1,a,3"));
    assertFalse(isCommaDelimitedNumbers("abc,def"));
    assertFalse(isCommaDelimitedNumbers("1,2,three"));
    assertFalse(isCommaDelimitedNumbers("1.5px,2"));

    // Just commas
    assertFalse(isCommaDelimitedNumbers(","));
    assertFalse(isCommaDelimitedNumbers(",,"));
    assertFalse(isCommaDelimitedNumbers("1, ,3"));

    // Non-string types
    assertFalse(isCommaDelimitedNumbers(null));
    assertFalse(isCommaDelimitedNumbers(undefined));
    assertFalse(isCommaDelimitedNumbers(123));
    assertFalse(isCommaDelimitedNumbers({}));
    assertFalse(isCommaDelimitedNumbers([]));
    assertFalse(isCommaDelimitedNumbers(true));
  });
});

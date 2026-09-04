import { assert, assertEquals } from "@std/assert";
import { companies } from "./company.ts";
import { cities } from "./location/cities.ts";
import { countries } from "./location/countries.ts";
import { domainWords } from "./internet/domain-words.ts";
import { tlds } from "./internet/tlds.ts";
import { names } from "./people/names.ts";
import { dictionaries } from "./index.ts";

Deno.test("built-in flat pools are non-empty", () => {
  for (const dictionary of [cities, domainWords, tlds]) {
    assert(dictionary.size > 0);
  }
});

Deno.test("every built-in dictionary satisfies Dictionary<T> -- has a pick()", () => {
  for (const dictionary of [names, cities, countries, domainWords, tlds]) {
    assertEquals(typeof dictionary.pick, "function");
  }
});

Deno.test("companies has name/jobTitle Dictionary<string>s instead of an ambiguous pick()", () => {
  assertEquals(typeof companies.name.pick, "function");
  assertEquals(typeof companies.jobTitle.pick, "function");
});

Deno.test("dictionaries namespace nests the built-in pools under the expected keys", () => {
  assert(dictionaries.people.names === names);
  assert(dictionaries.company.companies === companies);
  assert(dictionaries.location.cities === cities);
  assert(dictionaries.location.countries === countries);
  assert(dictionaries.internet.domainWords === domainWords);
  assert(dictionaries.internet.tlds === tlds);
});

Deno.test("Names", async (t) => {
  await t.step("pick() composes 'First Last' or 'First Middle Last'", () => {
    for (let i = 0; i < 30; i++) {
      const full = names.pick();
      const partCount = full.split(" ").length;
      assert(
        partCount === 2 || partCount === 3,
        `expected "First Last" or "First Middle Last", got "${full}"`,
      );
    }
  });

  await t.step("pick() sometimes includes a middle name and sometimes doesn't", () => {
    const partCounts = new Set<number>();
    for (let i = 0; i < 200; i++) {
      partCounts.add(names.pick().split(" ").length);
    }
    assert(partCounts.has(2), "never saw a 2-part name across 200 picks");
    assert(partCounts.has(3), "never saw a 3-part name across 200 picks");
  });

  await t.step(
    "female/male/first/middle/last are independent, each just a Dictionary<string>",
    () => {
      for (let i = 0; i < 20; i++) {
        assert(typeof names.female.pick() === "string");
        assert(typeof names.male.pick() === "string");
        assert(typeof names.first.pick() === "string");
        assert(typeof names.middle.pick() === "string");
        assert(typeof names.last.pick() === "string");
      }
    },
  );
});

Deno.test("Companies", async (t) => {
  await t.step(
    "brand/llc/corporation/medicalPractice/lawFirm/investmentFirm/bank/restaurant are independent, each just a { name: Dictionary<string>, jobTitle: Dictionary<string> }",
    () => {
      for (let i = 0; i < 20; i++) {
        assert(typeof companies.brand.name.pick() === "string");
        assert(typeof companies.llc.name.pick() === "string");
        assert(typeof companies.corporation.name.pick() === "string");
        assert(typeof companies.medicalPractice.name.pick() === "string");
        assert(typeof companies.lawFirm.name.pick() === "string");
        assert(typeof companies.investmentFirm.name.pick() === "string");
        assert(typeof companies.bank.name.pick() === "string");
        assert(typeof companies.restaurant.name.pick() === "string");
      }
    },
  );

  await t.step("llc always ends in 'LLC'", () => {
    for (let i = 0; i < 20; i++) {
      assert(companies.llc.name.pick().endsWith("LLC"));
    }
  });

  await t.step(
    "medicalPractice draws its namesake from dictionaries.people.names, not a duplicated list",
    () => {
      const knownSurnames = new Set(Array.from({ length: 2000 }, () => names.last.pick()));
      for (let i = 0; i < 20; i++) {
        const [surname] = companies.medicalPractice.name.pick().split(" ");
        assert(
          knownSurnames.has(surname),
          `expected surname "${surname}" to come from dictionaries.people.names.last`,
        );
      }
    },
  );

  await t.step("lawFirm composes two surnames joined by '&'", () => {
    for (let i = 0; i < 20; i++) {
      assert(companies.lawFirm.name.pick().includes(" & "));
    }
  });

  await t.step(
    "investmentFirm sometimes composes one surname and sometimes two joined by '&'",
    () => {
      const partCounts = new Set<boolean>();
      for (let i = 0; i < 30; i++) {
        partCounts.add(companies.investmentFirm.name.pick().includes(" & "));
      }
      assert(partCounts.has(true), "never saw a two-surname investmentFirm result across 30 picks");
      assert(
        partCounts.has(false),
        "never saw a one-surname investmentFirm result across 30 picks",
      );
    },
  );

  await t.step("each company type has its own jobTitle pool, independent of its name draw", () => {
    const categories = [
      companies.brand,
      companies.llc,
      companies.corporation,
      companies.medicalPractice,
      companies.lawFirm,
      companies.investmentFirm,
      companies.bank,
      companies.restaurant,
    ];
    for (const category of categories) {
      const titles = new Set(Array.from({ length: 20 }, () => category.jobTitle.pick()));
      for (const title of titles) assert(typeof title === "string" && title.length > 0);
    }
  });

  await t.step("jobTitle pools differ by company type -- not one shared list", () => {
    const medicalTitles = new Set(
      Array.from({ length: 30 }, () => companies.medicalPractice.jobTitle.pick()),
    );
    const lawTitles = new Set(Array.from({ length: 30 }, () => companies.lawFirm.jobTitle.pick()));
    const overlap = [...medicalTitles].some((title) => lawTitles.has(title));
    assert(!overlap, "medicalPractice and lawFirm job titles should not overlap");
  });

  await t.step(
    "name.pick() mixes company-name types across calls, on purpose (mimics a varied real dataset)",
    () => {
      const knownRestaurants = new Set(
        Array.from({ length: 200 }, () => companies.restaurant.name.pick()),
      );
      const knownBanks = new Set(Array.from({ length: 200 }, () => companies.bank.name.pick()));

      const sawLlc = new Set<boolean>();
      const sawAmpersand = new Set<boolean>();
      const sawRestaurant = new Set<boolean>();
      const sawBank = new Set<boolean>();
      for (let i = 0; i < 500; i++) {
        const value = companies.name.pick();
        sawLlc.add(value.endsWith("LLC"));
        sawAmpersand.add(value.includes(" & "));
        sawRestaurant.add(knownRestaurants.has(value));
        sawBank.add(knownBanks.has(value));
      }
      assert(
        sawLlc.has(true) && sawLlc.has(false),
        "never saw a mix of LLC/non-LLC results across 500 picks",
      );
      assert(
        sawAmpersand.has(true) && sawAmpersand.has(false),
        "never saw a mix of &-joined/non-&-joined results across 500 picks",
      );
      assert(sawRestaurant.has(true), "never saw a restaurant name across 500 picks");
      assert(sawBank.has(true), "never saw a bank name across 500 picks");
    },
  );

  await t.step(
    "jobTitle.pick() mixes job titles across every business-entity type, independent of name.pick()",
    () => {
      const seen = new Set<string>();
      for (let i = 0; i < 300; i++) seen.add(companies.jobTitle.pick());
      const knownMedicalTitles = new Set(
        Array.from({ length: 30 }, () => companies.medicalPractice.jobTitle.pick()),
      );
      const knownRestaurantTitles = new Set(
        Array.from({ length: 30 }, () => companies.restaurant.jobTitle.pick()),
      );
      assert(
        [...seen].some((title) => knownMedicalTitles.has(title)),
        "never saw a medical-practice job title across 300 picks",
      );
      assert(
        [...seen].some((title) => knownRestaurantTitles.has(title)),
        "never saw a restaurant job title across 300 picks",
      );
    },
  );
});

Deno.test("Countries", async (t) => {
  await t.step("record.pick() returns a full, self-consistent record", () => {
    for (let i = 0; i < 20; i++) {
      const record = countries.record.pick();
      assert(record.name.length > 0, `bad name: "${record.name}"`);
      assert(
        record.standardizedName.length > 0,
        `bad standardizedName: "${record.standardizedName}"`,
      );
      assert(/^[A-Z]{2}$/.test(record.alpha2), `bad alpha2: "${record.alpha2}"`);
      assert(/^[A-Z]{3}$/.test(record.alpha3), `bad alpha3: "${record.alpha3}"`);
      assert(/^\d{3}$/.test(record.numeric), `bad numeric: "${record.numeric}"`);
    }
  });

  await t.step(
    "name/standardizedName/alpha2/alpha3/numeric each project one field off a freshly-picked record",
    () => {
      for (let i = 0; i < 20; i++) {
        assert(countries.name.pick().length > 0);
        assert(countries.standardizedName.pick().length > 0);
        assert(countries.alpha2.pick().length === 2);
        assert(countries.alpha3.pick().length === 3);
        assert(/^\d{3}$/.test(countries.numeric.pick()));
      }
    },
  );

  await t.step(
    "standardizedName differs from name for at least one country (a common name exists)",
    () => {
      const differing = Array.from({ length: 50 }, () => countries.record.pick())
        .some((record) => record.name !== record.standardizedName);
      assert(
        differing,
        "expected at least one sampled country with a common name distinct from its standardized name",
      );
    },
  );

  await t.step(
    "pick() mixes name/alpha2/alpha3 representations across calls, on purpose (mimics real user input)",
    () => {
      const lengths = new Set<number>();
      for (let i = 0; i < 100; i++) {
        lengths.add(countries.pick().length);
      }
      assert(lengths.has(2), "never saw an alpha-2-length result across 100 picks");
      assert(lengths.has(3), "never saw an alpha-3-length result across 100 picks");
      assert(
        [...lengths].some((length) => length > 3),
        "never saw a full-name-length result across 100 picks",
      );
    },
  );

  await t.step("pick() never returns a numeric code -- see the class doc for why", () => {
    for (let i = 0; i < 200; i++) {
      const value = countries.pick();
      assert(!/^\d+$/.test(value), `pick() returned a numeric-looking value: "${value}"`);
    }
  });

  await t.step("pick() never returns standardizedName -- see the class doc for why", () => {
    // Records where standardizedName differs from name -- the only ones
    // distinguishable from a legitimate `name` pick.
    const distinctStandardizedNames = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const record = countries.record.pick();
      if (record.standardizedName !== record.name) {
        distinctStandardizedNames.add(record.standardizedName);
      }
    }
    assert(
      distinctStandardizedNames.size > 0,
      "never sampled a country with a distinct standardizedName",
    );

    for (let i = 0; i < 500; i++) {
      const value = countries.pick();
      assert(
        !distinctStandardizedNames.has(value),
        `pick() returned a standardizedName-only value: "${value}"`,
      );
    }
  });

  await t.step("the full ISO 3166-1 list is loaded, not just a handful of countries", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(countries.name.pick());
    assert(
      seen.size > 50,
      `expected a large, varied country list, saw only ${seen.size} distinct names in 500 picks`,
    );
  });
});

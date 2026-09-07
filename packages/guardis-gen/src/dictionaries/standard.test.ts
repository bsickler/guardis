import { assert } from "@std/assert";
import { Companies } from "./company.ts";
import { Cities } from "./location/cities.ts";
import { Countries } from "./location/countries.ts";
import { DomainWords } from "./internet/domain-words.ts";
import { Tlds } from "./internet/tlds.ts";
import { Names } from "./people/names.ts";
import { Dictionaries } from "./index.ts";

Deno.test("Dictionaries namespace nests the built-in pools under the expected keys", () => {
  assert(Dictionaries.People.Names === Names);
  assert(Dictionaries.Companies === Companies);
  assert(Dictionaries.Location.Cities === Cities);
  assert(Dictionaries.Location.Countries === Countries);
  assert(Dictionaries.Internet.DomainWords === DomainWords);
  assert(Dictionaries.Internet.Tlds === Tlds);
});

Deno.test("Names", async (t) => {
  await t.step("pick() composes 'First Last' or 'First Middle Last'", () => {
    for (let i = 0; i < 30; i++) {
      const full = Names.pick();
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
      partCounts.add(Names.pick().split(" ").length);
    }
    assert(partCounts.has(2), "never saw a 2-part name across 200 picks");
    assert(partCounts.has(3), "never saw a 3-part name across 200 picks");
  });

  await t.step(
    "female/male/first/middle/last are independent, each just a Dictionary<string>",
    () => {
      for (let i = 0; i < 20; i++) {
        assert(typeof Names.Female.pick() === "string");
        assert(typeof Names.Male.pick() === "string");
        assert(typeof Names.First.pick() === "string");
        assert(typeof Names.Middle.pick() === "string");
        assert(typeof Names.Last.pick() === "string");
      }
    },
  );
});

Deno.test("Companies", async (t) => {
  await t.step(
    "Brand/Llc/Corporation/MedicalPractice/LawFirm/InvestmentFirm/Bank/Restaurant are independent, each just a { Name: Dictionary<string>, Title: Dictionary<string> }",
    () => {
      for (let i = 0; i < 20; i++) {
        assert(typeof Companies.Brand.Name.pick() === "string");
        assert(typeof Companies.Llc.Name.pick() === "string");
        assert(typeof Companies.Corporation.Name.pick() === "string");
        assert(typeof Companies.MedicalPractice.Name.pick() === "string");
        assert(typeof Companies.LawFirm.Name.pick() === "string");
        assert(typeof Companies.InvestmentFirm.Name.pick() === "string");
        assert(typeof Companies.Bank.Name.pick() === "string");
        assert(typeof Companies.Restaurant.Name.pick() === "string");
      }
    },
  );

  await t.step("Llc always ends in 'LLC'", () => {
    for (let i = 0; i < 20; i++) {
      assert(Companies.Llc.Name.pick().endsWith("LLC"));
    }
  });

  await t.step(
    "MedicalPractice draws its namesake from Dictionaries.People.Names, not a duplicated list",
    () => {
      const knownSurnames = new Set(Array.from({ length: 2000 }, () => Names.Last.pick()));
      for (let i = 0; i < 20; i++) {
        const [surname] = Companies.MedicalPractice.Name.pick().split(" ");
        assert(
          knownSurnames.has(surname),
          `expected surname "${surname}" to come from Dictionaries.People.Names.last`,
        );
      }
    },
  );

  await t.step("LawFirm composes two surnames joined by '&'", () => {
    for (let i = 0; i < 20; i++) {
      assert(Companies.LawFirm.Name.pick().includes(" & "));
    }
  });

  await t.step(
    "InvestmentFirm sometimes composes one surname and sometimes two joined by '&'",
    () => {
      const partCounts = new Set<boolean>();
      for (let i = 0; i < 30; i++) {
        partCounts.add(Companies.InvestmentFirm.Name.pick().includes(" & "));
      }
      assert(partCounts.has(true), "never saw a two-surname InvestmentFirm result across 30 picks");
      assert(
        partCounts.has(false),
        "never saw a one-surname InvestmentFirm result across 30 picks",
      );
    },
  );

  await t.step("each company type has its own Title pool, independent of its Name draw", () => {
    const categories = [
      Companies.Brand,
      Companies.Llc,
      Companies.Corporation,
      Companies.MedicalPractice,
      Companies.LawFirm,
      Companies.InvestmentFirm,
      Companies.Bank,
      Companies.Restaurant,
    ];
    for (const category of categories) {
      const titles = new Set(Array.from({ length: 20 }, () => category.Title.pick()));
      for (const title of titles) assert(typeof title === "string" && title.length > 0);
    }
  });

  await t.step("Title pools differ by company type -- not one shared list", () => {
    const medicalTitles = new Set(
      Array.from({ length: 30 }, () => Companies.MedicalPractice.Title.pick()),
    );
    const lawTitles = new Set(Array.from({ length: 30 }, () => Companies.LawFirm.Title.pick()));
    const overlap = [...medicalTitles].some((title) => lawTitles.has(title));
    assert(!overlap, "MedicalPractice and LawFirm job titles should not overlap");
  });

  await t.step(
    "Name.pick() mixes company-name types across calls, on purpose (mimics a varied real dataset)",
    () => {
      const knownRestaurants = new Set(
        Array.from({ length: 200 }, () => Companies.Restaurant.Name.pick()),
      );
      const knownBanks = new Set(Array.from({ length: 200 }, () => Companies.Bank.Name.pick()));

      const sawLlc = new Set<boolean>();
      const sawAmpersand = new Set<boolean>();
      const sawRestaurant = new Set<boolean>();
      const sawBank = new Set<boolean>();
      for (let i = 0; i < 500; i++) {
        const value = Companies.Name.pick();
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
    "Title.pick() mixes job titles across every business-entity type, independent of Name.pick()",
    () => {
      const seen = new Set<string>();
      for (let i = 0; i < 300; i++) seen.add(Companies.Title.pick());
      const knownMedicalTitles = new Set(
        Array.from({ length: 30 }, () => Companies.MedicalPractice.Title.pick()),
      );
      const knownRestaurantTitles = new Set(
        Array.from({ length: 30 }, () => Companies.Restaurant.Title.pick()),
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
      const record = Countries.Record.pick();
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
        assert(Countries.Name.pick().length > 0);
        assert(Countries.StandardizedName.pick().length > 0);
        assert(Countries.Alpha2.pick().length === 2);
        assert(Countries.Alpha3.pick().length === 3);
        assert(/^\d{3}$/.test(Countries.Numeric.pick()));
      }
    },
  );

  await t.step(
    "standardizedName differs from name for at least one country (a common name exists)",
    () => {
      const differing = Array.from({ length: 50 }, () => Countries.Record.pick())
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
        lengths.add(Countries.pick().length);
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
      const value = Countries.pick();
      assert(!/^\d+$/.test(value), `pick() returned a numeric-looking value: "${value}"`);
    }
  });

  await t.step("pick() never returns standardizedName -- see the class doc for why", () => {
    // Records where standardizedName differs from name -- the only ones
    // distinguishable from a legitimate `name` pick.
    const distinctStandardizedNames = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const record = Countries.Record.pick();
      if (record.standardizedName !== record.name) {
        distinctStandardizedNames.add(record.standardizedName);
      }
    }
    assert(
      distinctStandardizedNames.size > 0,
      "never sampled a country with a distinct standardizedName",
    );

    for (let i = 0; i < 500; i++) {
      const value = Countries.pick();
      assert(
        !distinctStandardizedNames.has(value),
        `pick() returned a standardizedName-only value: "${value}"`,
      );
    }
  });

  await t.step("the full ISO 3166-1 list is loaded, not just a handful of countries", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(Countries.Name.pick());
    assert(
      seen.size > 50,
      `expected a large, varied country list, saw only ${seen.size} distinct names in 500 picks`,
    );
  });
});

/**
 * dictionaries/company.ts - A curated starter set of company names across
 * eight business-entity conventions (`brand`, `llc`, `corporation`,
 * `medicalPractice`, `lawFirm`, `investmentFirm`, `bank`, `restaurant`),
 * since an LLC, a corporation, and a medical practice are named by
 * genuinely different real-world conventions. Each type is a
 * `{ name: Dictionary<string>, jobTitle: Dictionary<string> }` object
 * (`CompanyType`), built with `dictionaryOf()`; `jobTitle` is its own pool
 * rather than a field projected off `name`'s pick, since a company type
 * doesn't have just "one" job title.
 *
 * `brand`/`bank`/`restaurant` use well-known parody company names (e.g.
 * "Wayne Enterprises", "Krusty Burger"), since real businesses of those
 * kinds are usually known by name, not a naming pattern. `lawFirm`/
 * `investmentFirm`/`medicalPractice` are the opposite -- real ones follow a
 * pattern (one or two surnames plus a suffix, e.g. "Ramirez & Chen LLP") --
 * so they compose from `dictionaries.people.names`'s surnames instead of
 * duplicating a surname list here.
 * @module
 */
import { type Dictionary, dictionaryOf } from "../dictionary.ts";
import { pick, randomBoolean } from "../utilities/rng.ts";
import { names } from "./people/names.ts";

/** One business-entity type's name pool and job-title pool -- JSR's public-API check needs this
 * spelled out explicitly, since it can't infer a class field's type through a function call
 * (`dictionaryOf(...)`) the way a full TS checker can. */
type CompanyType = {
  readonly name: Dictionary<string>;
  readonly jobTitle: Dictionary<string>;
};

class Companies {
  readonly brand: CompanyType = {
    name: dictionaryOf(() => pick(pools.brand.names)),
    jobTitle: dictionaryOf(() => pick(pools.brand.jobTitles)),
  };

  readonly llc: CompanyType = {
    name: dictionaryOf(() => `${pick(pools.llc.roots)} LLC`),
    jobTitle: dictionaryOf(() => pick(pools.llc.jobTitles)),
  };

  readonly corporation: CompanyType = {
    name: dictionaryOf(() =>
      `${pick(pools.corporation.roots)} ${pick(pools.corporation.suffixes)}`
    ),
    jobTitle: dictionaryOf(() => pick(pools.corporation.jobTitles)),
  };

  readonly medicalPractice: CompanyType = {
    name: dictionaryOf(() => `${names.last.pick()} ${pick(pools.medicalPractice.suffixes)}`),
    jobTitle: dictionaryOf(() => pick(pools.medicalPractice.jobTitles)),
  };

  readonly lawFirm: CompanyType = {
    name: dictionaryOf(() =>
      `${names.last.pick()} & ${names.last.pick()} ${pick(pools.lawFirm.suffixes)}`
    ),
    jobTitle: dictionaryOf(() => pick(pools.lawFirm.jobTitles)),
  };

  readonly investmentFirm: CompanyType = {
    name: dictionaryOf(() =>
      randomBoolean(0.5)
        ? `${names.last.pick()} ${pick(pools.investmentFirm.suffixes)}`
        : `${names.last.pick()} & ${names.last.pick()} ${pick(pools.investmentFirm.suffixes)}`
    ),
    jobTitle: dictionaryOf(() => pick(pools.investmentFirm.jobTitles)),
  };

  readonly bank: CompanyType = {
    name: dictionaryOf(() => pick(pools.bank.names)),
    jobTitle: dictionaryOf(() => pick(pools.bank.jobTitles)),
  };

  readonly restaurant: CompanyType = {
    name: dictionaryOf(() => pick(pools.restaurant.names)),
    jobTitle: dictionaryOf(() => pick(pools.restaurant.jobTitles)),
  };

  /** A company name, mixing every business-entity type across calls, on purpose -- mimics a real, varied dataset of company names rather than one uniform shape. */
  readonly name: Dictionary<string> = dictionaryOf(() => pick(this.categories).name.pick());

  /** A job title, drawn from whichever business-entity type is picked -- independent of `name`'s own pick, the same way `medicalPractice.jobTitle` is independent of `medicalPractice.name`. */
  readonly jobTitle: Dictionary<string> = dictionaryOf(() => pick(this.categories).jobTitle.pick());

  private get categories() {
    return [
      this.brand,
      this.llc,
      this.corporation,
      this.medicalPractice,
      this.lawFirm,
      this.investmentFirm,
      this.bank,
      this.restaurant,
    ];
  }
}

const pools = {
  brand: {
    names: [
      "Acme",
      "Globex",
      "Initech",
      "Umbrella",
      "Hooli",
      "Stark Industries",
      "Wayne Enterprises",
      "Cyberdyne",
      "Soylent",
      "Wonka Industries",
      "Vandelay Industries",
      "Massive Dynamic",
      "Aperture Science",
      "Tyrell Corporation",
    ],
    jobTitles: [
      "Software Engineer",
      "Product Manager",
      "Research Scientist",
      "Chief Technology Officer",
      "VP of Engineering",
      "Data Analyst",
      "Systems Architect",
      "Operations Director",
    ],
  },
  llc: {
    roots: [
      "Ironwood Consulting",
      "Blue Harbor Ventures",
      "Summit Ridge Holdings",
      "Meridian Partners",
      "Cedar Grove Enterprises",
      "Silverline Solutions",
      "Redwood Capital",
      "Golden Gate Logistics",
      "Bright Path Ventures",
      "Northstar Holdings",
      "Fieldstone Advisors",
      "Harborview Property Management",
    ],
    jobTitles: [
      "Managing Partner",
      "Consultant",
      "Operations Manager",
      "Account Manager",
      "Business Analyst",
      "Office Manager",
    ],
  },
  corporation: {
    roots: [
      "Blackstone Industries",
      "Falcon Technologies",
      "Pinnacle Manufacturing",
      "Continental Resources",
      "Vanguard Systems",
      "Apex Holdings",
      "Titan Aerospace",
      "Meridian Health",
      "Horizon Energy",
      "Sterling Group",
    ],
    suffixes: ["Inc.", "Corp.", "Corporation", "Incorporated"],
    jobTitles: [
      "Chief Executive Officer",
      "Chief Financial Officer",
      "Plant Manager",
      "Supply Chain Manager",
      "Mechanical Engineer",
      "Quality Assurance Manager",
      "Regional Director",
    ],
  },
  medicalPractice: {
    suffixes: [
      "Family Medicine",
      "Medical Group",
      "Pediatrics",
      "Internal Medicine",
      "Urgent Care",
      "Dermatology",
      "Health Clinic",
      "Wellness Center",
      "Orthopedics",
      "Cardiology Associates",
    ],
    jobTitles: [
      "Physician",
      "Nurse Practitioner",
      "Registered Nurse",
      "Physician Assistant",
      "Medical Assistant",
      "Office Manager",
      "Receptionist",
    ],
  },
  lawFirm: {
    suffixes: ["LLP", "Law Group", "Attorneys at Law"],
    jobTitles: [
      "Partner",
      "Associate Attorney",
      "Paralegal",
      "Legal Assistant",
      "Of Counsel",
      "Law Clerk",
    ],
  },
  investmentFirm: {
    suffixes: [
      "Capital",
      "Capital Partners",
      "Partners",
      "Asset Management",
      "Investment Group",
      "Ventures",
      "Advisors",
      "Management",
    ],
    jobTitles: [
      "Portfolio Manager",
      "Financial Analyst",
      "Managing Director",
      "Investment Associate",
      "Chief Investment Officer",
      "Research Analyst",
    ],
  },
  bank: {
    names: [
      "Gringotts Wizarding Bank",
      "Bailey Building and Loan Association",
      "Bank of Springfield",
      "First Founders Bank & Trust",
      "Ironclad Federal Bank",
      "Sterling Ridge Trust",
      "Meridian National Bank",
      "Liberty Harbor Bank",
      "Cornerstone Federal Credit Union",
    ],
    jobTitles: [
      "Bank Teller",
      "Loan Officer",
      "Branch Manager",
      "Financial Advisor",
      "Personal Banker",
      "Vice President of Operations",
    ],
  },
  restaurant: {
    names: [
      "Krusty Burger",
      "Los Pollos Hermanos",
      "Big Kahuna Burger",
      "Monk's Café",
      "Central Perk",
      "Bluth's Original Frozen Banana Stand",
      "Chotchkie's",
      "Paunch Burger",
      "Jack Rabbit Slim's",
      "Arnold's Drive-In",
    ],
    jobTitles: [
      "Line Cook",
      "Server",
      "Sous Chef",
      "Restaurant Manager",
      "Host",
      "Executive Chef",
      "Bartender",
    ],
  },
} as const;

export const companies: Companies = new Companies();

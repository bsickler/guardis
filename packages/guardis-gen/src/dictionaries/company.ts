/**
 * dictionaries/company.ts - A curated starter set of company Names across
 * eight business-entity conventions (`Brand`, `Llc`, `Corporation`,
 * `MedicalPractice`, `LawFirm`, `InvestmentFirm`, `Bank`, `Restaurant`),
 * since an LLC, a corporation, and a medical practice are Named by
 * genuinely different real-world conventions. Each type is a
 * `{ Name: Dictionary<string>, Title: Dictionary<string> }` object
 * (`CompanyType`), built with `Dictionary.of()`/`Dictionary.from()`;
 * `Title` is its own pool rather than a field projected off `Name`'s
 * pick, since a company type doesn't have just "one" job title.
 *
 * `Brand`/`Bank`/`Restaurant` use well-known parody company Names (e.g.
 * "Wayne Enterprises", "Krusty Burger"), since real businesses of those
 * kinds are usually known by Name, not a naming pattern. `LawFirm`/
 * `InvestmentFirm`/`MedicalPractice` are the opposite -- real ones follow a
 * pattern (one or two surNames plus a suffix, e.g. "Ramirez & Chen LLP") --
 * so they compose from `Dictionaries.People.Names`'s surNames instead of
 * duplicating a surName list here.
 * @module
 */
import { Dictionary } from "../dictionary.ts";
import { pick, randomBoolean } from "../utilities/rng.ts";
import { Names } from "./people/names.ts";

/** One business-entity type's Name pool and job-title pool -- JSR's public-API check needs this
 * spelled out explicitly, since it can't infer a class field's type through a function call
 * (`Dictionary.of(...)`/`Dictionary.from(...)`) the way a full TS checker can. */
type CompanyType = {
  readonly Name: Dictionary<string>;
  readonly Title: Dictionary<string>;
};

const pools = {
  brand: {
    Names: [
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
    Titles: [
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
    Titles: [
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
    Titles: [
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
    Titles: [
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
    Titles: [
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
    Titles: [
      "Portfolio Manager",
      "Financial Analyst",
      "Managing Director",
      "Investment Associate",
      "Chief Investment Officer",
      "Research Analyst",
    ],
  },
  bank: {
    Names: [
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
    Titles: [
      "Bank Teller",
      "Loan Officer",
      "Branch Manager",
      "Financial Advisor",
      "Personal Banker",
      "Vice President of Operations",
    ],
  },
  restaurant: {
    Names: [
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
    Titles: [
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

export const Companies = new class {
  readonly Brand: CompanyType = {
    Name: Dictionary.of(pools.brand.Names),
    Title: Dictionary.of(pools.brand.Titles),
  };

  readonly Llc: CompanyType = {
    Name: Dictionary.from(() => `${pick(pools.llc.roots)} LLC`),
    Title: Dictionary.of(pools.llc.Titles),
  };

  readonly Corporation: CompanyType = {
    Name: Dictionary.from(() =>
      `${pick(pools.corporation.roots)} ${pick(pools.corporation.suffixes)}`
    ),
    Title: Dictionary.of(pools.corporation.Titles),
  };

  readonly MedicalPractice: CompanyType = {
    Name: Dictionary.from(() => `${Names.Last.pick()} ${pick(pools.medicalPractice.suffixes)}`),
    Title: Dictionary.of(pools.medicalPractice.Titles),
  };

  readonly LawFirm: CompanyType = {
    Name: Dictionary.from(() =>
      `${Names.Last.pick()} & ${Names.Last.pick()} ${pick(pools.lawFirm.suffixes)}`
    ),
    Title: Dictionary.of(pools.lawFirm.Titles),
  };

  readonly InvestmentFirm: CompanyType = {
    Name: Dictionary.from(() =>
      randomBoolean(0.5)
        ? `${Names.Last.pick()} ${pick(pools.investmentFirm.suffixes)}`
        : `${Names.Last.pick()} & ${Names.Last.pick()} ${pick(pools.investmentFirm.suffixes)}`
    ),
    Title: Dictionary.of(pools.investmentFirm.Titles),
  };

  readonly Bank: CompanyType = {
    Name: Dictionary.of(pools.bank.Names),
    Title: Dictionary.of(pools.bank.Titles),
  };

  readonly Restaurant: CompanyType = {
    Name: Dictionary.of(pools.restaurant.Names),
    Title: Dictionary.of(pools.restaurant.Titles),
  };

  /** A company Name, mixing every business-entity type across calls, on purpose -- mimics a real, varied dataset of company Names rather than one uniform shape. */
  readonly Name: Dictionary<string> = Dictionary.from(() => pick(this.categories).Name.pick());

  /** A job title, drawn from whichever business-entity type is picked -- independent of `Name`'s own pick, the same way `MedicalPractice.Title` is independent of `MedicalPractice.Name`. */
  readonly Title: Dictionary<string> = Dictionary.from(() => pick(this.categories).Title.pick());

  private get categories() {
    return [
      this.Brand,
      this.Llc,
      this.Corporation,
      this.MedicalPractice,
      this.LawFirm,
      this.InvestmentFirm,
      this.Bank,
      this.Restaurant,
    ];
  }
}();

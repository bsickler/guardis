/**
 * examples/nested-objects.ts - Generating objects that contain other objects:
 * nested shapes, arrays/maps/sets of objects, extend()-ing a base shape, and
 * relating generated values ACROSS those nesting levels in both directions.
 *
 * Sections 1-4 are structure; 5 onward are relations. The short version: a
 * derive function passed under `props` gets the sibling values as its first
 * argument and a GenContext as its second, so it can read inward (`props.x.y`)
 * or outward (`ctx.parent`, `ctx.root`). Run with:
 *
 *   deno run examples/nested-objects.ts
 *
 * The `// =>` block under each section is real output from one run. Generation
 * is random, so the VALUES differ every run -- what doesn't change is the
 * shape, and the relationships each section is there to show (a derived email
 * always matching its company, a badge always matching its index, and so on).
 * Call `seed(...)` first, as examples/prng.ts does, to pin the values too.
 */
import "@spudlabs/guardis-gen";
import "@spudlabs/guardis-gen/modules/primitives";
import "@spudlabs/guardis-gen/modules/strings";
import "@spudlabs/guardis-gen/modules/collections";

import { createTypeGuard, isArray, isMap, isNumber, isString } from "@spudlabs/guardis";
import { isEmail } from "@spudlabs/guardis/strings";

function section(title: string): void {
  console.log(`\n--- ${title} ---`);
}

// --- 1. A guard as a field value nests its whole generated shape ------------
// Any guard built with createTypeGuard(shape) can itself be used as a field
// in another shape -- the nested object is generated recursively.

section("1. A nested object field");

const isAddress = createTypeGuard({ street: isString, city: isString });
const isCompany = createTypeGuard({ name: isString, address: isAddress });

console.log("isCompany.generate():", isCompany.generate());
// =>
// { name: "kmlxa", address: { street: "nwwzpbrx", city: "ojm" } }

// --- 2. isArray.of(guard) generates an array of that guard's shape ----------

section("2. Arrays of objects");

console.log(
  "isArray.of(isCompany).ofLength(2).generate():",
  isArray.of(isCompany).ofLength(2).generate(),
);
// =>
// [
//   { name: "oneuf",   address: { street: "omnxs", city: "vwdjd" } },
//   { name: "eaivncb", address: { street: "mdchv", city: "nxlamxc" } }
// ]

// --- 3. isMap.of(keyGuard, valueGuard) generates a Map of that shape --------
// Handy for a "dictionary keyed by id" shape, rather than an array of
// objects that each carry their own id field.

section("3. Maps of objects");

console.log(
  "isMap.of(isString, isCompany).ofSize(2).generate():",
  isMap.of(isString, isCompany).ofSize(2).generate(),
);
// =>
// Map(2) {
//   "qrziais" => { name: "ennmfk",   address: { street: "mwevburu", city: "gvgyg" } },
//   "msinrlv" => { name: "imovdicd", address: { street: "cpiybn",   city: "rbrn" } }
// }

// --- 4. extend() layers new fields onto an existing object guard -----------
// isCustomer gets everything isCompany has, plus its own fields -- and its
// own matching generator, with no shape duplicated by hand.

section("4. extend()-ing a base shape");

const isCustomer = isCompany.extend({ accountEmail: isEmail, since: isString });
console.log("isCustomer.generate():", isCustomer.generate());
// => the base shape's fields, plus its own -- one generator, no duplication
// {
//   name: "ycwjicgr",
//   address: { street: "hmeq", city: "fvntehc" },
//   accountEmail: "rzcsjq@pnovfy.com",
//   since: "ydny"
// }

// --- 5. Reading INWARD: an outer field derived from a nested one ------------
// A derive function's first argument is this object's other fields, already
// generated -- including nested objects, so it can read all the way down.

section("5. Deriving a field from a nested sibling");

const isInvoice = createTypeGuard({ company: isCompany, summary: isString });
console.log(
  "isInvoice.generate({ props: { summary } }):",
  isInvoice.generate({
    props: {
      summary: (props) => `Invoice for ${props.company.name}, ${props.company.address.city}`,
    },
  }),
);
// => `summary` names the company and the city two levels down inside it
// {
//   company: { name: "qwaghggs", address: { street: "nzamabqz", city: "xmqtjnb" } },
//   summary: "Invoice for qwaghggs, xmqtjnb"
// }

// --- 6. Reading OUTWARD: a nested field derived from its container ----------
// The counterpart to section 5, via the derive function's second argument.
// `ctx.parent` is the enclosing object as a live proxy, so reading a field
// off it generates that field on demand -- declaration order doesn't matter,
// and `customer` here is produced when `addressedTo` asks for it.

section("6. A nested field deriving from the object that contains it");

const isStatement = createTypeGuard({
  customer: isString,
  billing: createTypeGuard({ addressedTo: isString }),
});

console.log(
  "isStatement.generate({ props: { billing } }):",
  isStatement.generate({
    props: {
      billing: { props: { addressedTo: (_billing, ctx) => `ATTN: ${ctx.parent.customer}` } },
    },
  }),
);
// => the nested `addressedTo` echoes `customer` from the level above it
// { customer: "ohkvef", billing: { addressedTo: "ATTN: ohkvef" } }

// --- 7. A parent with N children that each derive from it -------------------
// A collection's options bag is forwarded to each element, minus the size
// keys (min/max/ofLength) the collection consumes for its own length. An
// array introduces a POSITION, not an object level, so an element's
// `ctx.parent` is the object that owns the array -- which is how every member
// reaches the one shared `company`. `ctx.index` is the element's position.
//
// Both directions at once here: the members derive from the company, and
// `headcount` derives back from the members.

section("7. Every element of an array deriving from the shared parent");

const isTeamMember = createTypeGuard({ name: isString, email: isString, badge: isString });
const isTeam = createTypeGuard({
  company: isCompany,
  members: isArray.of(isTeamMember).ofLength(3),
  headcount: isNumber,
});

console.log(isTeam.generate({
  props: {
    members: {
      props: {
        email: (member, ctx) => `${member.name}@${ctx.parent.company.name.toLowerCase()}.com`,
        badge: (_member, ctx) => `#${String(ctx.index).padStart(3, "0")}`,
      },
    },
    headcount: (props) => props.members.length,
  },
}));
// => every member's email ends in the ONE shared company name; badges follow
//    ctx.index; headcount counts back the other way
// {
//   company: { name: "awd", address: { street: "yoi", city: "ntqeaan" } },
//   members: [
//     { name: "cnexd",    email: "cnexd@awd.com",    badge: "#000" },
//     { name: "nyjmqjcu", email: "nyjmqjcu@awd.com", badge: "#001" },
//     { name: "mdprse",   email: "mdprse@awd.com",   badge: "#002" }
//   ],
//   headcount: 3
// }

// --- 8. Reaching further than one level: ancestors and root -----------------
// `ctx.ancestors` is every enclosing object, root first, so
// `ctx.parent === ctx.ancestors.at(-1)`; `ctx.root` is the outermost one.
// Here a line item sits inside `cart`, which sits inside the order -- so its
// `ctx.parent` is the cart, and `ctx.root` is the order.

section("8. Reaching past the immediate parent, to the root");

const isLineItem = createTypeGuard({ sku: isString, orderRef: isString });
const isOrder = createTypeGuard({
  reference: isString,
  cart: createTypeGuard({ items: isArray.of(isLineItem).ofLength(2) }),
});

console.log(JSON.stringify(
  isOrder.generate({
    props: {
      cart: {
        props: {
          items: {
            props: {
              // `root` is typed as a plain record -- only `parent` carries the
              // statically known shape, so reaching the whole way out is a cast.
              orderRef: (_item, ctx) =>
                `${(ctx.root as { reference: string }).reference}/${ctx.index}`,
            },
          },
        },
      },
    },
  }),
  null,
  2,
));
// => each item's orderRef carries the ROOT order's reference, two levels up,
//    past the intervening `cart`
// {
//   "reference": "pmeiusal",
//   "cart": {
//     "items": [
//       { "sku": "vnoy", "orderRef": "pmeiusal/0" },
//       { "sku": "lstt", "orderRef": "pmeiusal/1" }
//     ]
//   }
// }

// --- 9. Cycles are caught, across levels too --------------------------------
// The cycle detector is shared down the whole tree, so a loop that only closes
// by going UP a level is an error rather than an infinite descent. The message
// names the full path.

section("9. A cycle that only closes across levels");

const isOuter = createTypeGuard({
  summary: isString,
  child: createTypeGuard({ note: isString }),
});

try {
  isOuter.generate({
    props: {
      summary: (props) => props.child.note,
      child: { props: { note: (_child, ctx) => ctx.parent.summary } },
    },
  });
} catch (error) {
  console.log("threw as expected:", (error as Error).message);
}
// => the chain names the full path, so the level the loop closes at is visible
// threw as expected: circular dependency in relational properties: child ->
//   child.note -> summary -> child -- break the cycle by having one of these
//   fields' derive functions stop depending on the other.

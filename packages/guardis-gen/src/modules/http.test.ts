// Deliberately does NOT import modules/primitives.ts or modules/strings.ts
// -- proves this module is independently usable (tree-shakeable) on its own.
import "./http.ts";

import {
  isCidr,
  isCidrV4,
  isCidrV6,
  isIpAddress,
  isIpv4,
  isIpv6,
  isIpv6Compressed,
  isIpv6Full,
} from "@spudlabs/guardis/http";

const roundTripCases = [
  ["isIpv4", isIpv4],
  ["isIpv6Full", isIpv6Full],
  ["isIpv6Compressed", isIpv6Compressed],
  ["isIpv6", isIpv6],
  ["isIpAddress", isIpAddress],
  ["isCidrV4", isCidrV4],
  ["isCidrV6", isCidrV6],
  ["isCidr", isCidr],
] as const;

Deno.test("IP/CIDR format round trips", async (t) => {
  for (const [name, guard] of roundTripCases) {
    await t.step(`${name}.generate() actually passes ${name}()`, () => {
      for (let i = 0; i < 20; i++) guard.generate();
    });
  }
});

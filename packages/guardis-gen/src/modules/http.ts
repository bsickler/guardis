/**
 * modules/http.ts - Side-effect entry point mirroring guardis'
 * "@spudlabs/guardis/http" module. Binds a generator directly to each
 * IP/CIDR guard via .defineGenerator() — validated against that same guard
 * on every call, not matched through a separate string registry.
 * Independent of modules/primitives and modules/strings — importing this
 * alone doesn't pull either of those in.
 * @module
 */
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
import { randomHex } from "../utilities/random.ts";
import { attachToVariants, ensureGenerateCapability } from "../shared.ts";
import { ensureDefineGeneratorCapability } from "../define-generator.ts";
import { ensureOrCapability } from "../or.ts";

ensureGenerateCapability();
ensureDefineGeneratorCapability();
ensureOrCapability();

function randomOctet(): number {
  return Math.floor(Math.random() * 256);
}

function ipv4(): string {
  return `${randomOctet()}.${randomOctet()}.${randomOctet()}.${randomOctet()}`;
}

function ipv6Full(): string {
  return Array.from({ length: 8 }, () => randomHex(4)).join(":");
}

/** "::" plus a single trailing group is always valid per IPV6_COMPRESSED_REGEX. */
function ipv6Compressed(): string {
  return `::${randomHex(1 + Math.floor(Math.random() * 4))}`;
}

function ipv6(): string {
  return Math.random() < 0.5 ? ipv6Full() : ipv6Compressed();
}

// These guards already exist by the time this module runs (built at
// @spudlabs/guardis's own module-load time) -- same reasoning as
// modules/primitives.ts's attach calls. .defineGenerator() binds each
// generator directly to its guard and validates against it on every call.
for (
  const guard of [
    isIpv4,
    isIpv6Full,
    isIpv6Compressed,
    isIpv6,
    isIpAddress,
    isCidrV4,
    isCidrV6,
    isCidr,
  ]
) {
  attachToVariants(guard);
}

isIpv4.defineGenerator(ipv4);
isIpv6Full.defineGenerator(ipv6Full);
isIpv6Compressed.defineGenerator(ipv6Compressed);
isIpv6.defineGenerator(ipv6);
isIpAddress.defineGenerator(() => (Math.random() < 0.5 ? ipv4() : ipv6()));
isCidrV4.defineGenerator(() => `${ipv4()}/${Math.floor(Math.random() * 33)}`);
isCidrV6.defineGenerator(() => `${ipv6()}/${Math.floor(Math.random() * 129)}`);
isCidr.defineGenerator(() => `${ipv4()}/${Math.floor(Math.random() * 33)}`);

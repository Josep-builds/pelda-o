import { generateKeyPairSync } from "crypto";
import { signPayload, verifyPayload } from "../lib/crypto/ed25519.ts";
import { canonicalStringify, buildAttestationFields } from "../lib/attestations/payload.ts";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
process.env.ED25519_PRIVATE_KEY_B64 = Buffer.from(
  privateKey.export({ type: "pkcs8", format: "pem" })
).toString("base64");
process.env.ED25519_PUBLIC_KEY_B64 = Buffer.from(
  publicKey.export({ type: "spki", format: "pem" })
).toString("base64");

const fields = buildAttestationFields({
  owner_id: "00000000-0000-0000-0000-000000000001",
  observer_id: "00000000-0000-0000-0000-000000000002",
  context: "Conteo de inventario, 3 sep",
  dimensions: { puntualidad: 5, precision: 4, ritmo: 5, trato: 5, instrucciones: 4 },
  notes: {
    puntualidad: "Llegó a tiempo",
    precision: "Casi sin errores",
    ritmo: "Rápido",
    trato: "Amable",
    instrucciones: "Siguió todo",
  },
  rehire: "si",
  signed_at: new Date().toISOString(),
});

const payload = canonicalStringify(fields);
const signature = signPayload(payload);

const valid = verifyPayload(payload, signature);
console.log("valid signature verifies:", valid);
if (!valid) throw new Error("FAIL: a correctly signed payload did not verify");

// Determinism: rebuilding from a shuffled-key-order object must match.
const shuffled = { ...fields };
const reordered = JSON.parse(JSON.stringify(shuffled));
const payload2 = canonicalStringify(reordered);
if (payload !== payload2) throw new Error("FAIL: canonicalStringify is not deterministic");
console.log("canonical payload is deterministic: true");

// Tamper: change one byte of the signed content, signature must fail.
const tampered = { ...fields, dimensions: { ...fields.dimensions, puntualidad: 4 } };
const tamperedPayload = canonicalStringify(tampered);
const tamperedValid = verifyPayload(tamperedPayload, signature);
console.log("tampered signature verifies (should be false):", tamperedValid);
if (tamperedValid) throw new Error("FAIL: tampered payload verified against the original signature");

// Wrong public key must fail too.
const other = generateKeyPairSync("ed25519");
const otherPubB64 = Buffer.from(other.publicKey.export({ type: "spki", format: "pem" })).toString(
  "base64"
);
const wrongKeyValid = verifyPayload(payload, signature, otherPubB64);
console.log("valid payload verifies against a different public key (should be false):", wrongKeyValid);
if (wrongKeyValid) throw new Error("FAIL: signature verified against the wrong public key");

console.log("\nALL CRYPTO TESTS PASSED");

import { generateKeyPairSync } from "crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");

const privateB64 = Buffer.from(privateKey.export({ type: "pkcs8", format: "pem" })).toString(
  "base64"
);
const publicB64 = Buffer.from(publicKey.export({ type: "spki", format: "pem" })).toString(
  "base64"
);

console.log("ED25519_PRIVATE_KEY_B64=" + privateB64);
console.log("ED25519_PUBLIC_KEY_B64=" + publicB64);

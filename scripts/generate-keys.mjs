import { generateKeyPairSync } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";

const ENV_PATH = new URL("../.env.local", import.meta.url);

const { privateKey, publicKey } = generateKeyPairSync("ed25519");

const privateB64 = Buffer.from(privateKey.export({ type: "pkcs8", format: "pem" })).toString(
  "base64"
);
const publicB64 = Buffer.from(publicKey.export({ type: "spki", format: "pem" })).toString(
  "base64"
);

const KEYS = {
  ED25519_PRIVATE_KEY_B64: privateB64,
  ED25519_PUBLIC_KEY_B64: publicB64,
};

let lines = existsSync(ENV_PATH)
  ? readFileSync(ENV_PATH, "utf8").split("\n")
  : [];

for (const [name, value] of Object.entries(KEYS)) {
  const lineIndex = lines.findIndex((line) => line.startsWith(`${name}=`));
  const newLine = `${name}=${value}`;
  if (lineIndex >= 0) {
    lines[lineIndex] = newLine;
  } else {
    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    lines.push(newLine);
  }
}

if (lines[lines.length - 1] !== "") lines.push("");

writeFileSync(ENV_PATH, lines.join("\n"));

console.log("Wrote ED25519_PRIVATE_KEY_B64 and ED25519_PUBLIC_KEY_B64 to .env.local (values not printed).");

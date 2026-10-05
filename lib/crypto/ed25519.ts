import {
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "crypto";

// Keys are stored as base64-encoded PEM in env vars (keeps them on one
// line, which env files and Vercel's dashboard both need) and generated
// once via scripts/generate-keys.mjs. The private key never leaves the
// server; the public key is not a secret and ships in signed exports so a
// verifier could, in principle, check a signature offline.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env.local and Vercel env vars.`);
  }
  return value;
}

function decodePem(base64Pem: string): string {
  return Buffer.from(base64Pem, "base64").toString("utf8");
}

export function signPayload(canonicalPayload: string): string {
  const privateKey = createPrivateKey({
    key: decodePem(requireEnv("ED25519_PRIVATE_KEY_B64")),
    format: "pem",
  });
  const signature = cryptoSign(null, Buffer.from(canonicalPayload, "utf8"), privateKey);
  return signature.toString("base64");
}

export function verifyPayload(
  canonicalPayload: string,
  signatureBase64: string,
  publicKeyB64Pem?: string
): boolean {
  try {
    const publicKey = createPublicKey({
      key: decodePem(publicKeyB64Pem ?? requireEnv("ED25519_PUBLIC_KEY_B64")),
      format: "pem",
    });
    return cryptoVerify(
      null,
      Buffer.from(canonicalPayload, "utf8"),
      publicKey,
      Buffer.from(signatureBase64, "base64")
    );
  } catch {
    return false;
  }
}

export function getPublicKeyPemBase64(): string {
  return requireEnv("ED25519_PUBLIC_KEY_B64");
}

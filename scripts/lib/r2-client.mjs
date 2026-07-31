/**
 * Cloudflare R2 (S3-compatible) helpers for Node scripts.
 *
 * Env (root or admin .env / .env.local):
 *   R2_ACCOUNT_ID or VITE_R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID or VITE_R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY or VITE_R2_SECRET_ACCESS_KEY
 *   R2_BUCKET or VITE_R2_BUCKET (default: saigon-express-tasmania)
 *   R2_PUBLIC_URL or VITE_R2_PUBLIC_URL
 */

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let client = null;

export function getR2Env() {
  const accountId =
    process.env.R2_ACCOUNT_ID ?? process.env.VITE_R2_ACCOUNT_ID ?? "";
  const accessKeyId =
    process.env.R2_ACCESS_KEY_ID ?? process.env.VITE_R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY ??
    process.env.VITE_R2_SECRET_ACCESS_KEY ??
    "";
  const bucket =
    process.env.R2_BUCKET ??
    process.env.VITE_R2_BUCKET ??
    "saigon-express-tasmania";
  const publicUrl = (
    process.env.R2_PUBLIC_URL ??
    process.env.VITE_R2_PUBLIC_URL ??
    ""
  ).replace(/\/+$/, "");

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export function requireR2Config({ requirePublicUrl = true } = {}) {
  const config = getR2Env();
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error(
      "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY (or VITE_R2_* equivalents).",
    );
  }
  if (requirePublicUrl && !config.publicUrl) {
    throw new Error(
      "Missing R2_PUBLIC_URL (or VITE_R2_PUBLIC_URL). Set your R2 public / custom domain base URL.",
    );
  }
  return config;
}

export function getR2Client() {
  if (client) return client;

  const { accountId, accessKeyId, secretAccessKey } = requireR2Config({
    requirePublicUrl: false,
  });

  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // R2 does not fully support AWS SDK default flexible checksums.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return client;
}

export function normalizeObjectKey(objectPath) {
  return String(objectPath ?? "")
    .trim()
    .replace(/^\/+/, "");
}

export function buildR2PublicUrl(publicBaseUrl, objectPath) {
  const base = String(publicBaseUrl ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!base) {
    throw new Error("R2 public URL base is required.");
  }
  return `${base}/${normalizeObjectKey(objectPath)}`;
}

export async function uploadR2Object(objectPath, body, contentType) {
  const { bucket } = requireR2Config({ requirePublicUrl: false });
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: normalizeObjectKey(objectPath),
      Body: body,
      ContentType: contentType || undefined,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function r2ObjectExists(objectPath) {
  const { bucket } = requireR2Config({ requirePublicUrl: false });
  try {
    await getR2Client().send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: normalizeObjectKey(objectPath),
      }),
    );
    return true;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    const name = error?.name ? String(error.name) : "";
    if (status === 404 || name === "NotFound" || name === "NoSuchKey") {
      return false;
    }
    throw error;
  }
}

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV, STORAGE_BUCKET } from '@/constants';

let client: S3Client | null = null;

function requireR2Config() {
  const { r2AccountId, r2AccessKeyId, r2SecretAccessKey } = ENV;
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !STORAGE_BUCKET) {
    throw new Error(
      'Cloudflare R2 is not configured. Set VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, and VITE_R2_BUCKET.',
    );
  }
  return {
    accountId: r2AccountId,
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
    bucket: STORAGE_BUCKET,
  };
}

export function getR2Client(): S3Client {
  if (client) return client;

  const { accountId, accessKeyId, secretAccessKey } = requireR2Config();

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // R2 does not fully support AWS SDK default flexible checksums.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  return client;
}

export function getR2PublicUrl(path: string): string {
  const base = (ENV.r2PublicUrl ?? '').replace(/\/+$/, '');
  if (!base) {
    throw new Error(
      'Missing VITE_R2_PUBLIC_URL. Set your R2 public / custom domain base URL.',
    );
  }
  const objectPath = path.replace(/^\/+/, '');
  return `${base}/${objectPath}`;
}

export async function getR2SignedUrl(
  path: string,
  expiresInSeconds: number,
): Promise<string> {
  const { bucket } = requireR2Config();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: path.replace(/^\/+/, ''),
  });
  return getS3SignedUrl(getR2Client(), command, { expiresIn: expiresInSeconds });
}

export async function uploadR2Object(
  path: string,
  body: Blob | File | string | Uint8Array,
  contentType?: string,
): Promise<void> {
  const { bucket } = requireR2Config();
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: path.replace(/^\/+/, ''),
      Body: body,
      ContentType: contentType || undefined,
    }),
  );
}

export async function deleteR2Object(path: string): Promise<void> {
  const { bucket } = requireR2Config();
  const key = path.replace(/^\/+/, '');
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function r2ObjectExists(path: string): Promise<boolean> {
  const { bucket } = requireR2Config();
  try {
    await getR2Client().send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: path.replace(/^\/+/, ''),
      }),
    );
    return true;
  } catch (error: unknown) {
    const status =
      typeof error === 'object' &&
      error !== null &&
      '$metadata' in error &&
      typeof (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode === 'number'
        ? (error as { $metadata: { httpStatusCode: number } }).$metadata
            .httpStatusCode
        : undefined;

    if (status === 404) return false;

    const name =
      typeof error === 'object' && error !== null && 'name' in error
        ? String((error as { name: unknown }).name)
        : '';
    if (name === 'NotFound' || name === 'NoSuchKey') return false;

    throw error;
  }
}

export async function downloadR2Object(path: string): Promise<Blob | null> {
  const { bucket } = requireR2Config();
  try {
    const response = await getR2Client().send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: path.replace(/^\/+/, ''),
      }),
    );

    if (!response.Body) return null;
    const bytes = await response.Body.transformToByteArray();
    return new Blob([bytes], {
      type: response.ContentType || 'application/octet-stream',
    });
  } catch (error: unknown) {
    const status =
      typeof error === 'object' &&
      error !== null &&
      '$metadata' in error &&
      typeof (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode === 'number'
        ? (error as { $metadata: { httpStatusCode: number } }).$metadata
            .httpStatusCode
        : undefined;

    const name =
      typeof error === 'object' && error !== null && 'name' in error
        ? String((error as { name: unknown }).name)
        : '';

    if (status === 404 || name === 'NoSuchKey' || name === 'NotFound') {
      return null;
    }
    throw error;
  }
}

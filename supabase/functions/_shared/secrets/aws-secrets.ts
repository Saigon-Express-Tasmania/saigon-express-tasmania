const AWS_KEY_NAME = "AWS_KEY";
const AWS_SECRET_NAME = "AWS_SECRET";
const AWS_REGION_NAME = "AWS_REGION";

/** Supabase-injected secret (Dashboard → Edge Functions → Secrets). */
function requireSecret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing Supabase secret: ${name}`);
  }
  return value;
}

export function getAwsKey(): string {
  return requireSecret(AWS_KEY_NAME);
}

export function getAwsSecret(): string {
  return requireSecret(AWS_SECRET_NAME);
}

export function getAwsRegion(): string {
  return requireSecret(AWS_REGION_NAME);
}

export type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
};

export function getAwsCredentials(): AwsCredentials {
  return {
    accessKeyId: getAwsKey(),
    secretAccessKey: getAwsSecret(),
  };
}

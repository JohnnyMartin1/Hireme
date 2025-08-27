import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = process.env.S3_REGION as string;
const BUCKET = process.env.S3_BUCKET as string;

// Lazy singleton S3 client
let s3: S3Client | null = null;
function getS3() {
  if (!s3) {
    s3 = new S3Client({ region: REGION });
  }
  return s3;
}

export async function getPresignedUrl(key: string, contentType: string): Promise<string> {
  const client = getS3();
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const url = await getSignedUrl(client, command, { expiresIn: 60 * 5 });
  return url;
}
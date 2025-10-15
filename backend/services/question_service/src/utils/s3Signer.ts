// src/utils/s3Signer.ts

// MVP: stub that "would" return a signed URL for an object key.
// Replace with AWS SDK v3 getSignedUrl when integrating.
export function signPublicUrl(key: string): string {
  return `https://cdn.example.com/${encodeURIComponent(key)}`;
}

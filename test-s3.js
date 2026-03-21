require('dotenv').config({ path: '.env.local' });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const client = new S3Client({
  region: 'auto',
  endpoint: 'https://' + process.env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  }
});
const cmd = new PutObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME || 'test',
  Key: 'test.jpg',
  ContentType: 'image/jpeg'
});
getSignedUrl(client, cmd, { expiresIn: 3600 }).then(console.log).catch(console.error);

import { S3VideoStorageService } from '../services/video-storage/S3VideoStorageService.js';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
const { AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_TEMP_DIR } = process.env;
if (!AWS_S3_BUCKET)
    throw new Error('AWS_S3_BUCKET is required');
if (!AWS_REGION)
    throw new Error('AWS_REGION is required');
if (!AWS_ACCESS_KEY_ID)
    throw new Error('AWS_ACCESS_KEY_ID is required');
if (!AWS_SECRET_ACCESS_KEY)
    throw new Error('AWS_SECRET_ACCESS_KEY is required');
export const videoStorageService = new S3VideoStorageService({
    bucket: AWS_S3_BUCKET,
    region: AWS_REGION,
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    tempDir: AWS_TEMP_DIR || 'temp',
});

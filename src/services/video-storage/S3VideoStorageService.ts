import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BaseVideoStorageService } from './BaseVideoStorageService';
import { VideoMetadata } from './VideoStorageService';
import { Readable } from 'stream';

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  tempDir: string;
}

export class S3VideoStorageService extends BaseVideoStorageService {
  private s3Client: S3Client;

  constructor(config: S3Config) {
    super(config);
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  protected async uploadToStorage(
    path: string,
    file: Buffer,
    contentType: string
  ): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: path,
        Body: file,
        ContentType: contentType,
      })
    );
  }

  protected async downloadFromStorage(path: string): Promise<NodeJS.ReadableStream> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: path,
      })
    );

    if (!response.Body) {
      throw new Error('Failed to download file from S3');
    }

    return response.Body as Readable;
  }

  protected async deleteFromStorage(path: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: path,
      })
    );
  }

  protected async getTemporaryUrlFromStorage(
    path: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: path,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  protected async listFromStorage(
    prefix: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ keys: string[]; total: number }> {
    const response = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: options?.limit,
        StartAfter: options?.offset ? `${prefix}${options.offset}` : undefined,
      })
    );

    return {
      keys: (response.Contents || []).map((item) => item.Key || ''),
      total: response.KeyCount || 0,
    };
  }

  // Implement the database-related methods
  async getVideoMetadata(id: string): Promise<VideoMetadata> {
    // TODO: Implement fetching video metadata from your database
    throw new Error('Method not implemented.');
  }

  async updateVideoMetadata(
    id: string,
    metadata: Partial<VideoMetadata>
  ): Promise<VideoMetadata> {
    // TODO: Implement updating video metadata in your database
    throw new Error('Method not implemented.');
  }

  async listUserVideos(
    userId: string,
    options?: {
      status?: VideoMetadata['status'];
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    videos: VideoMetadata[];
    total: number;
  }> {
    // TODO: Implement listing user videos from your database
    throw new Error('Method not implemented.');
  }
} 
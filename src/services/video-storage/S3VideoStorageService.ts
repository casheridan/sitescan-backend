import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BaseVideoStorageService } from './BaseVideoStorageService.js';
import { VideoMetadata } from './VideoStorageService.js';
import { Readable } from 'stream';
import crypto from 'crypto';

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  tempDir: string;
}

// In-memory metadata store (for development only)
const videoMetadataStore: Record<string, VideoMetadata> = {};

export class S3VideoStorageService extends BaseVideoStorageService {
  private s3Client: S3Client;
  protected config: S3Config;

  constructor(config: S3Config) {
    super(config);
    this.config = config;
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
    try {
      console.log('Uploading to S3:', { path, contentType, fileSize: file.length });
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: path,
          Body: file,
          ContentType: contentType,
          Metadata: {
            'Cache-Control': 'max-age=31536000',
            'Content-Type': contentType
          }
        })
      );
      console.log('Upload to S3 successful');
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected async downloadFromStorage(path: string): Promise<NodeJS.ReadableStream> {
    try {
      console.log('Downloading from S3:', path);
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: path,
        })
      );

      if (!response.Body) {
        console.error('No response body from S3');
        throw new Error('No response body from S3');
      }

      console.log('S3 download successful, content type:', response.ContentType);
      const stream = response.Body as Readable;
      
      // Add error handling to the stream
      stream.on('error', (error) => {
        console.error('S3 stream error:', error);
      });

      return stream;
    } catch (error) {
      console.error('S3 download error:', error);
      throw new Error(`Failed to download from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    try {
      console.log('Generating temporary URL for:', path);
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: path,
        ResponseContentType: 'video/mp4',
        ResponseContentDisposition: 'inline'
      });

      const url = await getSignedUrl(this.s3Client, command, { 
        expiresIn: expiresInSeconds 
      });
      console.log('Generated temporary URL:', url);
      return url;
    } catch (error) {
      console.error('Error generating temporary URL:', error);
      throw new Error(`Failed to generate temporary URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  async uploadVideo(
    userId: string,
    file: Buffer,
    metadata: Omit<VideoMetadata, 'id' | 'uploadDate' | 'storagePath' | 'thumbnailPath'>
  ): Promise<VideoMetadata> {
    // Generate a unique ID and storage path
    const id = crypto.randomUUID();
    const uploadDate = new Date();
    const storagePath = `videos/${userId}/${id}/${metadata.originalName}`;

    // Upload to S3
    await this.uploadToStorage(storagePath, file, metadata.mimeType);

    // Build the metadata object
    const videoMetadata: VideoMetadata = {
      id,
      userId,
      originalName: metadata.originalName,
      mimeType: metadata.mimeType,
      size: metadata.size,
      status: metadata.status,
      uploadDate,
      storagePath,
    };

    // Store in memory
    videoMetadataStore[id] = videoMetadata;

    return videoMetadata;
  }

  async getVideoMetadata(id: string): Promise<VideoMetadata> {
    const metadata = videoMetadataStore[id];
    if (!metadata) {
      throw new Error('Video metadata not found');
    }
    return metadata;
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

  async getVideo(id: string): Promise<{
    stream: NodeJS.ReadableStream;
    metadata: VideoMetadata;
  }> {
    try {
      console.log('Getting video:', id);
      const metadata = await this.getVideoMetadata(id);
      console.log('Video metadata:', metadata);

      const stream = await this.downloadFromStorage(metadata.storagePath);
      console.log('Video stream created successfully');
      
      return { stream, metadata };
    } catch (error) {
      console.error('Error getting video:', error);
      throw new Error(`Failed to get video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 
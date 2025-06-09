import { v4 as uuidv4 } from 'uuid';
import { VideoMetadata, VideoStorageService } from './VideoStorageService';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import ffmpeg from 'fluent-ffmpeg';

export abstract class BaseVideoStorageService implements VideoStorageService {
  protected constructor(
    protected readonly config: {
      bucket: string;
      region?: string;
      tempDir: string;
    }
  ) {}

  protected abstract uploadToStorage(
    path: string,
    file: Buffer,
    contentType: string
  ): Promise<void>;

  protected abstract downloadFromStorage(path: string): Promise<NodeJS.ReadableStream>;

  protected abstract deleteFromStorage(path: string): Promise<void>;

  protected abstract getTemporaryUrlFromStorage(
    path: string,
    expiresInSeconds?: number
  ): Promise<string>;

  protected abstract listFromStorage(
    prefix: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ keys: string[]; total: number }>;

  async uploadVideo(
    userId: string,
    file: Buffer,
    metadata: Omit<VideoMetadata, 'id' | 'uploadDate' | 'storagePath' | 'thumbnailPath' | 'userId'>
  ): Promise<VideoMetadata> {
    const id = uuidv4();
    const storagePath = `videos/${userId}/${id}/${metadata.originalName}`;
    const thumbnailPath = `thumbnails/${userId}/${id}/thumbnail.jpg`;

    // Upload the video file
    await this.uploadToStorage(storagePath, file, metadata.mimeType);

    // Generate and upload thumbnail
    const thumbnailBuffer = await this.generateThumbnailBuffer(file);
    await this.uploadToStorage(thumbnailPath, thumbnailBuffer, 'image/jpeg');

    const videoMetadata: VideoMetadata = {
      id,
      userId,
      ...metadata,
      uploadDate: new Date(),
      storagePath,
      thumbnailPath,
    };

    return videoMetadata;
  }

  async getVideo(id: string): Promise<{
    stream: NodeJS.ReadableStream;
    metadata: VideoMetadata;
  }> {
    const metadata = await this.getVideoMetadata(id);
    const stream = await this.downloadFromStorage(metadata.storagePath);
    return { stream, metadata };
  }

  async getVideoMetadata(id: string): Promise<VideoMetadata> {
    // This should be implemented by the concrete class to fetch from your database
    throw new Error('Method not implemented.');
  }

  async updateVideoMetadata(
    id: string,
    metadata: Partial<VideoMetadata>
  ): Promise<VideoMetadata> {
    // This should be implemented by the concrete class to update in your database
    throw new Error('Method not implemented.');
  }

  async deleteVideo(id: string): Promise<void> {
    const metadata = await this.getVideoMetadata(id);
    await this.deleteFromStorage(metadata.storagePath);
    if (metadata.thumbnailPath) {
      await this.deleteFromStorage(metadata.thumbnailPath);
    }
  }

  async getTemporaryUrl(id: string, expiresInSeconds = 3600): Promise<string> {
    const metadata = await this.getVideoMetadata(id);
    return this.getTemporaryUrlFromStorage(metadata.storagePath, expiresInSeconds);
  }

  async generateThumbnail(id: string): Promise<string> {
    const metadata = await this.getVideoMetadata(id);
    const videoStream = await this.downloadFromStorage(metadata.storagePath);
    
    // Create temp directory if it doesn't exist
    await mkdir(this.config.tempDir, { recursive: true });
    
    const tempVideoPath = join(this.config.tempDir, `${id}.mp4`);
    const tempThumbnailPath = join(this.config.tempDir, `${id}_thumb.jpg`);

    // Save video to temp file
    const writeStream = createWriteStream(tempVideoPath);
    await pipeline(videoStream, writeStream);

    // Generate thumbnail using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: `${id}_thumb.jpg`,
          folder: this.config.tempDir,
          size: '320x240'
        })
        .on('end', () => resolve())
        .on('error', reject);
    });

    // Read thumbnail and upload it
    const thumbnailBuffer = await readFile(tempThumbnailPath);
    const thumbnailPath = `thumbnails/${metadata.userId}/${id}/thumbnail.jpg`;
    await this.uploadToStorage(thumbnailPath, thumbnailBuffer, 'image/jpeg');

    // Update metadata with new thumbnail path
    await this.updateVideoMetadata(id, { thumbnailPath });

    return thumbnailPath;
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
    // This should be implemented by the concrete class to fetch from your database
    throw new Error('Method not implemented.');
  }

  private async generateThumbnailBuffer(videoBuffer: Buffer): Promise<Buffer> {
    // Create temp directory if it doesn't exist
    await mkdir(this.config.tempDir, { recursive: true });
    
    const tempVideoPath = join(this.config.tempDir, `temp_${Date.now()}.mp4`);
    const tempThumbnailPath = join(this.config.tempDir, `temp_${Date.now()}_thumb.jpg`);

    // Save video to temp file
    await writeFile(tempVideoPath, videoBuffer);

    // Generate thumbnail using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: `temp_${Date.now()}_thumb.jpg`,
          folder: this.config.tempDir,
          size: '320x240'
        })
        .on('end', () => resolve())
        .on('error', reject);
    });

    // Read thumbnail file
    const thumbnailBuffer = await readFile(tempThumbnailPath);

    // Clean up temp files
    await Promise.all([
      unlink(tempVideoPath),
      unlink(tempThumbnailPath)
    ]);

    return thumbnailBuffer;
  }
} 
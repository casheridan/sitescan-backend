import { v4 as uuidv4 } from 'uuid';
import { createWriteStream } from 'fs';
import { mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import ffmpeg from 'fluent-ffmpeg';
export class BaseVideoStorageService {
    constructor(config) {
        this.config = config;
        // Ensure temp directory exists
        this.ensureTempDir();
    }
    async ensureTempDir() {
        try {
            console.log('Checking temp directory:', this.config.tempDir);
            await mkdir(this.config.tempDir, { recursive: true });
            console.log('Temp directory is ready');
        }
        catch (error) {
            console.error('Error creating temp directory:', error);
            throw new Error(`Failed to create temp directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async uploadVideo(userId, file, metadata) {
        try {
            console.log('Starting video upload process:', {
                userId,
                originalName: metadata.originalName,
                mimeType: metadata.mimeType,
                size: metadata.size
            });
            const id = uuidv4();
            const storagePath = `videos/${userId}/${id}/${metadata.originalName}`;
            // Upload the video file
            console.log('Uploading video file to storage...');
            await this.uploadToStorage(storagePath, file, metadata.mimeType);
            console.log('Video file uploaded successfully');
            const videoMetadata = {
                id,
                userId,
                ...metadata,
                uploadDate: new Date(),
                storagePath,
                thumbnailPath: undefined, // No thumbnail for now
            };
            console.log('Video upload process completed successfully');
            return videoMetadata;
        }
        catch (error) {
            console.error('Error in uploadVideo:', error);
            throw error;
        }
    }
    async getVideo(id) {
        const metadata = await this.getVideoMetadata(id);
        const stream = await this.downloadFromStorage(metadata.storagePath);
        return { stream, metadata };
    }
    async getVideoMetadata(id) {
        // This should be implemented by the concrete class to fetch from your database
        throw new Error('Method not implemented.');
    }
    async updateVideoMetadata(id, metadata) {
        // This should be implemented by the concrete class to update in your database
        throw new Error('Method not implemented.');
    }
    async deleteVideo(id) {
        const metadata = await this.getVideoMetadata(id);
        await this.deleteFromStorage(metadata.storagePath);
        if (metadata.thumbnailPath) {
            await this.deleteFromStorage(metadata.thumbnailPath);
        }
    }
    async getTemporaryUrl(id, expiresInSeconds = 3600) {
        const metadata = await this.getVideoMetadata(id);
        return this.getTemporaryUrlFromStorage(metadata.storagePath, expiresInSeconds);
    }
    async generateThumbnail(id) {
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
        await new Promise((resolve, reject) => {
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
    async listUserVideos(userId, options) {
        // This should be implemented by the concrete class to fetch from your database
        throw new Error('Method not implemented.');
    }
}

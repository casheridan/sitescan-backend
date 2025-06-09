import { Request, Response } from 'express';
import { VideoStorageService } from '../services/video-storage/VideoStorageService';
import { VideoMetadata } from '../services/video-storage/VideoStorageService';

export class VideoController {
  constructor(private videoService: VideoStorageService) {}

  async uploadVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No video file provided' });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const metadata = await this.videoService.uploadVideo(
        req.user.id,
        req.file.buffer,
        {
          userId: req.user.id,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          status: 'pending',
        }
      );

      res.status(201).json(metadata);
    } catch (error) {
      console.error('Error uploading video:', error);
      res.status(500).json({ error: 'Failed to upload video' });
    }
  }

  async getVideo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { stream, metadata } = await this.videoService.getVideo(id);

      // Set appropriate headers
      res.setHeader('Content-Type', metadata.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${metadata.originalName}"`);

      // Pipe the video stream to the response
      stream.pipe(res);
    } catch (error) {
      console.error('Error getting video:', error);
      res.status(500).json({ error: 'Failed to get video' });
    }
  }

  async getVideoMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const metadata = await this.videoService.getVideoMetadata(id);
      res.json(metadata);
    } catch (error) {
      console.error('Error getting video metadata:', error);
      res.status(500).json({ error: 'Failed to get video metadata' });
    }
  }

  async updateVideoMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const metadata = await this.videoService.updateVideoMetadata(id, req.body);
      res.json(metadata);
    } catch (error) {
      console.error('Error updating video metadata:', error);
      res.status(500).json({ error: 'Failed to update video metadata' });
    }
  }

  async deleteVideo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.videoService.deleteVideo(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({ error: 'Failed to delete video' });
    }
  }

  async getTemporaryUrl(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { expiresIn } = req.query;
      const url = await this.videoService.getTemporaryUrl(
        id,
        expiresIn ? parseInt(expiresIn as string) : undefined
      );
      res.json({ url });
    } catch (error) {
      console.error('Error getting temporary URL:', error);
      res.status(500).json({ error: 'Failed to get temporary URL' });
    }
  }

  async generateThumbnail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const thumbnailPath = await this.videoService.generateThumbnail(id);
      res.json({ thumbnailPath });
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      res.status(500).json({ error: 'Failed to generate thumbnail' });
    }
  }

  async listUserVideos(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { status, limit, offset } = req.query;
      const result = await this.videoService.listUserVideos(req.user.id, {
        status: status as VideoMetadata['status'],
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      console.error('Error listing user videos:', error);
      res.status(500).json({ error: 'Failed to list user videos' });
    }
  }
} 
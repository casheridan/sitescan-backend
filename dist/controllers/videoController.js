import { videoStorageService } from '../config/videoStorage.js';
import { PassThrough } from 'stream';
export class VideoController {
    constructor(videoService = videoStorageService) {
        this.videoService = videoService;
    }
    async uploadVideo(req, res) {
        try {
            console.log('Upload request received:', {
                hasFile: !!req.file,
                fileInfo: req.file ? {
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size
                } : null,
                user: req.user ? {
                    id: req.user.id,
                    email: req.user.email
                } : null,
                headers: req.headers
            });
            if (!req.file) {
                console.error('No file provided in request');
                res.status(400).json({ error: 'No video file provided' });
                return;
            }
            if (!req.user?.id) {
                console.error('No user ID in request');
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            try {
                console.log('Starting video upload to storage service...');
                const metadata = await this.videoService.uploadVideo(req.user.id, req.file.buffer, {
                    userId: req.user.id,
                    originalName: req.file.originalname,
                    mimeType: req.file.mimetype,
                    size: req.file.size,
                    status: 'pending',
                });
                console.log('Video uploaded successfully:', metadata);
                res.status(201).json(metadata);
            }
            catch (uploadError) {
                console.error('Error in videoService.uploadVideo:', {
                    error: uploadError,
                    message: uploadError instanceof Error ? uploadError.message : 'Unknown error',
                    stack: uploadError instanceof Error ? uploadError.stack : undefined
                });
                throw uploadError; // Re-throw to be caught by outer try-catch
            }
        }
        catch (error) {
            console.error('Error uploading video:', {
                error,
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            res.status(500).json({
                error: 'Failed to upload video',
                details: error instanceof Error ? error.message : 'Unknown error',
                type: error instanceof Error ? error.constructor.name : typeof error
            });
        }
    }
    async getVideo(req, res) {
        try {
            const { id } = req.params;
            console.log('Getting video:', id, {
                headers: req.headers,
                user: req.user ? { id: req.user.id } : null
            });
            if (!req.user?.id) {
                console.error('No user ID in request');
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            try {
                const { stream, metadata } = await this.videoService.getVideo(id);
                console.log('Got video stream and metadata:', {
                    mimeType: metadata.mimeType,
                    originalName: metadata.originalName,
                    size: metadata.size
                });
                // Set appropriate headers
                res.setHeader('Content-Type', metadata.mimeType);
                res.setHeader('Content-Disposition', `inline; filename="${metadata.originalName}"`);
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
                res.setHeader('Access-Control-Allow-Headers', '*');
                res.setHeader('Cache-Control', 'public, max-age=3600');
                res.setHeader('Accept-Ranges', 'bytes');
                // Handle range requests
                const range = req.headers.range;
                if (range) {
                    console.log('Handling range request:', range);
                    const parts = range.replace(/bytes=/, '').split('-');
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : metadata.size - 1;
                    const chunkSize = end - start + 1;
                    res.setHeader('Content-Range', `bytes ${start}-${end}/${metadata.size}`);
                    res.setHeader('Content-Length', chunkSize.toString());
                    res.status(206);
                    // Create a read stream for the specific range
                    const readStream = stream.pipe(new PassThrough());
                    readStream.on('error', (error) => {
                        console.error('Stream error:', error);
                        if (!res.headersSent) {
                            res.status(500).json({ error: 'Stream error' });
                        }
                    });
                    readStream.pipe(res);
                }
                else {
                    console.log('Streaming entire file');
                    // Stream the entire file
                    stream.on('error', (error) => {
                        console.error('Stream error:', error);
                        if (!res.headersSent) {
                            res.status(500).json({ error: 'Stream error' });
                        }
                    });
                    stream.on('end', () => {
                        console.log('Stream ended successfully');
                    });
                    stream.pipe(res);
                }
                console.log('Video stream piped to response');
            }
            catch (streamError) {
                console.error('Error streaming video:', streamError);
                if (!res.headersSent) {
                    res.status(500).json({
                        error: 'Failed to stream video',
                        details: streamError instanceof Error ? streamError.message : 'Unknown error'
                    });
                }
            }
        }
        catch (error) {
            console.error('Error getting video:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Failed to get video',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    }
    async getVideoMetadata(req, res) {
        try {
            const { id } = req.params;
            const metadata = await this.videoService.getVideoMetadata(id);
            res.json(metadata);
        }
        catch (error) {
            console.error('Error getting video metadata:', error);
            res.status(500).json({ error: 'Failed to get video metadata' });
        }
    }
    async updateVideoMetadata(req, res) {
        try {
            const { id } = req.params;
            const metadata = await this.videoService.updateVideoMetadata(id, req.body);
            res.json(metadata);
        }
        catch (error) {
            console.error('Error updating video metadata:', error);
            res.status(500).json({ error: 'Failed to update video metadata' });
        }
    }
    async deleteVideo(req, res) {
        try {
            const { id } = req.params;
            await this.videoService.deleteVideo(id);
            res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting video:', error);
            res.status(500).json({ error: 'Failed to delete video' });
        }
    }
    async getTemporaryUrl(req, res) {
        try {
            const { id } = req.params;
            console.log('Getting temporary URL for video:', id);
            if (!req.user?.id) {
                console.error('No user ID in request');
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const { expiresIn } = req.query;
            console.log('Expires in:', expiresIn);
            const url = await this.videoService.getTemporaryUrl(id, expiresIn ? parseInt(expiresIn) : undefined);
            console.log('Generated temporary URL successfully');
            res.json({ url });
        }
        catch (error) {
            console.error('Error generating temporary URL:', error);
            res.status(500).json({
                error: 'Failed to generate temporary URL',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async generateThumbnail(req, res) {
        try {
            const { id } = req.params;
            const thumbnailPath = await this.videoService.generateThumbnail(id);
            res.json({ thumbnailPath });
        }
        catch (error) {
            console.error('Error generating thumbnail:', error);
            res.status(500).json({ error: 'Failed to generate thumbnail' });
        }
    }
    async listUserVideos(req, res) {
        try {
            if (!req.user?.id) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const { status, limit, offset } = req.query;
            const result = await this.videoService.listUserVideos(req.user.id, {
                status: status,
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined,
            });
            res.json(result);
        }
        catch (error) {
            console.error('Error listing user videos:', error);
            res.status(500).json({ error: 'Failed to list videos' });
        }
    }
}

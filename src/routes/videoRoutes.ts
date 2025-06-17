import { Router } from 'express';
import { VideoController } from '../controllers/videoController.js';
import multer from 'multer';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

export function createVideoRoutes(videoController: VideoController) {
  // Upload a new video
  router.post(
    '/upload',
    authenticateUser,
    upload.single('video'),
    videoController.uploadVideo.bind(videoController)
  );

  // Get a video by ID
  router.get(
    '/:id',
    authenticateUser,
    videoController.getVideo.bind(videoController)
  );

  // Get video metadata
  router.get(
    '/:id/metadata',
    authenticateUser,
    videoController.getVideoMetadata.bind(videoController)
  );

  // Update video metadata
  router.patch(
    '/:id/metadata',
    authenticateUser,
    videoController.updateVideoMetadata.bind(videoController)
  );

  // Delete a video
  router.delete(
    '/:id',
    authenticateUser,
    videoController.deleteVideo.bind(videoController)
  );

  // Get a temporary URL for video access
  router.get(
    '/:id/url',
    authenticateUser,
    videoController.getTemporaryUrl.bind(videoController)
  );

  // Generate a thumbnail for the video
  router.post(
    '/:id/thumbnail',
    authenticateUser,
    videoController.generateThumbnail.bind(videoController)
  );

  // List user's videos
  router.get(
    '/',
    authenticateUser,
    videoController.listUserVideos.bind(videoController)
  );

  // Proxy endpoint for video streaming
  router.get(
    '/proxy/:id',
    authenticateUser,
    videoController.getVideo.bind(videoController)
  );

  return router;
} 
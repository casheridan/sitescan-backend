import dotenv from 'dotenv';

// Load environment variables before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createVideoRoutes } from './routes/videoRoutes.js';
import { VideoController } from './controllers/videoController.js';
import { videoStorageService } from './config/videoStorage.js';
import protectedRoutes from './routes/protected.js';

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const videoController = new VideoController(videoStorageService);
app.use('/videos', createVideoRoutes(videoController));
app.use('/protected', protectedRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

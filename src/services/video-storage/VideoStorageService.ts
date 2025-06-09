export interface VideoMetadata {
  id: string;
  userId: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadDate: Date;
  status: 'pending' | 'analyzing' | 'analyzed' | 'failed';
  analysisResult?: {
    defects: Array<{
      timestamp: number;
      type: string;
      confidence: number;
      location?: [number, number];
    }>;
    summary?: string;
  };
  storagePath: string;
  thumbnailPath?: string;
}

export interface VideoStorageConfig {
  bucket: string;
  region?: string;
  // Add other configuration options as needed
}

export interface VideoStorageService {
  // Upload a video file
  uploadVideo(
    userId: string,
    file: Buffer,
    metadata: Omit<VideoMetadata, 'id' | 'uploadDate' | 'storagePath' | 'thumbnailPath'>
  ): Promise<VideoMetadata>;

  // Get a video by ID
  getVideo(id: string): Promise<{
    stream: NodeJS.ReadableStream;
    metadata: VideoMetadata;
  }>;

  // Get video metadata
  getVideoMetadata(id: string): Promise<VideoMetadata>;

  // Update video metadata
  updateVideoMetadata(id: string, metadata: Partial<VideoMetadata>): Promise<VideoMetadata>;

  // Delete a video
  deleteVideo(id: string): Promise<void>;

  // Generate a temporary URL for video access
  getTemporaryUrl(id: string, expiresInSeconds?: number): Promise<string>;

  // Generate a thumbnail for the video
  generateThumbnail(id: string): Promise<string>;

  // List videos for a user
  listUserVideos(userId: string, options?: {
    status?: VideoMetadata['status'];
    limit?: number;
    offset?: number;
  }): Promise<{
    videos: VideoMetadata[];
    total: number;
  }>;
}
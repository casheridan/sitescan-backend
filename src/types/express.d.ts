import { User } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        [key: string]: any;
      };
      file?: Express.Multer.File;
    }
  }
} 
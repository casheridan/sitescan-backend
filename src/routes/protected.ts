import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

// Example protected route
router.get('/test', authenticateUser, (req, res) => {
  res.json({ message: 'Protected route accessed successfully' });
});

export default router; 
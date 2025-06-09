import express from 'express';
import { verifyAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyAuth, (req, res) => {
  res.json({
    message: 'You are authenticated!',
    user: req.user
  });
});

export default router;

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import protectedRoutes from './routes/protected.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.send('SiteScan backend running!');
});

app.use('/api/protected', protectedRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

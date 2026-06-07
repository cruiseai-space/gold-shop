import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error.middleware.js';
import { ApiError } from './utils/ApiError.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Root API
app.get('/api', (req, res) => {
  res.json({ message: 'Swarna Ledger API v1' });
});

// 404 handler
app.use((req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Route ${req.originalUrl} not found`));
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

export { app };

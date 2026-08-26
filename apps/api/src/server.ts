import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getApiConfig } from '@rt-cfas/config';
import { healthRouter } from './routes/health';
import { investigationsRouter } from './routes/investigations';

dotenv.config();
const config = getApiConfig();

const app = express();

// Middlewares
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());

// Routes
app.use('/', healthRouter);
app.use('/api/investigations', investigationsRouter);

// Start server
app.listen(config.port, () => {
  console.log(`[apps/api] Server running on http://localhost:${config.port} (${config.nodeEnv})`);
});

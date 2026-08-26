import { Router, Request, Response } from 'express';
import { HealthResponse } from '@rt-cfas/types';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response<HealthResponse>) => {
  res.status(200).json({
    status: 'ok',
    service: 'apps/api',
    timestamp: new Date().toISOString(),
  });
});

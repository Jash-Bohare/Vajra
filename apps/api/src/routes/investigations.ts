import { Router, Request, Response } from 'express';
import { CreateInvestigationRequest, CreateInvestigationResponse } from '@rt-cfas/types';
import { isValidEthereumAddress } from '@rt-cfas/blockchain';

export const investigationsRouter = Router();

/**
 * POST /api/investigations (Doc 03 Section 6)
 * Creates a new investigation job
 */
investigationsRouter.post(
  '/',
  (req: Request<{}, {}, CreateInvestigationRequest>, res: Response<CreateInvestigationResponse | { error: string }>) => {
    const { walletAddress } = req.body;

    if (!walletAddress || !isValidEthereumAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid or missing Ethereum wallet address format.' });
    }

    const mockId = `inv_${Date.now()}`;
    return res.status(201).json({
      investigationId: mockId,
      status: 'pending',
    });
  }
);

/**
 * GET /api/investigations/:id (Doc 03 Section 6)
 * Retrieves investigation status, graph, and risk details
 */
investigationsRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  return res.status(200).json({
    id,
    status: 'pending',
    walletAddress: '0x0000000000000000000000000000000000000000',
    terminalType: 'inconclusive',
    createdAt: new Date().toISOString(),
  });
});

/**
 * GET /api/investigations/:id/report (Doc 03 Section 6)
 * PDF Report stream stub
 */
investigationsRouter.get('/:id/report', (req: Request, res: Response) => {
  return res.status(501).json({ error: 'Report generation will be implemented in Phase 5.' });
});

/**
 * GET /api/investigations (Doc 03 Section 6)
 * Session history list stub
 */
investigationsRouter.get('/', (req: Request, res: Response) => {
  return res.status(200).json([]);
});

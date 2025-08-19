import { Router, Request, Response } from 'express';
import { simulationService } from '../services/simulationService';
import { rpcService } from '../services/RPCService';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { SimulationRequest } from '../types/simulation';

const router = Router();

/**
 * @swagger
 * /api/trace/tx:
 *   get:
 *     summary: Trace a transaction by hash
 *     tags: [Transaction Trace]
 *     parameters:
 *       - in: query
 *         name: txHash
 *         required: true
 *         schema:
 *           type: string
 *         description: The hash of the transaction to trace
 *     responses:
 *       200:
 *         description: Transaction trace successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   type: object
 *       400:
 *         description: Missing or invalid txHash parameter
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Internal server error
 */
router.get('/tx', asyncHandler(async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const txHash = req.query.txHash as string;

  if (!txHash) {
    return res.status(400).json({ error: 'txHash query parameter is required' });
  }

  logger.info('Trace request received', {
    requestId,
    txHash,
  });

  try {
    const txData = await rpcService.getTransactionByHash(txHash);

    if (!txData) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Transform transaction into simulation request format
    const traceRequest: SimulationRequest = {
      from: txData.from,
      to: txData.to,
      input: txData.input || '0x',
      value: txData.value || '0x0',
      gas: txData.gas || '0x0',
      gasPrice: txData.gasPrice || '0x0',
      blockNumber: txData.blockNumber || 'latest',
    };

    // Execute simulation without state overrides
    const response = await simulationService.traceTransaction(traceRequest, txHash);

    logger.info('Trace request completed', {
      requestId,
      txHash,
    });

    res.json(response);
  } catch (error: any) {
    logger.error('Trace request failed', {
      requestId,
      txHash,
      error: error.message,
    });

    res.status(500).json({
      error: 'Failed to trace transaction',
      message: error.message,
    });
  }
}));

export default router;

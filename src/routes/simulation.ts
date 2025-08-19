import { Router, Request, Response } from 'express';
import { simulationService } from '../services/simulationService';
import { validateSimulationRequest } from '../utils/validation';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { SimulationRequest } from '../types/simulation';

const router = Router();

/**
 * POST /api/simulate
 * Simulate a transaction
 */
router.post('/simulate', asyncHandler(async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  logger.info('Simulation request received', {
    requestId,
    body: req.body,
  });

  // Validate request body
  const validatedRequest = validateSimulationRequest(req.body as any);

  // Execute simulation
  const response = await simulationService.simulateTransaction(validatedRequest as SimulationRequest);

  logger.info('Simulation request completed');

  res.json(response);
}));

/**
 * GET /api/simulation/health
 * Health check endpoint
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  logger.debug('Health check request', { requestId });

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'simulation-engine',
    version: process.env.npm_package_version || '1.0.0',
  });
}));

export default router;

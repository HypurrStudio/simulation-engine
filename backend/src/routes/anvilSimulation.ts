import { Router, Request, Response } from 'express';
import { SimulationRequest } from '../types/simulation';
import anvilSimulationService from '../services/anvilSimulationService';
import { validateSimulationRequest } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v2/simulate
 * Simulate a transaction using Anvil forked nodes
 */
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    // Validate request
    const validationResult = validateSimulationRequest(req.body);
    // if (!validationResult.isValid) {
    //   return res.status(400).json({
    //     error: 'Invalid request',
    //     details: validationResult.errors,
    //   });
    // }

    const simulationRequest: SimulationRequest = req.body;
    console.log(simulationRequest);

    // Execute simulation
    const result = await anvilSimulationService.simulateTransaction(simulationRequest);

    logger.info('Anvil simulation completed successfully', {
      from: simulationRequest.from,
      to: simulationRequest.to,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Anvil simulation route error', {
      error: error?.message,
      stack: error?.stack,
    });

    res.status(500).json({
      error: 'Simulation failed',
      message: error?.message || 'Unknown error occurred',
    });
  }
});

/**
 * GET /api/v2/health
 * Health check for Anvil simulation service
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await anvilSimulationService.healthCheck();
    
    if (isHealthy) {
      res.json({
        status: 'healthy',
        service: 'anvil-simulation',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        service: 'anvil-simulation',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    logger.error('Anvil health check failed', { error: error?.message });
    res.status(503).json({
      status: 'unhealthy',
      service: 'anvil-simulation',
      error: error?.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v2/stats
 * Get Anvil instance statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = anvilSimulationService.getAnvilStats();
    
    res.json({
      service: 'anvil-simulation',
      timestamp: new Date().toISOString(),
      stats,
    });
  } catch (error: any) {
    logger.error('Failed to get Anvil stats', { error: error?.message });
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error?.message,
    });
  }
});

export default router;

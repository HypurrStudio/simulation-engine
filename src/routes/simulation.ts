import { Router, Request, Response } from 'express';
import { simulationService } from '../services/simulationService';
import { validateBundleSimulationRequest, validateSimulationRequest } from '../utils/validation';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { BundleSimulationRequest, SimulationRequest } from '../types/simulation';

const router = Router();

/**
 * @swagger
 * /api/simulate:
 *   post:
 *     summary: Simulate an Ethereum transaction
 *     tags: [Simulation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               from:
 *                 type: string
 *                 description: The address initiating the transaction
 *               to:
 *                 type: string
 *                 description: The recipient address of the transaction
 *               input:
 *                 type: string
 *                 description: The transaction input data in hex format
 *               value:
 *                 type: string
 *                 description: The amount of ETH to send in wei
 *               gas:
 *                 type: string
 *                 description: The gas limit for the transaction
 *               gasPrice:
 *                 type: string
 *                 description: The gas price in wei
 *               stateObjects:
 *                 type: object
 *                 description: State overrides for specific addresses
 *                 additionalProperties:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: string
 *                       description: Account balance in wei
 *                     storage:
 *                       type: object
 *                       description: Storage slot overrides
 *                       additionalProperties:
 *                         type: string
 *               generateAccessList:
 *                 type: boolean
 *                 description: Whether to generate an access list for the transaction
 *               blockHeader:
 *                 type: object
 *                 properties:
 *                   number:
 *                     type: string
 *                     description: Block number
 *                   timestamp:
 *                     type: string
 *                     description: Block timestamp
 *               blockNumber:
 *                 type: string
 *                 description: Block number to simulate against
 *               transactionIndex:
 *                 type: integer
 *                 description: Index of the transaction in the block
 *               accessList:
 *                 type: array
 *                 description: Pre-computed access list for the transaction
 *                 items:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       description: The address being accessed
 *                     storageKeys:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Storage slot keys being accessed
 *     responses:
 *       200:
 *         description: Transaction simulation successful
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
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
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
 * @swagger
 * /api/bundle/simulate:
 *   post:
 *     summary: Simulate a bundle of Ethereum transactions
 *     tags: [Simulation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactions
 *               - mode
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [atomic, parallel]
 *                 description: |
 *                   Simulation mode:
 *                   - `atomic`: all transactions execute as one atomic bundle (state changes only applied if all succeed).
 *                   - `parallel`: each transaction is simulated independently with the same starting state.
 *               transactions:
 *                 type: array
 *                 description: List of transactions to simulate
 *                 items:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                       description: The address initiating the transaction
 *                     to:
 *                       type: string
 *                       description: The recipient address of the transaction
 *                     input:
 *                       type: string
 *                       description: The transaction input data in hex format
 *                     value:
 *                       type: string
 *                       description: The amount of ETH to send in wei
 *                     gas:
 *                       type: string
 *                       description: The gas limit for the transaction
 *                     gasPrice:
 *                       type: string
 *                       description: The gas price in wei
 *                     accessList:
 *                       type: array
 *                       description: Pre-computed access list for the transaction
 *                       items:
 *                         type: object
 *                         properties:
 *                           address:
 *                             type: string
 *                             description: The address being accessed
 *                           storageKeys:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Storage slot keys being accessed
 *               stateObjects:
 *                 type: object
 *                 description: State overrides for specific addresses
 *                 additionalProperties:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: string
 *                       description: Account balance in wei
 *                     storage:
 *                       type: object
 *                       description: Storage slot overrides
 *                       additionalProperties:
 *                         type: string
 *               generateAccessList:
 *                 type: boolean
 *                 description: Whether to generate an access list for the transactions
 *               blockHeader:
 *                 type: object
 *                 properties:
 *                   number:
 *                     type: string
 *                     description: Block number
 *                   timestamp:
 *                     type: string
 *                     description: Block timestamp
 *               blockNumber:
 *                 type: string
 *                 description: Block number to simulate against
 *     responses:
 *       200:
 *         description: Bundle simulation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   description: Simulation responses for each transaction
 *                   items:
 *                     $ref: '#/components/schemas/SimulationResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.post('/bundle/simulate', asyncHandler(async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';

  logger.info('Bundle simulation request received', {
    requestId,
    body: req.body,
  });

  // Validate request body (now includes `mode`)
  const validatedRequest = validateBundleSimulationRequest(req.body as any);

  // Execute bundle simulation with mode (atomic vs parallel)
  const responses = await simulationService.simulateBundleTransactions(
    validatedRequest as BundleSimulationRequest
  );

  logger.info('Bundle simulation request completed');

  res.json(responses);
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

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import config from './config';
import logger, { stream } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import simulationRoutes from './routes/simulation';
import anvilSimulationRoutes from './routes/anvilSimulation';
import { rpcService } from './services/RPCService';
import anvilManager from './services/anvilManager';

/**
 * Application Class
 * Main application setup and configuration
 */
class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize all middleware
   */
  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true,
    }));

    // Compression middleware
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: config.request.maxSize }));
    this.app.use(express.urlencoded({ extended: true, limit: config.request.maxSize }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        error: {
          message: 'Too many requests from this IP, please try again later.',
          statusCode: 429,
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Logging middleware
    this.app.use(morgan('combined', { stream }));

    // Request ID middleware
    this.app.use((req, res, next) => {
      if (!req.headers['x-request-id']) {
        req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      next();
    });
  }

  /**
   * Initialize all routes
   */
  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        message: 'Simulation Engine is running.',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // API routes
    this.app.use('/api', simulationRoutes);
    this.app.use('/api/v2', anvilSimulationRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'HyperEVM Transaction Simulation Engine',
        version: process.env.npm_package_version || '1.0.0',
        endpoints: {
          health: '/health',
          simulation: '/api',
          anvilSimulation: '/api/v2',
        },
      });
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler (must be before error handler)
    this.app.use(notFoundHandler);

    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Start the application
   */
  public async start(): Promise<void> {
    try {
      // Health check RPC connection
      const rpcHealthy = await rpcService.healthCheck();
      if (!rpcHealthy) {
        logger.error('RPC endpoint is not healthy');
        process.exit(1);
      }

      // Start server
      this.app.listen(config.port, () => {
        logger.info('Simulation Engine started successfully', {
          port: config.port,
          nodeEnv: config.nodeEnv,
          rpcUrl: config.hyperEvmRpcUrls,
        });
      });
    } catch (error: any) {
      logger.error('Failed to start application', { error: error.message });
      process.exit(1);
    }
  }
}

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  try {
    // Clean up Anvil instances
    await anvilManager.cleanupAll();
    logger.info('Anvil instances cleaned up');
  } catch (error: any) {
    logger.error('Error during graceful shutdown', { error: error.message });
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Create and start the application
const app = new App();
app.start().catch((error) => {
  logger.error('Failed to start application', { error: error.message });
  process.exit(1);
});

export default app;

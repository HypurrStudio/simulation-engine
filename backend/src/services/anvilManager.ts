import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from '../utils/logger';
import { SimulationError } from '../utils/errors';

export interface AnvilInstance {
  id: string;
  port: number;
  process: ChildProcess;
  rpcUrl: string;
  isReady: boolean;
  createdAt: Date;
  lastUsed: Date;
  forkUrl: string;
}

export interface AnvilInstanceConfig {
  port: number;
  forkUrl: string;
  chainId?: number;
  blockTime?: number;
  gasLimit?: number;
}

/**
 * Anvil Manager Service
 * Manages spawning, lifecycle, and cleanup of Anvil instances
 */
export class AnvilManager extends EventEmitter {
  private instances: Map<string, AnvilInstance> = new Map();
  private availablePorts: Set<number> = new Set();
  private portAllocation: Map<number, string> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializePortPool();
    this.startCleanupInterval();
  }

  /**
   * Initialize the pool of available ports
   */
  private initializePortPool(): void {
    for (let port = config.anvil.portStart; port <= config.anvil.portEnd; port++) {
      this.availablePorts.add(port);
    }
    logger.info('Anvil port pool initialized', {
      portRange: `${config.anvil.portStart}-${config.anvil.portEnd}`,
      totalPorts: this.availablePorts.size,
    });
  }

  /**
   * Get an available port from the pool
   */
  private getAvailablePort(): number | null {
    const port = this.availablePorts.values().next().value;
    if (port) {
      this.availablePorts.delete(port);
      return port;
    }
    return null;
  }

  /**
   * Release a port back to the pool
   */
  private releasePort(port: number): void {
    this.availablePorts.add(port);
    this.portAllocation.delete(port);
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close();
        resolve(true);
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Spawn a new Anvil instance
   */
  async spawnInstance(instanceConfig: AnvilInstanceConfig): Promise<AnvilInstance> {
    const instanceId = uuidv4();
    const { port, forkUrl, chainId = config.hyperEvmChainId, blockTime = config.anvil.blockTime, gasLimit = config.anvil.gasLimit } = instanceConfig;

    logger.info('Spawning Anvil instance', {
      instanceId,
      port,
      forkUrl,
      chainId,
    });

    // Check if we've reached the maximum number of instances
    if (this.instances.size >= config.anvil.maxInstances) {
      throw new SimulationError(`Maximum number of Anvil instances (${config.anvil.maxInstances}) reached`);
    }

    // Verify port is actually available
    const portAvailable = await this.isPortAvailable(port);
    if (!portAvailable) {
      throw new SimulationError(`Port ${port} is not available`);
    }

    // Build Anvil command arguments
    const args = [
      '--port', port.toString(),
      '--fork-url', forkUrl,
      '--chain-id', chainId.toString(),
      '--gas-limit', gasLimit.toString(),
      '--no-mining',
      '--no-cors',
      '--auto-impersonate',
      '--steps-tracing',
      '--host', '127.0.0.1',
    ];

    // Spawn Anvil process
    const process = spawn('anvil', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    const instance: AnvilInstance = {
      id: instanceId,
      port,
      process,
      rpcUrl: `http://127.0.0.1:${port}`,
      isReady: false,
      createdAt: new Date(),
      lastUsed: new Date(),
      forkUrl,
    };

    // console.log(instance);

    // Set up process event handlers
    process.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Listening on') || output.includes('RPC Server started')) {
        instance.isReady = true;
        this.emit('instanceReady', instanceId);
        logger.info('Anvil instance ready', { instanceId, port });
      }
    });

    process.stderr?.on('data', (data) => {
      const error = data.toString();
      if (error.includes('error') || error.includes('Error')) {
        logger.error('Anvil instance error', { instanceId, port, error });
      }
    });

    process.on('exit', (code, signal) => {
      logger.info('Anvil instance exited', { instanceId, port, code, signal });
      this.cleanupInstance(instanceId);
    });

    process.on('error', (error) => {
      logger.error('Anvil process error', { instanceId, port, error: error.message });
      this.cleanupInstance(instanceId);
    });

    // Wait for instance to be ready
    await this.waitForInstanceReady(instanceId);

    // Store instance
    this.instances.set(instanceId, instance);
    this.portAllocation.set(port, instanceId);

    logger.info('Anvil instance spawned successfully', {
      instanceId,
      port,
      totalInstances: this.instances.size,
    });

    return instance;
  }

  /**
   * Wait for an Anvil instance to be ready
   */
  private async waitForInstanceReady(instanceId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new SimulationError(`Anvil instance startup timeout after ${config.anvil.startupTimeoutMs}ms`));
      }, config.anvil.startupTimeoutMs);

      const onReady = (readyInstanceId: string) => {
        if (readyInstanceId === instanceId) {
          clearTimeout(timeout);
          this.off('instanceReady', onReady);
          resolve();
        }
      };

      this.on('instanceReady', onReady);
    });
  }

  /**
   * Create a new Anvil instance for each simulation (no reuse)
   */
  async createInstance(forkUrl: string): Promise<AnvilInstance> {
    const port = this.getAvailablePort();
    console.log("PORT: ", port);
    if (!port) {
      throw new SimulationError('No available ports for new Anvil instance');
    }

    return this.spawnInstance({ port, forkUrl });
  }

  /**
   * Create an RPC client for an Anvil instance
   */
  createRPCClient(instance: AnvilInstance): AxiosInstance {
    return axios.create({
      baseURL: instance.rpcUrl,
      timeout: config.request.timeoutMs,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Clean up a specific Anvil instance
   */
  async cleanupInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return;
    }

    logger.info('Cleaning up Anvil instance', {
      instanceId,
      port: instance.port,
    });

    // Kill the process
    if (!instance.process.killed) {
      instance.process.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!instance.process.killed) {
          instance.process.kill('SIGKILL');
        }
      }, 5000);
    }

    // Release port
    this.releasePort(instance.port);

    // Remove from instances map
    this.instances.delete(instanceId);

    logger.info('Anvil instance cleaned up', {
      instanceId,
      port: instance.port,
      remainingInstances: this.instances.size,
    });
  }

  /**
   * Start cleanup interval for idle instances (disabled)
   */
  private startCleanupInterval(): void {
    // No cleanup interval needed since we don't reuse instances
    // Each simulation gets a fresh instance that's cleaned up immediately
  }

  /**
   * Clean up idle instances (disabled since we don't reuse instances)
   */
  private cleanupIdleInstances(): void {
    // No idle cleanup needed since we create fresh instances for each simulation
    // and clean them up immediately after use
  }

  /**
   * Get statistics about Anvil instances
   */
  getStats(): {
    totalInstances: number;
    availablePorts: number;
    totalPorts: number;
    instances: Array<{
      id: string;
      port: number;
      isReady: boolean;
      createdAt: Date;
      lastUsed: Date;
      forkUrl: string;
    }>;
  } {
    return {
      totalInstances: this.instances.size,
      availablePorts: this.availablePorts.size,
      totalPorts: config.anvil.portEnd - config.anvil.portStart + 1,
      instances: Array.from(this.instances.values()).map(instance => ({
        id: instance.id,
        port: instance.port,
        isReady: instance.isReady,
        createdAt: instance.createdAt,
        lastUsed: instance.lastUsed,
        forkUrl: instance.forkUrl,
      })),
    };
  }

  /**
   * Clean up all instances (for shutdown)
   */
  async cleanupAll(): Promise<void> {
    logger.info('Cleaning up all Anvil instances');
    
    const cleanupPromises = Array.from(this.instances.keys()).map(instanceId =>
      this.cleanupInstance(instanceId)
    );

    await Promise.all(cleanupPromises);

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    logger.info('All Anvil instances cleaned up');
  }
}

// Export singleton instance
export const anvilManager = new AnvilManager();
export default anvilManager;

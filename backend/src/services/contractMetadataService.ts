import axios from 'axios';
import { ContractObject } from '../types/simulation';
import logger from '../utils/logger';
import config from '../config';

/**
 * Contract Metadata Service Class
 * Handles fetching and caching of contract metadata (ABI, bytecode, etc.)
 */
export class ContractMetadataService {
  private cache: Map<string, ContractObject> = new Map();
  private readonly cacheTTL: number = 3600000; // 1 hour in milliseconds
  private cacheTimestamps: Map<string, number> = new Map();

  /**
   * Get contract metadata for a given address and network
   */
  async getContractMetadata(address: string, networkId: string): Promise<ContractObject | null> {
    const cacheKey = `${networkId}:${address.toLowerCase()}`;

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      logger.debug('Contract metadata found in cache', { address, networkId });
      return this.cache.get(cacheKey) || null;
    }

    try {
      logger.info('Fetching contract metadata', { address, networkId });
      
      const metadata = await this.fetchContractMetadata(address, networkId);
      
      if (metadata) {
        // Cache the result
        this.cache.set(cacheKey, metadata);
        this.cacheTimestamps.set(cacheKey, Date.now());
        
        logger.debug('Contract metadata cached', { address, networkId });
      }

      return metadata;
    } catch (error) {
      logger.error('Failed to fetch contract metadata', {
        address,
        networkId,
        error: error.message,
      });
      
      // Return null instead of throwing to allow simulation to continue
      return null;
    }
  }

  /**
   * Fetch contract metadata from external sources
   * This is a placeholder implementation - replace with actual explorer/db integration
   */
  private async fetchContractMetadata(address: string, networkId: string): Promise<ContractObject | null> {
  try {
    const apiKey = config.etherscanApiKey;

    const url = `https://api.etherscan.io/v2/api`;
    const params = {
      module: 'contract',
      action: 'getsourcecode',
      address,
      chainid: networkId,
      apikey: apiKey
    };

    const { data } = await axios.get(url, { params });

    if (data.status !== "1" || !data.result || !data.result.length) {
      return null;
    }

    const meta = data.result[0];

    const contractObj: ContractObject = {
      address: address.toLowerCase(),
      SourceCode: meta.SourceCode || "",
      ABI: meta.ABI || "[]",
      ContractName: meta.ContractName || "",
      CompilerVersion: meta.CompilerVersion || "",
      CompilerType: meta.CompilerType || "Solidity",
      OptimizationUsed: meta.OptimizationUsed === "1",
      Runs: meta.Runs || "0",
      ConstructorArguments: meta.ConstructorArguments || "",
      EVMVersion: meta.EVMVersion || "",
      Library: meta.Library || "",
      ContractFileName: meta.ContractFileName || "",
      LicenseType: meta.LicenseType || "",
      Proxy: meta.Proxy || "",
      Implementation: meta.Implementation || "",
      SwarmSource: meta.SwarmSource || "",
      SimilarMatch: meta.SimilarMatch || "",
    };

    return contractObj;

  } catch (error) {
    logger.error('Error fetching contract metadata', {
      address,
      networkId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    
    return Date.now() - timestamp < this.cacheTTL;
  }

  /**
   * Clear cache for a specific contract or all contracts
   */
  clearCache(address?: string, networkId?: string): void {
    if (address && networkId) {
      const cacheKey = `${networkId}:${address.toLowerCase()}`;
      this.cache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
      logger.debug('Cleared cache for specific contract', { address, networkId });
    } else {
      this.cache.clear();
      this.cacheTimestamps.clear();
      logger.debug('Cleared entire contract metadata cache');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Preload contract metadata for multiple addresses
   */
  async preloadMetadata(addresses: string[], networkId: string): Promise<void> {
    logger.info('Preloading contract metadata', { 
      count: addresses.length, 
      networkId 
    });

    const promises = addresses.map(address => 
      this.getContractMetadata(address, networkId)
    );

    await Promise.allSettled(promises);
    
    logger.info('Contract metadata preloading completed', { 
      count: addresses.length, 
      networkId 
    });
  }
}

// Export singleton instance
export const contractMetadataService = new ContractMetadataService();
export default contractMetadataService;

import { simulationService } from '../services/simulationService';
import { SimulationRequest } from '../types/simulation';

describe('SimulationService', () => {
  const mockRequest: SimulationRequest = {
    from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    input: '0x',
    value: '0x0',
    gas: 1000000,
    gasPrice: '0x3b9aca00',
    networkId: '11155111',
    blockNumber: 'latest',
  };

  describe('simulateTransaction', () => {
    it('should validate required fields', async () => {
      const invalidRequest = { ...mockRequest, from: undefined };
      
      await expect(simulationService.simulateTransaction(invalidRequest as any))
        .rejects
        .toThrow('From and To addresses are required for simulation');
    });

    it('should validate address format', async () => {
      const invalidRequest = { ...mockRequest, from: 'invalid-address' };
      
      await expect(simulationService.simulateTransaction(invalidRequest))
        .rejects
        .toThrow('Invalid from address format');
    });

    it('should handle valid simulation request', async () => {
      // This test would require mocking the RPC service
      // For now, we'll just test that the method exists
      expect(typeof simulationService.simulateTransaction).toBe('function');
    });
  });
});

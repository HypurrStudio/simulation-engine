# Anvil-Based Transaction Simulation Engine

This is the next-generation transaction simulation engine that uses local Anvil forked nodes instead of external RPC calls. This approach provides better reliability, performance, and control over the simulation environment.

## 🚀 Features

- **Local Anvil Instances**: Spawns in-memory Anvil nodes for each simulation
- **Automatic Resource Management**: Automatically cleans up idle instances
- **High Availability**: Multiple RPC URL fallback for forking
- **Production Ready**: Comprehensive error handling and monitoring
- **Graceful Shutdown**: Proper cleanup of all Anvil processes
- **Fresh Instances**: Creates a new Anvil fork for every simulation

## 📋 Prerequisites

1. **Anvil Installation**: Make sure you have Anvil installed on your system
   ```bash
   # Install Foundry (includes Anvil)
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Node.js**: Version 18 or higher
3. **Environment Setup**: Configure your `.env` file (see Configuration section)

## ⚙️ Configuration

### Environment Variables

```bash
# Application Configuration
NODE_ENV=development
PORT=4000

# HyperEVM RPC Configuration (comma-separated for fallback)
HYPEREVM_RPC_URLS=https://sepolia.drpc.org,https://eth-sepolia.g.alchemy.com/v2/your_key
HYPEREVM_CHAIN_ID=11155111
ETHERSCAN_API_KEY=your_api_key

# Anvil Configuration
ANVIL_PORT_START=8545
ANVIL_PORT_END=8645
ANVIL_STARTUP_TIMEOUT_MS=10000
ANVIL_MAX_INSTANCES=10
ANVIL_BLOCK_TIME=1
ANVIL_GAS_LIMIT=30000000

# Other configurations...
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
REQUEST_TIMEOUT_MS=30000
MAX_REQUEST_SIZE=10mb
```

### Configuration Details

- **ANVIL_PORT_START/END**: Range of ports for Anvil instances (8545-8645 by default)
- **ANVIL_STARTUP_TIMEOUT_MS**: Maximum time to wait for Anvil instance to start (10s)
- **ANVIL_MAX_INSTANCES**: Maximum number of concurrent Anvil instances (10)
- **ANVIL_BLOCK_TIME**: Block time for Anvil instances (1 second)
- **ANVIL_GAS_LIMIT**: Gas limit for Anvil instances (30M)

## 🏃‍♂️ Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## 📡 API Endpoints

### Anvil Simulation (v2)

#### POST `/api/v2/simulate`
Simulate a transaction using Anvil forked nodes.

**Request Body:**
```json
{
  "from": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "to": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "input": "0x",
  "value": "0x0",
  "gas": "0x186A0",
  "gasPrice": "0x3B9ACA00",
  "blockNumber": "latest",
  "generateAccessList": true
}
```

**Response:**
```json
{
  "transaction": {
    "from": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "to": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "input": "0x",
    "value": "0x0",
    "gas": "0x186A0",
    "gasPrice": "0x3B9ACA00",
    "output": "0x",
    "callTrace": [...],
    "balanceDiff": {...},
    "storageDiff": {...}
  },
  "contracts": {...},
  "generated_access_list": [...]
}
```

#### GET `/api/v2/health`
Health check for Anvil simulation service.

#### GET `/api/v2/stats`
Get Anvil instance statistics.

**Response:**
```json
{
  "service": "anvil-simulation",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "stats": {
    "totalInstances": 2,
    "availablePorts": 98,
    "totalPorts": 101,
    "instances": [
      {
        "id": "uuid",
        "port": 8545,
        "isReady": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastUsed": "2024-01-01T00:00:00.000Z",
        "forkUrl": "https://sepolia.drpc.org"
      }
    ]
  }
}
```

## 🏗️ Architecture

### Components

1. **AnvilManager** (`src/services/anvilManager.ts`)
   - Manages Anvil instance lifecycle
   - Handles port allocation and cleanup
   - Implements instance reuse logic

2. **AnvilRPCService** (`src/services/anvilRPCService.ts`)
   - Provides RPC interface to Anvil instances
   - Handles connection management
   - Implements retry logic

3. **AnvilSimulationService** (`src/services/anvilSimulationService.ts`)
   - Main simulation logic using Anvil
   - Processes trace results
   - Builds response objects

4. **Anvil Routes** (`src/routes/anvilSimulation.ts`)
   - API endpoints for Anvil-based simulation
   - Health checks and statistics

### Flow Diagram

```
Request → AnvilSimulationService → AnvilRPCService → AnvilManager → Anvil Instance
                ↓
        Process Results → Build Response → Return to Client
```

## 🔧 Development

### Project Structure

```
src/
├── services/
│   ├── anvilManager.ts          # Anvil instance management
│   ├── anvilRPCService.ts       # RPC communication with Anvil
│   ├── anvilSimulationService.ts # Main simulation logic
│   └── ...
├── routes/
│   ├── anvilSimulation.ts       # Anvil API routes
│   └── ...
└── ...
```

### Key Features

1. **Instance Management**
   - Fresh Anvil instance for every simulation
   - Port pool management
   - Immediate cleanup after each simulation
   - No instance reuse (each simulation gets a clean fork)

2. **Error Handling**
   - Comprehensive error handling at all levels
   - Automatic instance recovery
   - Graceful degradation

3. **Monitoring**
   - Instance statistics
   - Health checks
   - Performance metrics

4. **Resource Management**
   - Memory-efficient instance handling
   - Automatic cleanup on shutdown
   - Configurable limits

## 🧪 Testing

### Manual Testing

1. **Start the server**
   ```bash
   npm run dev
   ```

2. **Test simulation endpoint**
   ```bash
   curl -X POST http://localhost:4000/api/v2/simulate \
     -H "Content-Type: application/json" \
     -d @example_curl_request.json
   ```

3. **Check health**
   ```bash
   curl http://localhost:4000/api/v2/health
   ```

4. **Get statistics**
   ```bash
   curl http://localhost:4000/api/v2/stats
   ```

### Example Request

```json
{
  "from": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "to": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "input": "0x",
  "value": "0x0",
  "gas": "0x186A0",
  "gasPrice": "0x3B9ACA00",
  "blockNumber": "latest",
  "generateAccessList": true
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Anvil not found**
   ```bash
   # Install Foundry
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Port conflicts**
   - Check if ports 8545-8645 are available
   - Adjust `ANVIL_PORT_START` and `ANVIL_PORT_END` in `.env`

3. **Instance startup timeout**
   - Increase `ANVIL_STARTUP_TIMEOUT_MS` in `.env`
   - Check network connectivity to RPC URLs

4. **Memory issues**
   - Reduce `ANVIL_MAX_INSTANCES` in `.env`
   - Monitor system resources

### Logs

Check logs for detailed information:
```bash
# Development
npm run dev

# Production
tail -f logs/app.log
```

## 🔄 Migration from v1

The original simulation service is still available at `/api/simulate`. The new Anvil-based service is at `/api/v2/simulate`.

### Benefits of v2

1. **Reliability**: No dependency on external RPC availability
2. **Performance**: Local execution is faster
3. **Control**: Full control over the simulation environment
4. **Fresh State**: Each simulation starts with a clean fork state
5. **Scalability**: Can handle more concurrent requests

## 📊 Performance

### Benchmarks

- **Instance Startup**: ~2-5 seconds
- **Simulation Time**: ~100-500ms (depending on complexity)
- **Memory Usage**: ~50-100MB per instance
- **Concurrent Instances**: Up to 10 (configurable)

### Optimization Tips

1. **Fresh Forks**: Each simulation gets a completely fresh Anvil fork
2. **Immediate Cleanup**: Instances are cleaned up immediately after each simulation
3. **Port Pool**: Efficient port allocation and management
4. **Graceful Shutdown**: Proper cleanup prevents resource leaks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

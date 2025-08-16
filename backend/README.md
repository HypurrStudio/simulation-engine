# HyperEVM Transaction Simulation Engine

A production-grade backend service for simulating Ethereum transactions on HyperEVM networks.

## 🚀 Next-Generation Anvil-Based Simulation

This project now includes a next-generation simulation engine that uses local Anvil forked nodes instead of external RPC calls. This provides better reliability, performance, and control over the simulation environment.

**New Features:**
- **Local Anvil Instances**: Spawns in-memory Anvil nodes for each simulation
- **Automatic Resource Management**: Automatically cleans up idle instances
- **High Availability**: Multiple RPC URL fallback for forking
- **Instance Reuse**: Reuses instances with the same fork URL for efficiency

**API Endpoints:**
- `POST /api/v2/simulate` - Anvil-based simulation
- `GET /api/v2/health` - Anvil service health check
- `GET /api/v2/stats` - Anvil instance statistics

For detailed documentation on the Anvil-based system, see [README_ANVIL.md](./README_ANVIL.md).

## Features

- **Transaction Simulation**: Simulate transactions with detailed call traces
- **Contract Metadata**: Fetch and cache contract ABIs and metadata
- **Access List Generation**: Generate EIP-2930 access lists for transactions
- **Production Ready**: Built with enterprise-grade patterns and practices
- **Comprehensive Logging**: Structured logging with Winston
- **Error Handling**: Custom error classes with proper HTTP status codes
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Security**: Helmet.js security headers and input validation
- **Monitoring**: Health checks and metrics endpoints

## Architecture

The application follows a clean, scalable architecture with the following components:

### Core Services

- **SimulationService**: Main simulation logic and response formatting
- **RPCService**: Blockchain RPC communication with retry logic
- **ContractMetadataService**: Contract metadata fetching and caching

### Utilities

- **Logger**: Centralized logging with Winston
- **Error Handling**: Custom error classes and middleware
- **Validation**: Request validation using Joi
- **Configuration**: Environment-based configuration management

### Middleware

- **Security**: Helmet.js, CORS, rate limiting
- **Logging**: Morgan HTTP request logging
- **Error Handling**: Global error handler and 404 handler

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Build the application
npm run build

# Start the application
npm start
```

## Environment Variables

Create a `.env` file with the following variables:

```env
NODE_ENV=development
PORT=4000

# HyperEVM RPC Configuration (comma-separated for fallback)
HYPEREVM_RPC_URLS=https://sepolia.drpc.org,https://eth-sepolia.g.alchemy.com/v2/your_key
HYPEREVM_CHAIN_ID=11155111
ETHERSCAN_API_KEY=your_api_key

# Anvil Configuration (for v2 simulation)
ANVIL_PORT_START=8545
ANVIL_PORT_END=8645
ANVIL_STARTUP_TIMEOUT_MS=10000
ANVIL_MAX_INSTANCES=10
ANVIL_BLOCK_TIME=1
ANVIL_GAS_LIMIT=30000000

# Other configurations
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=*
REQUEST_TIMEOUT_MS=30000
MAX_REQUEST_SIZE=10mb
```

## API Endpoints

### Health Check

```http
GET /health
```

Returns the health status of the service.

### Transaction Simulation

```http
POST /api/simulation/simulate
Content-Type: application/json

{
  "from": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "to": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "input": "0x",
  "value": "0x0",
  "gas": 1000000,
  "gasPrice": "0x3b9aca00",
  "networkId": "11155111",
  "blockNumber": "latest",
  "generateAccessList": true
}
```

### Simulation Health Check

```http
GET /api/simulation/health
```

Returns the health status of the simulation service.

## Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Test Anvil-based simulation
npm run test:anvil

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check
```

## Testing

The application includes comprehensive tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- simulation.test.ts
```

## Production Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure proper RPC endpoints
3. Set up monitoring and logging
4. Configure rate limiting based on your needs
5. Set up health checks and load balancing

## Monitoring

### Health Checks

- `/health` - Application health
- `/api/simulation/health` - Simulation service health

### Logging

The application uses structured logging with the following levels:
- `error` - Application errors
- `warn` - Warning messages
- `info` - General information
- `debug` - Debug information

### Metrics

Consider adding Prometheus metrics for:
- Request count and duration
- Error rates
- RPC call metrics
- Cache hit rates

## Error Handling

The application uses custom error classes:

- `AppError` - Base error class
- `RPCError` - RPC communication errors
- `ValidationError` - Input validation errors
- `SimulationError` - Simulation-specific errors
- `ContractMetadataError` - Contract metadata errors
- `RateLimitError` - Rate limiting errors

## Security

- **Input Validation**: All inputs are validated using Joi schemas
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Security Headers**: Helmet.js provides security headers
- **CORS**: Configurable CORS settings
- **Request Size Limits**: Configurable request size limits

## Performance

- **Caching**: Contract metadata is cached with TTL
- **Parallel Processing**: Multiple RPC calls are made in parallel
- **Connection Pooling**: HTTP client with connection pooling
- **Compression**: Response compression enabled

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run linting and tests
6. Submit a pull request

## License

MIT License

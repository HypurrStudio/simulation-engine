import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  HYPEREVM_RPC_URL: Joi.string().uri().required(),
  HYPEREVM_CHAIN_ID: Joi.number().required(),
  ETHERSCAN_API_KEY: Joi.string().uri().required(),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  CORS_ORIGIN: Joi.string().default('*'),
  REQUEST_TIMEOUT_MS: Joi.number().default(30000),
  MAX_REQUEST_SIZE: Joi.string().default('10mb'),
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

// Configuration interface
export interface Config {
  nodeEnv: string;
  port: number;
  hyperEvmRpcUrl: string;
  hyperEvmChainId: number;
  etherscanApiKey: string;
  logLevel: string;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string;
  };
  request: {
    timeoutMs: number;
    maxSize: string;
  };
}

// Export configuration object
export const config: Config = {
  nodeEnv: envVars.NODE_ENV,
  port: envVars.PORT,
  hyperEvmRpcUrl: envVars.HYPEREVM_RPC_URL,
  hyperEvmChainId: envVars.HYPEREVM_CHAIN_ID,
  etherscanApiKey: envVars.ETHERSCAN_API_KEY,
  logLevel: envVars.LOG_LEVEL,
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  cors: {
    origin: envVars.CORS_ORIGIN,
  },
  request: {
    timeoutMs: envVars.REQUEST_TIMEOUT_MS,
    maxSize: envVars.MAX_REQUEST_SIZE,
  },
};

export default config;

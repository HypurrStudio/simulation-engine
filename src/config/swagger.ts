import { type Options } from 'swagger-jsdoc';

const swaggerConfig: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HyperEVM Transaction Simulation Engine API',
      version: '1.0.0',
      description: 'API documentation for transaction simulation endpoints',
    },
    servers: [
      {
        url: process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`,
        description: 'API Server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export default swaggerConfig;

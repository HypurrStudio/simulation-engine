import Joi from 'joi';
import { ValidationError } from './errors';

// Common validation schemas
export const addressSchema = Joi.string()
  .pattern(/^0x[a-fA-F0-9]{40}$/)
  .required()
  .messages({
    'string.pattern.base': 'Address must be a valid Ethereum address',
    'any.required': 'Address is required',
  });

export const hexStringSchema = Joi.string()
  .pattern(/^0x[a-fA-F0-9]*$/)
  .required()
  .messages({
    'string.pattern.base': 'Must be a valid hex string',
    'any.required': 'Hex string is required',
  });

export const gasSchema = Joi.string()
  .pattern(/^0x[a-fA-F0-9]+$/)
  .optional()
  .messages({
    'string.pattern.base': 'Gas must be a valid hex string',
  });

export const gasPriceSchema = Joi.string()
  .pattern(/^0x[a-fA-F0-9]+$/)
  .optional()
  .messages({
    'string.pattern.base': 'Gas price must be a valid hex string',
  });

export const valueSchema = Joi.string()
  .pattern(/^0x[a-fA-F0-9]+$/)
  .optional()
  .messages({
    'string.pattern.base': 'Value must be a valid hex string',
  });

export const networkIdSchema = Joi.string()
  .pattern(/^\d+$/)
  .default('11155111')
  .messages({
    'string.pattern.base': 'Network ID must be a numeric string',
  });

export const blockNumberSchema = Joi.alternatives()
  .try(
    Joi.string().valid('latest', 'earliest', 'pending'),
    Joi.number().integer().min(0),
    Joi.string().pattern(/^0x[a-fA-F0-9]+$/)
  )
  .default('latest')
  .messages({
    'alternatives.types': 'Block number must be a number, hex string, or special value',
  });

// Simulation request validation schema
export const simulationRequestSchema = Joi.object({
  from: addressSchema,
  to: addressSchema,
  input: hexStringSchema.optional().default('0x'),
  value: valueSchema.optional().default('0x0'),
  gas: gasSchema,
  gasPrice: gasPriceSchema,
  stateObjects: Joi.object().pattern(
    Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/),
    Joi.object({
      balance: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
      storage: Joi.object().pattern(
        Joi.string().pattern(/^0x[a-fA-F0-9]+$/),
        Joi.string().pattern(/^0x[a-fA-F0-9]+$/)
      ).optional(),
    })
  ).optional(),
  generateAccessList: Joi.boolean().default(false),
  networkId: networkIdSchema,
  blockHeader: Joi.object({
    number: Joi.string().required(),
    timestamp: Joi.string().required(),
  }).optional(),
  blockNumber: blockNumberSchema,
  transactionIndex: Joi.number().integer().min(0).optional(),
  accessList: Joi.array().items(
    Joi.object({
      address: addressSchema,
      storageKeys: Joi.array().items(hexStringSchema).optional(),
    })
  ).optional(),
}).required();

// Validation function
export const validateRequest = <T>(schema: Joi.Schema, data: any): T => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    throw new ValidationError(errorMessage);
  }

  return value as T;
};

// Type-safe validation wrapper
export const validateSimulationRequest = (data: any) => {
  return validateRequest(simulationRequestSchema, data);
};

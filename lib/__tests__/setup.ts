// ./lib/__tests__/setup.ts
import { PrismaClient } from '@prisma/client';
import { MockProxy, mockDeep } from 'jest-mock-extended';

// Add this before the prisma mock setup
process.env.JWT_SECRET = 'test-jwt-secret'

// Create a mock version of PrismaClient with correct typing
const prisma = mockDeep<PrismaClient>();

// Get the actual location of your prisma client instance
// Make sure this path is correct relative to where setup.ts is
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: prisma,
}));

// Export the typed mock for use in tests
export const prismaMock = prisma;

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'MOCK_NANOID',
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(() => ({ userId: 'user-123', email: 'test@example.com' })),
  sign: jest.fn(() => 'mock.jwt.token'),
}));

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

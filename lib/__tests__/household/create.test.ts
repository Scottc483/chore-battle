// Test file for the household creation API endpoint
import { createMocks } from 'node-mocks-http';
import handler from '../../../api/households/create';
import { prismaMock } from '../setup';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { householdCreateSchema } from '../../../lib/validations/households';



// Mock the auth middleware to pass through the handler without authentication
jest.mock('../../../api/middleware/auth', () => ({
    withAuth: (handler: (req: VercelRequest, res: VercelResponse) => Promise<any>) => handler,
}));

describe('Create Household API Endpoint', () => {
    beforeEach(() => {
      
      // Mock user data to simulate an existing user without a household
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed_password',
        totalPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        householdId: null,
      });
      
      // Mock successful household creation response
      (prismaMock.household.create as jest.Mock).mockResolvedValue({
        id: 'household-123',
        name: 'Test Household',
        inviteCode: 'ABC12345',
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: 'user-123',
        choreRanks: [],
        choreFrequencies: [],
        owner: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com'
        }
      });
      
      // Mock successful user update after household creation
      (prismaMock.user.update as jest.Mock).mockResolvedValue({});
    });
  


    // Test validation: household name is required
    it('should return 400 if name is missing', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                decodedUser: { userId: 'user-123' },
            },
        });

        req.query = {};
        await handler(req, res);
        
        expect(res._getStatusCode()).toBe(400);
        expect(JSON.parse(res._getData())).toEqual(
          {"error": [{"code": "invalid_type", "expected": "string", "message": "Required", "path": ["name"], "received": "undefined"}]}
        );
    });

    // Test validation: household name is too long
    it('should return 400 if household name is too long', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                decodedUser: { userId: 'user-123' },
                name: 'A'.repeat(101), // Exceeding max length
            },
        });

        req.query = {};
        await handler(req, res);

        expect(res._getStatusCode()).toBe(400);
        // should expect this  {"error": [{"code": "too_big", "exact": false, "inclusive": true, "maximum": 100, "message": "Household name cannot exceed 100 characters", "path": ["name"], "type": "string"}]}
        expect(JSON.parse(res._getData())).toEqual({
            error: [
                {
                    code: "too_big",
                    exact: false,
                    inclusive: true,
                    maximum: 100,
                    message: "Household name cannot exceed 100 characters",
                    path: ["name"],
                    type: "string",
                },
            ],
        });
    });

    // Test that users can't create a household if they're already in one
    it('should return 400 if user already in a household', async () => {
        // Mock user data to simulate user already in a household
        prismaMock.user.findUnique.mockResolvedValueOnce({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          password: 'hashed_password',
          totalPoints: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          householdId: 'existing-household-id',
        });

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            decodedUser: { userId: 'user-123' },
            name: 'New Household',
          },
        });

        req.query = {};
        await handler(req, res);
        
        expect(res._getStatusCode()).toBe(400);
        expect(JSON.parse(res._getData())).toEqual({ 
          error: 'You are already a member of a household. Leave that household first.' 
        });
    });

    // Test successful household creation flow
    it('should successfully create a new household', async () => {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            decodedUser: { userId: 'user-123' },
            name: 'Test Household',
          },
        });

        req.query = {};
        await handler(req, res);
        
        // Verify successful response
        expect(res._getStatusCode()).toBe(201);
        expect(JSON.parse(res._getData())).toHaveProperty('success', true);
        expect(JSON.parse(res._getData())).toHaveProperty('household');
        expect(JSON.parse(res._getData()).household).toHaveProperty('name', 'Test Household');
        
        // Verify database operations were called correctly
        expect(prismaMock.household.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { householdId: 'household-123' }
        });
    });

    // Test error handling for database failures
    it('should handle errors gracefully', async () => {
        // Simulate database error during household creation
        prismaMock.household.create.mockRejectedValueOnce(new Error('Database error'));

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            decodedUser: { userId: 'user-123' },
            name: 'Test Household',
          },
        });

        req.query = {};
        await handler(req, res);
        
        expect(res._getStatusCode()).toBe(500);
        expect(JSON.parse(res._getData())).toEqual({ error: 'Failed to create household' });
    });
});
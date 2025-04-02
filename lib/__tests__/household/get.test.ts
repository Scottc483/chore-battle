import { createMocks } from 'node-mocks-http';
import getHouseholds from '../../../api/households/get';
import getHouseholdById from '../../../api/households/getById';
import { prismaMock } from '../setup';
import { householdsResponseSchema, householdGetReturnSchema } from '../../../lib/validations/households';
import { VercelRequest, VercelResponse } from '@vercel/node';

// Mocking the prisma client
jest.mock('../../../api/middleware/auth', () => ({
    withAuth: (handler: (req: VercelRequest, res: VercelResponse) => Promise<any>) => handler,
}));

describe('Household API', () => {
      // Mocking the prisma response
      const mockHousehold = {
        id: 'cm854r71q0000jkkk8d8t1aw5',
        name: 'Janes New Household Name',
        inviteCode: 'VUX77WSU',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: 'cm7cmnqc80001jkyk8j27ula3',
        owner: {
          id: 'cm7cmnqc80001jkyk8j27ula3',
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
        members: [
          {
            id: 'cm7cmnqc80001jkyk8j27ula3',
            name: 'Jane Smith',
            email: 'jane@example.com',
            totalPoints: 0,
          },
        ],
        _count: {
          members: 1,
          chores: 0,
          rewards: 0,
        },
      };
  // Test for getHouseholds
  describe('GET /api/households', () => {
    it('should return households for a user', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        body: { decodedUser: { userId: 'user-id' } },
      });

      (prismaMock.household.findFirst as jest.Mock).mockResolvedValueOnce(mockHousehold);

      await getHouseholds(req, res);
      expect(res._getStatusCode()).toBe(200);
      const responseData = res._getData();

      expect(householdsResponseSchema.safeParse(responseData)).toEqual({
        success: true,
        data: { households: mockHousehold },
      });
    });

    it('should return 404 if no households found', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        body: { decodedUser: { userId: 'user-id' } },
      });

      (prismaMock.household.findFirst as jest.Mock).mockResolvedValueOnce(null);

      await getHouseholds(req, res);
      expect(res._getStatusCode()).toBe(404);
      
      // Ensure the response is parsed correctly
      const responseData = JSON.parse(res._getData()); // Parse the response data
      expect(responseData).toEqual({ error: 'Household not found' });
    });
  });

  // Test for getHouseholdById
  describe('GET /api/households?id=household-id', () => {
    it('should return a household by ID', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'cm854r71q0000jkkk8d8t1aw5' },
        body: { decodedUser: { userId: 'user-id', householdId: 'cm854r71q0000jkkk8d8t1aw5' } },
      });
     

      const mockHousehold = {
        id: 'cm854r71q0000jkkk8d8t1aw5',
        name: 'Janes New Household Name',
        inviteCode: 'VUX77WSU',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: 'cm7cmnqc80001jkyk8j27ula3',
        owner: {
          id: 'cm7cmnqc80001jkyk8j27ula3',
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
        members: [
          {
            id: 'cm7cmnqc80001jkyk8j27ula3',
            name: 'Jane Smith',
            email: 'jane@example.com',
            totalPoints: 0,
          },
        ],
        _count: {
          members: 1,
          chores: 0,
          rewards: 0,
        },
      };

      (prismaMock.household.findUnique as jest.Mock).mockResolvedValueOnce(mockHousehold);

      await getHouseholdById(req, res);
      expect(res._getStatusCode()).toBe(200);
      
      const responseData = res._getData();
 // Log the response data for debugging

      const validationResult = householdGetReturnSchema.safeParse(responseData);
      expect(validationResult.success).toBe(true); // Check if validation is successful
      if (!validationResult.success) {
        console.error('Validation Errors:', validationResult.error); // Log validation errors if any
      }
    });

    it('should return 403 if user does not have access', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'household-id' },
        body: { decodedUser: { userId: 'user-id', householdId: 'other-household-id' } },
      });

      (prismaMock.household.findFirst as jest.Mock).mockResolvedValueOnce(null);

      await getHouseholdById(req, res);
      expect(res._getStatusCode()).toBe(403);
      const responseData = JSON.parse(res._getData()); 
      expect(responseData).toEqual({ error: 'You don\'t have access to this household' });
    });
  });
});

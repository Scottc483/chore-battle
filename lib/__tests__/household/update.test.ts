import { createMocks } from 'node-mocks-http';
import handler from '../../../api/households/index'; // Adjust the import path as necessary
import { prismaMock } from '../setup'; // Ensure this is correctly set up for your tests
import { householdUpdateSchema } from '../../../lib/validations/households';

describe('Update Household API Endpoints', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com'
  };

  const mockHousehold = {
    id: 'household-123',
    name: 'Test Household',
    inviteCode: 'ABC123',
    ownerId: 'user-123',
    createdAt: new Date('2024-03-10T23:16:38.518Z'),
    updatedAt: new Date('2024-03-10T23:16:38.518Z')
  };

  describe('PATCH /api/households', () => {
    it('should update household name successfully', async () => {
      // Mock the household retrieval and update
      prismaMock.household.findFirst.mockResolvedValueOnce(mockHousehold);
      prismaMock.household.update.mockResolvedValueOnce({
        ...mockHousehold,
        name: 'Updated Household Name'
      });

      const { req, res } = createMocks({
        method: 'PATCH',
        query: { id: 'household-123' },
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: {
          name: 'Updated Household Name',
          decodedUser: { userId: 'user-123', householdId: 'household-123' }
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.household.name).toBe('Updated Household Name');
    });

    it('should return 403 if user is not a member', async () => {
      // Mock the household retrieval to return null (user is not a member)
      prismaMock.household.findFirst.mockResolvedValueOnce(null);

      const { req, res } = createMocks({
        method: 'PATCH',
        query: { id: 'household-123' },
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: {
          name: 'Updated Household Name'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Only the household owner can update details'
      });
    });

    it('should handle database errors', async () => {
      // Mock the household retrieval and simulate a database error on update
      prismaMock.household.findFirst.mockResolvedValueOnce(mockHousehold);
      prismaMock.household.update.mockRejectedValueOnce(new Error('Database error'));

      const { req, res } = createMocks({
        method: 'PATCH',
        query: { id: 'household-123' },
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: {
          name: 'Updated Household Name'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Failed to update household'
      });
    });
  });
});

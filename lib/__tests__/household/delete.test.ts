import { createMocks } from 'node-mocks-http';
import handler from '../../../api/households/index';
import { prismaMock } from '../setup';
import { VercelRequest, VercelResponse } from '@vercel/node';

// Mock the auth middleware
jest.mock('../../../api/middleware/auth', () => ({
    withAuth: (handler: (req: VercelRequest, res: VercelResponse) => Promise<any>) => handler,
}));

describe('Delete Household API Endpoint', () => {
    const mockUser = {
        userId: 'user-123',
        householdId: 'household-123'
    };

    const mockHousehold = {
        id: 'household-123',
        name: 'Test Household',
        inviteCode: 'ABC12345',
        createdAt: '2025-03-10T23:16:38.518Z',
        updatedAt: '2025-03-10T23:16:38.518Z',
        ownerId: 'user-123'
    };

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
    });

    it('should return 403 if user is not the household owner', async () => {
        // Mock findFirst to return null (user is not owner)
        (prismaMock.household.findFirst as jest.Mock).mockResolvedValue(null);

        const { req, res } = createMocks({
            method: 'DELETE',
            query: { id: 'household-123' },
            body: {
                decodedUser: mockUser
            }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(403);
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Only the household owner can delete the household'
        });
    });

    it('should successfully delete a household and all related data', async () => {
        // Mock findFirst to confirm user is owner
        (prismaMock.household.findFirst as jest.Mock).mockResolvedValue(mockHousehold);

        // Mock successful user update
        (prismaMock.user.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

        // Mock successful transaction
        (prismaMock.$transaction as jest.Mock).mockImplementation(async (operations) => {
            // Verify that we have all the required delete operations
            expect(operations).toHaveLength(8); // 7 deleteMany operations + 1 delete operation
            return operations.map(() => ({ count: 1 }));
        });

        const { req, res } = createMocks({
            method: 'DELETE',
            query: { id: 'household-123' },
            body: {
                decodedUser: mockUser
            }
        });

        await handler(req, res);

        // Verify response
        expect(res._getStatusCode()).toBe(200);
        expect(JSON.parse(res._getData())).toEqual({
            success: true,
            message: 'Household deleted successfully',
            token: 'mock.jwt.token'
        });

        // Verify that user householdIds were updated
        expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
            where: { householdId: 'household-123' },
            data: { householdId: null }
        });

        // Verify transaction was called
        expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
        // Mock findFirst to confirm user is owner
        (prismaMock.household.findFirst as jest.Mock).mockResolvedValue(mockHousehold);

        // Mock database error during transaction
        (prismaMock.$transaction as jest.Mock).mockRejectedValue(new Error('Database error'));

        const { req, res } = createMocks({
            method: 'DELETE',
            query: { id: 'household-123' },
            body: {
                decodedUser: mockUser
            }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(500);
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Failed to delete household'
        });
    });

    it('should return 405 for non-DELETE methods', async () => {
        const { req, res } = createMocks({
            method: 'PUT',
            query: { id: 'household-123' },
            body: {
                decodedUser: mockUser
            }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(405);
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Method not allowed'
        });
    });
}); 
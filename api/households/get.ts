// api/households/get.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { withAuth } from '../../lib/middleware/auth'

async function getHouseholds(req: VercelRequest, res: VercelResponse) {
  try {
    const { decodedUser } = req.body
    console.log('decodedUser', decodedUser);
    // console.log('decodedUser', req.query.query);
    // Get households where user is either a member or owner
    const households = await prisma.household.findUnique({
      where: { id: decodedUser.householdId as string },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            totalPoints: true
          }
        },
        _count: {
          select: {
            members: true,
            chores: true,
            rewards: true
          }
        }
      }
    })
    if (!households) {
      return res.status(404).json({ error: 'Household not found' })
    }

    // Return the response in the expected format
    return res.status(200).json({ households })
  } catch (error) {
    console.error('Failed to fetch households:', error)
    return res.status(500).json({ error: 'Failed to fetch households' })
  }
}

export default withAuth(getHouseholds)
// api/households/getById.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { withAuth } from '../../lib/middleware/auth'

async function getHouseholdById(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query
    console.log('id', id);
    const { decodedUser } = req.body
    // console.log('decodedUser', decodedUser)

    // Check if user has access to this household
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
      return res.status(403).json({ error: 'You don\'t have access to this household' })
    }

    // Get full household details
    return res.status(200).json({ households })
  } catch (error) {
    console.error('Failed to fetch household:', error)
    return res.status(500).json({ error: 'Failed to fetch household' })
  }
}

export default withAuth(getHouseholdById);
// api/households/getById.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'

export default async function getHouseholdById(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query
    const { decodedUser } = req.body

    // Check if user has access to this household
    const userHousehold = await prisma.household.findFirst({
      where: {
        id: id as string,
        OR: [
          { members: { some: { id: decodedUser.userId } } },
          { ownerId: decodedUser.userId }
        ]
      }
    })

    if (!userHousehold) {
      return res.status(403).json({ error: 'You don\'t have access to this household' })
    }

    // Get full household details
    const household = await prisma.household.findUnique({
      where: { id: id as string },
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

    if (!household) {
      return res.status(404).json({ error: 'Household not found' })
    }

    return res.status(200).json({ household })
  } catch (error) {
    console.error('Failed to fetch household:', error)
    return res.status(500).json({ error: 'Failed to fetch household' })
  }
}
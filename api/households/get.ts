// api/households/get.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'

export default async function getHouseholds(req: VercelRequest, res: VercelResponse) {
  try {
    const { decodedUser } = req.body

    // Get households where user is either a member or owner
    const households = await prisma.household.findMany({
      where: {
        OR: [
          { members: { some: { id: decodedUser.userId } } },
          { ownerId: decodedUser.userId }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            members: true,
            chores: true
          }
        }
      }
    })

    return res.status(200).json({ households })
  } catch (error) {
    console.error('Failed to fetch households:', error)
    return res.status(500).json({ error: 'Failed to fetch households' })
  }
}
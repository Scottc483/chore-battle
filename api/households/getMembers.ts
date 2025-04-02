// api/households/getMembers.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { withAuth } from '../../lib/middleware/auth'

 async function getHouseholdMembers(req: VercelRequest, res: VercelResponse) {
  try {
    const { decodedUser } = req.body

    // Check if user has access to this household
    const userHousehold = await prisma.household.findFirst({
      where: {
        id: decodedUser.id as string,
        OR: [
          { members: { some: { id: decodedUser.userId } } },
          { ownerId: decodedUser.userId }
        ]
      }
    })

    if (!userHousehold) {
      return res.status(403).json({ error: 'You don\'t have access to this household' })
    }

    // Get all members with relevant information
    const members = await prisma.user.findMany({
      where: {
        householdId: decodedUser.householdId as string
      },
      select: {
        id: true,
        name: true,
        email: true,
        totalPoints: true,
        createdAt: true,
        _count: {
          select: {
            assignedChores: true,
            rewardClaims: true
          }
        }
      },
      orderBy: {
        totalPoints: 'desc'
      }
    })

    // Get the owner information
    const household = await prisma.household.findUnique({
      where: { id: decodedUser.householdId as string },
      select: { ownerId: true }
    })

    // Add isOwner flag to each member
    const membersWithOwnerStatus = members.map(member => ({
      ...member,
      isOwner: member.id === household?.ownerId
    }))

    return res.status(200).json({ members: membersWithOwnerStatus })
  } catch (error) {
    console.error('Failed to fetch household members:', error)
    return res.status(500).json({ error: 'Failed to fetch household members' })
  }
}

export default withAuth(getHouseholdMembers)
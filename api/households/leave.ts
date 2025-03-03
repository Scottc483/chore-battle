// api/households/leave.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'

export default async function leaveHousehold(req: VercelRequest, res: VercelResponse) {
  try {
    const { decodedUser } = req.body

    // Get user's current household
    const user = await prisma.user.findUnique({
      where: { id: decodedUser.userId },
      include: {
        household: true
      }
    })

    if (!user?.householdId) {
      return res.status(400).json({ error: 'You are not a member of any household' })
    }

    // Check if user is the owner
    if (user.household?.ownerId === decodedUser.userId) {
      return res.status(400).json({ 
        error: 'As the owner, you cannot leave the household. Transfer ownership first or delete the household.' 
      })
    }

    // Reassign user's chores
    await prisma.chore.updateMany({
      where: { 
        householdId: user.householdId,
        assignedToId: decodedUser.userId
      },
      data: { assignedToId: null }
    })

    // Remove user from household
    await prisma.user.update({
      where: { id: decodedUser.userId },
      data: { householdId: null }
    })

    return res.status(200).json({ 
      success: true,
      message: 'Successfully left the household' 
    })
  } catch (error) {
    console.error('Failed to leave household:', error)
    return res.status(500).json({ error: 'Failed to leave household' })
  }
}
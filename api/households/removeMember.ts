// api/households/removeMember.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'

export default async function removeMember(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query
    const { memberId } = req.body
    const { decodedUser } = req.body

    if (!memberId) {
      return res.status(400).json({ error: 'Member ID is required' })
    }

    // Get the household
    const household = await prisma.household.findUnique({
      where: { id: id as string },
      include: {
        members: true
      }
    })

    if (!household) {
      return res.status(404).json({ error: 'Household not found' })
    }

    // Check if user is the owner or removing themselves
    if (household.ownerId !== decodedUser.userId && decodedUser.userId !== memberId) {
      return res.status(403).json({ error: 'Only the household owner can remove other members' })
    }

    // Cannot remove the owner
    if (memberId === household.ownerId) {
      return res.status(400).json({ 
        error: 'Cannot remove the household owner. Transfer ownership first or delete the household instead.' 
      })
    }

    // Check if the member is part of the household
    const isMember = household.members.some(member => member.id === memberId)
    if (!isMember) {
      return res.status(404).json({ error: 'User is not a member of this household' })
    }

    // Update user to remove from household
    await prisma.user.update({
      where: { id: memberId },
      data: { householdId: null }
    })

    // Reassign their chores
    await prisma.chore.updateMany({
      where: { 
        householdId: id as string,
        assignedToId: memberId
      },
      data: { assignedToId: null }
    })

    return res.status(200).json({ 
      success: true,
      message: 'Member removed successfully' 
    })
  } catch (error) {
    console.error('Failed to remove member:', error)
    return res.status(500).json({ error: 'Failed to remove member' })
  }
}
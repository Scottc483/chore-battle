// api/households/transferOwnership.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'

export default async function transferOwnership(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query
    const { newOwnerId } = req.body
    const { decodedUser } = req.body

    if (!newOwnerId) {
      return res.status(400).json({ error: 'New owner ID is required' })
    }

    // Get the household
    const household = await prisma.household.findUnique({
      where: { id: id as string },
      include: {
        members: {
          select: { id: true }
        }
      }
    })

    if (!household) {
      return res.status(404).json({ error: 'Household not found' })
    }

    // Check if user is the current owner
    if (household.ownerId !== decodedUser.userId) {
      return res.status(403).json({ error: 'Only the household owner can transfer ownership' })
    }

    // Check if new owner is a member of the household
    const isMember = household.members.some(member => member.id === newOwnerId)
    if (!isMember) {
      return res.status(400).json({ error: 'New owner must be a member of the household' })
    }

    // Transfer ownership
    await prisma.household.update({
      where: { id: id as string },
      data: { ownerId: newOwnerId }
    })

    return res.status(200).json({ 
      success: true,
      message: 'Household ownership transferred successfully',
      newOwnerId
    })
  } catch (error) {
    console.error('Failed to transfer ownership:', error)
    return res.status(500).json({ error: 'Failed to transfer ownership' })
  }
}
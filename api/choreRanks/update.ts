// api/chore-ranks/update.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../middleware/auth'
import { ChoreRankUpdateInput, ChoreRankResponse } from '../../lib/types/chores'
import { rankUpdateSchema } from '../../lib/validations/choreRanks'

const prisma = new PrismaClient()

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { decodedUser } = req.body
  const updateData: ChoreRankUpdateInput = req.body

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to update chore ranks' })
  }

  // Validate input using Zod schema
  try {
    rankUpdateSchema.parse(updateData)
  } catch (error) {
    return res.status(400).json({ error: 'Validation failed', details: error })
  }

  const { id } = updateData

  try {
    // First check if the chore rank exists and belongs to user's household
    const existingRank = await prisma.choreRank.findUnique({
      where: {
        id
      }
    })

    if (!existingRank) {
      return res.status(404).json({ error: 'Chore rank not found' })
    }

    if (existingRank.householdId !== decodedUser.householdId) {
      return res.status(403).json({ error: 'You do not have permission to update this chore rank' })
    }

    // Check if trying to modify a system rank's name or isSystem status
    if (existingRank.isSystem && updateData.name && updateData.name !== existingRank.name) {
      return res.status(403).json({ error: 'Cannot change the name of system chore ranks' })
    }

    // If changing name, check if new name conflicts with existing names
    if (updateData.name && updateData.name !== existingRank.name) {
      const nameConflict = await prisma.choreRank.findFirst({
        where: {
          householdId: decodedUser.householdId,
          name: updateData.name,
          id: { not: id } // Exclude current rank
        }
      })

      if (nameConflict) {
        return res.status(409).json({ error: 'A chore rank with this name already exists in the household' })
      }
    }

    // Prepare update data, excluding id
    const { id: _, ...prismaUpdateData } = updateData

    // Update the chore rank
    const updatedRank = await prisma.choreRank.update({
      where: { id },
      data: prismaUpdateData
    })

    // Return properly typed response
    const response: ChoreRankResponse = {
      id: updatedRank.id,
      name: updatedRank.name,
      displayName: updatedRank.displayName,
      pointValue: updatedRank.pointValue,
      isSystem: updatedRank.isSystem,
      createdAt: updatedRank.createdAt,
      updatedAt: updatedRank.updatedAt,
      householdId: updatedRank.householdId
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error updating chore rank:', error)
    return res.status(500).json({ error: 'Failed to update chore rank' })
  }
}

export default withAuth(handler)
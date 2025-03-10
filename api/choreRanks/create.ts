// api/chore-ranks/create.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../middleware/auth'
import { ChoreRankCreateInput, ChoreRankResponse } from '../../lib/types/chores'
import { rankSchema } from '../../lib/validations/choreRanks'

const prisma = new PrismaClient()

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { decodedUser } = req.body
  const choreRankData: ChoreRankCreateInput = req.body

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to create chore ranks' })
  }

  // Validate input using Zod schema
  try {
    rankSchema.parse(choreRankData)
  } catch (error) {
    return res.status(400).json({ error: 'Validation failed', details: error })
  }

  try {
    // Check if a rank with this name already exists in the household
    const existingRank = await prisma.choreRank.findFirst({
      where: {
        householdId: decodedUser.householdId,
        name: choreRankData.name
      }
    })

    if (existingRank) {
      return res.status(409).json({ error: 'A chore rank with this name already exists in the household' })
    }

    // Create the new chore rank
    const newChoreRank = await prisma.choreRank.create({
      data: {
        name: choreRankData.name,
        displayName: choreRankData.displayName,
        pointValue: choreRankData.pointValue,
        householdId: decodedUser.householdId,
        isSystem: false // User-created ranks are not system ranks
      }
    })

    // Return the new chore rank as a properly typed response
    const response: ChoreRankResponse = {
      id: newChoreRank.id,
      name: newChoreRank.name,
      displayName: newChoreRank.displayName,
      pointValue: newChoreRank.pointValue,
      isSystem: newChoreRank.isSystem,
      createdAt: newChoreRank.createdAt,
      updatedAt: newChoreRank.updatedAt,
      householdId: newChoreRank.householdId
    }

    return res.status(201).json(response)
  } catch (error) {
    console.error('Error creating chore rank:', error)
    return res.status(500).json({ error: 'Failed to create chore rank' })
  }
}

export default withAuth(handler)
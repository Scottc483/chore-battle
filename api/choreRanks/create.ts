// api/choreRanks/create.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../middleware/auth'

const prisma = new PrismaClient()

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { decodedUser } = req.body
  const { name, displayName, pointValue } = req.body

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to create chore ranks' })
  }

  // Validate input
  if (!name || !displayName || pointValue === undefined) {
    return res.status(400).json({ error: 'Name, displayName, and pointValue are required' })
  }

  if (typeof pointValue !== 'number' || pointValue <= 0) {
    return res.status(400).json({ error: 'Point value must be a positive number' })
  }

  try {
    // Check if a rank with this name already exists in the household
    const existingRank = await prisma.choreRank.findFirst({
      where: {
        householdId: decodedUser.householdId,
        name: name
      }
    })

    if (existingRank) {
      return res.status(409).json({ error: 'A chore rank with this name already exists in the household' })
    }

    // Create the new chore rank
    const newChoreRank = await prisma.choreRank.create({
      data: {
        name,
        displayName,
        pointValue,
        householdId: decodedUser.householdId,
        isSystem: false // User-created ranks are not system ranks
      }
    })

    return res.status(201).json(newChoreRank)
  } catch (error) {
    console.error('Error creating chore rank:', error)
    return res.status(500).json({ error: 'Failed to create chore rank' })
  }
}

export default withAuth(handler)
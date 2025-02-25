// api/chore-ranks/delete.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../middleware/auth'
import { rankDeleteSchema } from '../../lib/validations/choreRanks'

const prisma = new PrismaClient()

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { decodedUser } = req.body
  const { id } = req.query

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to delete chore ranks' })
  }

  // Validate input
  try {
    rankDeleteSchema.parse({ id })
  } catch (error) {
    return res.status(400).json({ error: 'Validation failed', details: error })
  }

  try {
    // First check if the chore rank exists and belongs to user's household
    const existingRank = await prisma.choreRank.findUnique({
      where: {
        id: id as string
      },
      include: {
        chores: {
          select: {
            id: true
          }
        }
      }
    })

    if (!existingRank) {
      return res.status(404).json({ error: 'Chore rank not found' })
    }

    if (existingRank.householdId !== decodedUser.householdId) {
      return res.status(403).json({ error: 'You do not have permission to delete this chore rank' })
    }

    // Check if it's a system rank
    if (existingRank.isSystem) {
      return res.status(403).json({ error: 'System chore ranks cannot be deleted' })
    }

    // Check if rank is associated with any chores
    if (existingRank.chores.length > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete chore rank that is associated with chores',
        choreCount: existingRank.chores.length
      })
    }

    // Delete the chore rank
    await prisma.choreRank.delete({
      where: { id: id as string }
    })

    return res.status(200).json({ 
      message: 'Chore rank deleted successfully',
      id: id as string 
    })
  } catch (error) {
    console.error('Error deleting chore rank:', error)
    return res.status(500).json({ error: 'Failed to delete chore rank' })
  }
}

export default withAuth(handler)
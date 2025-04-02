// api/chores/delete.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient, Prisma } from '@prisma/client'
import { withAuth } from '../../lib/middleware/auth'
import prisma from '../../lib/prisma'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { decodedUser } = req.body
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Chore ID is required' })
  }

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to delete chores' })
  }

  try {
    // First check if the chore exists and belongs to the user's household
    const chore = await prisma.chore.findFirst({
      where: {
        id: id as string,
        householdId: decodedUser.householdId
      }
    })

    if (!chore) {
      return res.status(404).json({ error: 'Chore not found or not accessible' })
    }

    // Delete the chore
    await prisma.chore.delete({
      where: {
        id: id as string
      }
    })

    // Return 204 No Content for successful deletion
    return res.status(204).end()
  } catch (error) {
    console.error('Error deleting chore:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Chore not found' })
      }
    }
    return res.status(500).json({ error: 'Failed to delete chore' })
  }
}

export default withAuth(handler)
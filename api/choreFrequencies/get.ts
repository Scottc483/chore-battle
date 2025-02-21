// api/frequencies/get.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../middleware/auth'

const prisma = new PrismaClient()

async function getFrequencies(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to view frequencies' })
  }

  try {
    const frequencies = await prisma.choreFrequency.findMany({
      where: {
        householdId: decodedUser.householdId
      },
      orderBy: [
        { isSystem: 'desc' },  // System frequencies first
        { daysInterval: 'asc' } // Then by interval length
      ]
    })

    return res.status(200).json(frequencies)
  } catch (error) {
    console.error('Error fetching frequencies:', error)
    return res.status(500).json({ error: 'Failed to fetch frequencies' })
  }
}

export default withAuth(getFrequencies)
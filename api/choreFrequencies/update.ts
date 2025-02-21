// api/frequencies/update.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient, Prisma } from '@prisma/client'
import { frequencySchema } from '../../lib/validations/choreFrequencies'
import { withAuth } from '../middleware/auth'

const prisma = new PrismaClient()

async function updateFrequency(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Frequency ID is required' })
  }

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to update frequencies' })
  }

  try {
    // Check if frequency exists and belongs to user's household
    const existingFrequency = await prisma.choreFrequency.findFirst({
      where: {
        id: id as string,
        householdId: decodedUser.householdId
      }
    })

    if (!existingFrequency) {
      return res.status(404).json({ error: 'Frequency not found or not accessible' })
    }

    if (existingFrequency.isSystem) {
      return res.status(403).json({ error: 'System frequencies cannot be modified' })
    }

    const validatedData = frequencySchema.partial().parse(req.body.data || {})

    // If name is being updated, check for duplicates
    if (validatedData.name) {
      const duplicateCheck = await prisma.choreFrequency.findFirst({
        where: {
          householdId: decodedUser.householdId,
          name: {
            equals: validatedData.name,
            mode: 'insensitive'
          },
          id: { not: id as string }
        }
      })

      if (duplicateCheck) {
        return res.status(400).json({
          error: `A frequency named "${validatedData.name}" already exists in this household`
        })
      }
    }

    // Start a transaction to update frequency and related chores if needed
    const updatedFrequency = await prisma.$transaction(async (tx) => {
      // Update the frequency
      const frequency = await tx.choreFrequency.update({
        where: { id: id as string },
        data: validatedData
      })

      // If daysInterval was changed, update nextReset for all affected chores
      if (validatedData.daysInterval) {
        const affectedChores = await tx.chore.findMany({
          where: {
            frequencyId: id as string,
            householdId: decodedUser.householdId
          }
        })

        await Promise.all(
          affectedChores.map(chore => 
            tx.chore.update({
              where: { id: chore.id },
              data: {
                nextReset: new Date(chore.lastReset.getTime() + validatedData.daysInterval! * 24 * 60 * 60 * 1000)
              }
            })
          )
        )
      }

      return frequency
    })

    return res.status(200).json(updatedFrequency)
  } catch (error) {
    console.error('Error updating frequency:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'A frequency with this name already exists' })
      }
    }
    return res.status(500).json({ error: 'Failed to update frequency' })
  }
}

export default withAuth(updateFrequency)
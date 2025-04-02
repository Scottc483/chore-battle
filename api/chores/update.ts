// api/chores/update.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { Prisma } from '@prisma/client'
import { withAuth } from '../../lib/middleware/auth'
import { choreUpdateSchema } from '../../lib/validations/chores'
import { calculateNextReset } from '../../lib/utils/chores'
import prisma from "../../lib/prisma"

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  } 

  const { decodedUser } = req.body
  const { id } = req.query
  
  if (!id) {
    return res.status(400).json({ error: 'Chore ID is required' })
  }

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to update chores' })
  }

  try {
    // First check if the chore exists and belongs to the user's household
    const existingChore = await prisma.chore.findFirst({
      where: {
        id: id as string,
        householdId: decodedUser.householdId
      },
      include: {
        rank: true,
        frequency: true
      }
    })

    if (!existingChore) {
      return res.status(404).json({ error: 'Chore not found or not accessible' })
    }

    // Get available ranks and frequencies for validation
    const [availableRanks, availableFrequencies] = await Promise.all([
      prisma.choreRank.findMany({
        where: { householdId: decodedUser.householdId },
        select: { id: true }
      }),
      prisma.choreFrequency.findMany({
        where: { householdId: decodedUser.householdId },
        select: { id: true }
      })
    ])

    // Validate the update data
    const updateData = req.body.data || {}
    const schema = choreUpdateSchema(
      availableRanks.map(r => r.id),
      availableFrequencies.map(f => f.id)
    )
    const validatedData = schema.parse(updateData)
    
    const updatePayload: Prisma.ChoreUpdateInput = {}
    
    // Only include fields that are being updated
    if (validatedData.title !== undefined) {
      updatePayload.title = validatedData.title
    }
    
    if (validatedData.description !== undefined) {
      updatePayload.description = validatedData.description
    }
    
    // Handle rank change
    if (validatedData.rankId !== undefined && validatedData.rankId !== existingChore.rankId) {
      // Verify the rank exists in this household
      const newRank = await prisma.choreRank.findFirst({
        where: {
          id: validatedData.rankId,
          householdId: decodedUser.householdId
        }
      })

      if (!newRank) {
        return res.status(400).json({ 
          error: 'Invalid rank selected' 
        })
      }

      updatePayload.rank = {
        connect: { id: validatedData.rankId }
      }
    }
    
    // Handle frequency change
    if (validatedData.frequencyId !== undefined && validatedData.frequencyId !== existingChore.frequencyId) {
      // Verify the frequency exists in this household
      const newFrequency = await prisma.choreFrequency.findFirst({
        where: {
          id: validatedData.frequencyId,
          householdId: decodedUser.householdId
        }
      })

      if (!newFrequency) {
        return res.status(400).json({ 
          error: 'Invalid frequency selected' 
        })
      }
      
      updatePayload.frequency = {
        connect: { id: validatedData.frequencyId }
      }
      updatePayload.nextReset = calculateNextReset(new Date(), newFrequency)
    }
    
    // Handle assignedToId change
    if (validatedData.assignedToId !== undefined) {
      if (validatedData.assignedToId === null) {
        // Remove assignment
        updatePayload.assignedTo = { disconnect: true }
      } else {
        // Verify the assigned user is in the same household
        const assignedUser = await prisma.user.findFirst({
          where: {
            id: validatedData.assignedToId,
            householdId: decodedUser.householdId
          }
        })

        if (!assignedUser) {
          return res.status(400).json({ 
            error: 'Assigned user must be in the same household as the chore' 
          })
        }

        updatePayload.assignedTo = {
          connect: { id: validatedData.assignedToId }
        }
      }
    }

    // Update the chore
    const updatedChore = await prisma.chore.update({
      where: {
        id: id as string
      },
      data: updatePayload,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          }
        },
        rank: true,
        frequency: true,
        completions: {
          take: 1,
          orderBy: {
            completedAt: 'desc'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    return res.status(200).json(updatedChore)

  } catch (error) {
    console.error('Error updating chore:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Chore not found' })
      }
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'A chore with this title already exists' })
      }
    }
    return res.status(500).json({ error: 'Failed to update chore', message: error })
  }
}

export default withAuth(handler)
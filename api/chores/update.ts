// api/chores/update.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient, Prisma } from '@prisma/client'
import { withAuth } from '../middleware/auth'
import { choreUpdateSchema } from '../../lib/validations/chores'

const prisma = new PrismaClient()

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
        rankPoints: true
      }
    })

    if (!existingChore) {
      return res.status(404).json({ error: 'Chore not found or not accessible' })
    }

    // Validate the update data
    const updateData = req.body.data || {}
    const validatedData = choreUpdateSchema.parse(updateData)
    
    const updatePayload: Prisma.ChoreUpdateInput = {}
    
    // Only include fields that are being updated
    if (validatedData.title !== undefined) {
      updatePayload.title = validatedData.title
    }
    
    if (validatedData.description !== undefined) {
      updatePayload.description = validatedData.description
    }
    
    // Handle difficulty change - need to update rankPoints relation
    if (validatedData.difficulty !== undefined && validatedData.difficulty !== existingChore.difficulty) {
      // Find the new rank points for this difficulty
      const newRankPoints = await prisma.choreRankPoints.findUnique({
        where: {
          rank_householdId: {
            rank: validatedData.difficulty,
            householdId: decodedUser.householdId
          }
        }
      })

      if (!newRankPoints) {
        return res.status(400).json({ 
          error: `No rank points found for difficulty level "${validatedData.difficulty}" in this household` 
        })
      }

      updatePayload.difficulty = validatedData.difficulty
      updatePayload.rankPoints = {
        connect: { id: newRankPoints.id }
      }
    }
    
    // Handle frequency change - need to recalculate nextReset
    if (validatedData.frequency !== undefined && validatedData.frequency !== existingChore.frequency) {
      updatePayload.frequency = validatedData.frequency
      
      // Calculate new nextReset date based on frequency
      const newNextReset = new Date()
      switch (validatedData.frequency) {
        case 'DAILY':
          newNextReset.setDate(newNextReset.getDate() + 1)
          break
        case 'WEEKLY':
          newNextReset.setDate(newNextReset.getDate() + 7)
          break
        case 'MONTHLY':
          newNextReset.setMonth(newNextReset.getMonth() + 1)
          break
      }
      
      updatePayload.nextReset = newNextReset
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
        rankPoints: {
          select: {
            pointValue: true,
            rank: true
          }
        },
        completions: {
          take: 1,
          orderBy: {
            completedAt: 'desc'
          },
          select: {
            completedAt: true,
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
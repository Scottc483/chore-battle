// api/chores/get.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../middleware/auth'
import { ChoreWithRelations, ChoreResponse } from '../../lib/types/chores'
import { isChoreExpired, getChoreResetData } from '../../lib/utils/chores'
import prisma from '../../lib/prisma'


async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { decodedUser } = req.body

  console.log('decodedUser', decodedUser)

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to view chores' })
  }

  try {
    const chores = await prisma.chore.findMany({
      where: {
        householdId: decodedUser.householdId
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true
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
      },
      orderBy: [
        { isComplete: 'asc' },
        { nextReset: 'asc' }
      ]
    }) as ChoreWithRelations[]

    // Check for expired chores and update them
    const updatePromises = chores.map(async (chore) => {
      if (isChoreExpired(chore.nextReset)) {
        const resetData = getChoreResetData(chore.frequency)
        await prisma.chore.update({
          where: { id: chore.id },
          data: resetData
        })
        return {
          ...chore,
          ...resetData
        }
      }
      return chore
    })

    const updatedChores = await Promise.all(updatePromises)

    const formattedChores: ChoreResponse[] = updatedChores.map((chore) => ({
      id: chore.id,
      title: chore.title,
      description: chore.description,
      rank: {
        id: chore.rank.id,
        name: chore.rank.name,
        displayName: chore.rank.displayName,
        pointValue: chore.rank.pointValue,
        isSystem: chore.rank.isSystem
      },
      frequency: {
        id: chore.frequency.id,
        name: chore.frequency.name,
        displayName: chore.frequency.displayName,
        daysInterval: chore.frequency.daysInterval,
        isSystem: chore.frequency.isSystem
      },
      isComplete: chore.isComplete,
      nextReset: chore.nextReset,
      currentStreak: chore.currentStreak,
      totalCompletions: chore.totalCompletions,
      assignedTo: chore.assignedTo ? {
        id: chore.assignedTo.id,
        name: chore.assignedTo.name
      } : null,
      createdBy: {
        id: chore.createdBy.id,
        name: chore.createdBy.name
      },
      lastCompletion: chore.completions[0] ? {
        completedAt: chore.completions[0].completedAt,
        completedBy: {
          id: chore.completions[0].user.id,
          name: chore.completions[0].user.name
        }
      } : null
    }))

    return res.status(200).json(formattedChores)
  } catch (error) {
    console.error('Error fetching chores:', error)
    return res.status(500).json({ error: 'Failed to fetch chores' })
  }
}

export default withAuth(handler)
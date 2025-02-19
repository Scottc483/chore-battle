// api/chores/get.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../middleware/auth'
import { ChoreWithRelations } from '../../lib/types/chores'
import { ChoreResponse } from '../../lib/types/chores'

const prisma = new PrismaClient()

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { decodedUser } = req.body

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
        rankPoints: {
          select: {
            pointValue: true
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
      },
      orderBy: [
        { isComplete: 'asc' },
        { nextReset: 'asc' }
      ]
    }) as ChoreWithRelations[]

    const formattedChores: ChoreResponse[] = chores.map((chore) => ({
      id: chore.id,
      title: chore.title,
      description: chore.description,
      difficulty: chore.difficulty,
      frequency: chore.frequency,
      isComplete: chore.isComplete,
      nextReset: chore.nextReset,
      currentStreak: chore.currentStreak,
      totalCompletions: chore.totalCompletions,
      pointValue: chore.rankPoints.pointValue,
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
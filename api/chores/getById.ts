// api/chores/getById.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import prisma from '../../lib/prisma'
import { ChoreWithRelations, ChoreResponse } from '../../lib/types/chores'
import { isChoreExpired, getChoreResetData } from '../../lib/utils/chores'


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { decodedUser } = req.body
  const { id } = req.query

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to view chores' })
  }

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid chore ID' })
  }

  try {
    const chore = await prisma.chore.findUnique({
      where: { id },
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
          take: 5, // Get the 5 most recent completions
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
    }) as ChoreWithRelations

    if (!chore) {
      return res.status(404).json({ error: 'Chore not found' })
    }

    // Check if user has access to this chore (belongs to their household)
    if (chore.householdId !== decodedUser.householdId) {
      return res.status(403).json({ error: 'You do not have access to this chore' })
    }

    // Check if chore is expired and needs to be reset
    let updatedChore = chore
    if (isChoreExpired(chore.nextReset)) {
      const resetData = getChoreResetData(chore.frequency)
      updatedChore = await prisma.chore.update({
        where: { id: chore.id },
        data: resetData,
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
            take: 5,
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
      }) as ChoreWithRelations
    }

    // Format the response to match the same structure as the list endpoint
    const formattedChore: ChoreResponse = {
      id: updatedChore.id,
      title: updatedChore.title,
      description: updatedChore.description,
      rank: {
        id: updatedChore.rank.id,
        name: updatedChore.rank.name,
        displayName: updatedChore.rank.displayName,
        pointValue: updatedChore.rank.pointValue,
        isSystem: updatedChore.rank.isSystem
      },
      frequency: {
        id: updatedChore.frequency.id,
        name: updatedChore.frequency.name,
        displayName: updatedChore.frequency.displayName,
        daysInterval: updatedChore.frequency.daysInterval,
        isSystem: updatedChore.frequency.isSystem
      },
      isComplete: updatedChore.isComplete,
      nextReset: updatedChore.nextReset,
      currentStreak: updatedChore.currentStreak,
      totalCompletions: updatedChore.totalCompletions,
      assignedTo: updatedChore.assignedTo ? {
        id: updatedChore.assignedTo.id,
        name: updatedChore.assignedTo.name
      } : null,
      createdBy: {
        id: updatedChore.createdBy.id,
        name: updatedChore.createdBy.name
      },
      lastCompletion: updatedChore.completions[0] ? {
        completedAt: updatedChore.completions[0].completedAt,
        completedBy: {
          id: updatedChore.completions[0].user.id,
          name: updatedChore.completions[0].user.name
        }
      } : null,
    }

    return res.status(200).json(formattedChore)
  } catch (error) {
    console.error('Error fetching chore:', error)
    return res.status(500).json({ error: 'Failed to fetch chore' })
  }
}
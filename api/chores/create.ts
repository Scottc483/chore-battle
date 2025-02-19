// api/chores/create.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient, Prisma } from '@prisma/client'
import { withAuth } from '../middleware/auth'
import { choreSchema } from '../../lib/validations/chores'

const prisma = new PrismaClient()

async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!req.body) {
        return res.status(400).json({ error: 'Request body is required' })
    }

    const { decodedUser } = req.body

    if (!decodedUser.householdId) {
        return res.status(403).json({ error: 'User must be part of a household to create chores' })
    }

    try {
        // Validate the incoming data against the schema
        const validatedData = choreSchema.parse(req.body.data)
        
        // Find existing rank points for this difficulty in the household
        const rankPoints = await prisma.choreRankPoints.findUnique({
            where: {
                rank_householdId: {
                    rank: validatedData.difficulty,
                    householdId: decodedUser.householdId
                }
            }
        })

        if (!rankPoints) {
            return res.status(400).json({ 
                error: `No rank points found for difficulty level "${validatedData.difficulty}" in this household` 
            })
        }

        // Calculate next reset date based on frequency
        const nextReset = new Date()
        switch (validatedData.frequency) {
            case 'DAILY':
                nextReset.setDate(nextReset.getDate() + 1)
                break
            case 'WEEKLY':
                nextReset.setDate(nextReset.getDate() + 7)
                break
            case 'MONTHLY':
                nextReset.setMonth(nextReset.getMonth() + 1)
                break
        }
        
        // Construct base chore data with proper type
        const choreData: Prisma.ChoreCreateInput = {
            title: validatedData.title,
            description: validatedData.description || '',
            difficulty: validatedData.difficulty,
            frequency: validatedData.frequency,
            isComplete: false,
            currentStreak: 0,
            totalCompletions: 0,
            nextReset: nextReset,
            lastReset: new Date(),
            createdBy: {
                connect: {
                    id: decodedUser.userId
                }
            },
            household: {
                connect: {
                    id: decodedUser.householdId
                }
            },
            rankPoints: {
                connect: {
                    id: rankPoints.id
                }
            }
        }

        // Add assignedTo if provided
        if (validatedData.assignedToId) {
            // Verify the assigned user is in the same household
            const assignedUser = await prisma.user.findFirst({
                where: {
                    id: validatedData.assignedToId,
                    householdId: decodedUser.householdId
                }
            })

            if (!assignedUser) {
                return res.status(400).json({ 
                    error: 'Assigned user must be in the same household' 
                })
            }

            choreData.assignedTo = {
                connect: {
                    id: validatedData.assignedToId
                }
            }
        }

        const chore = await prisma.chore.create({
            data: choreData,
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
                }
            }
        })

        return res.status(201).json(chore)
    } catch (error) {
        console.error('Error creating chore:', error)
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return res.status(400).json({ error: 'A chore with this title already exists' })
            }
        }
        return res.status(500).json({ error: 'Failed to create chore', message: error })
    }
}

export default withAuth(handler)
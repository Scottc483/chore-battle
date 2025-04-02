// api/chores/create.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient, Prisma } from '@prisma/client'
import { withAuth } from '../../lib/middleware/auth'
import { choreSchema } from '../../lib/validations/chores'
import { calculateNextReset } from '../../lib/utils/chores'
import prisma from '../../lib/prisma'

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

        // Create validation schema with available options
        const schema = choreSchema(
            availableRanks.map(r => r.id),
            availableFrequencies.map(f => f.id)
        )

        // Validate the incoming data
        const validatedData = schema.parse(req.body.data)

        // Get the frequency for calculating next reset
        const frequency = await prisma.choreFrequency.findFirst({
            where: {
                id: validatedData.frequencyId,
                householdId: decodedUser.householdId
            }
        })

        if (!frequency) {
            return res.status(400).json({ 
                error: 'Invalid frequency selected'
            })
        }

        // Calculate next reset date
        const now = new Date()
        const nextReset = calculateNextReset(now, frequency)
        
        // Construct base chore data
        const choreData: Prisma.ChoreCreateInput = {
            title: validatedData.title,
            description: validatedData.description || '',
            isComplete: false,
            currentStreak: 0,
            totalCompletions: 0,
            nextReset: nextReset,
            lastReset: now,
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
            rank: {
                connect: {
                    id: validatedData.rankId
                }
            },
            frequency: {
                connect: {
                    id: validatedData.frequencyId
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
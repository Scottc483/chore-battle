// api/frequencies/create.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient, Prisma } from '@prisma/client'
import { frequencySchema } from '../../lib/validations/choreFrequencies'
import { withAuth } from '../middleware/auth'
import prisma from '../../lib/prisma'

async function createFrequency(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to create frequencies' })
  }

  if (!req.body.data) {
    return res.status(400).json({ error: 'Request body is required' })
  }

  try {
    const validatedData = frequencySchema.parse(req.body.data)

    // Check if frequency with same name exists in household
    const existingFrequency = await prisma.choreFrequency.findFirst({
      where: {
        householdId: decodedUser.householdId,
        name: {
          equals: validatedData.name,
          mode: 'insensitive' // Case insensitive check
        }
      }
    })

    if (existingFrequency) {
      return res.status(400).json({
        error: `A frequency named "${validatedData.name}" already exists in this household`
      })
    }

    const frequency = await prisma.choreFrequency.create({
      data: {
        ...validatedData,
        isSystem: false, // User-created frequencies are never system frequencies
        household: {
          connect: {
            id: decodedUser.householdId
          }
        }
      }
    })

    return res.status(201).json(frequency)
  } catch (error) {
    console.error('Error creating frequency:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'A frequency with this name already exists' })
      }
    }
    return res.status(500).json({ error: 'Failed to create frequency' })
  }
}

export default withAuth(createFrequency)
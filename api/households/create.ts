// api/households/create.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { nanoid } from 'nanoid'
import prisma from '../../lib/prisma'

export default async function createHousehold(req: VercelRequest, res: VercelResponse) {
  try {
    const { name } = req.body
    const { decodedUser } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Household name is required' })
    }

    // Check if user is already in a household
    const user = await prisma.user.findUnique({
      where: { id: decodedUser.userId },
      select: { householdId: true }
    })

    if (user?.householdId) {
      return res.status(400).json({
        error: 'You are already a member of a household. Leave that household first.'
      })
    }

    // Generate a unique invite code using nanoid
    const inviteCode = nanoid(8).toUpperCase()

    // Create the household with the user as owner
    const household = await prisma.household.create({
      data: {
        name,
        inviteCode,
        owner: {
          connect: { id: decodedUser.userId }
        },
        members: {
          connect: { id: decodedUser.userId }
        },
        // Create default chore ranks
        choreRanks: {
          createMany: {
            data: [
              { name: 'QUICK_WIN', displayName: 'Quick Win', pointValue: 5, isSystem: true },
              { name: 'PIECE_OF_CAKE', displayName: 'Piece of Cake', pointValue: 10, isSystem: true },
              { name: 'STANDARD', displayName: 'Standard', pointValue: 15, isSystem: true },
              { name: 'CHALLENGE', displayName: 'Challenge', pointValue: 25, isSystem: true },
              { name: 'DEEP_CLEAN', displayName: 'Deep Clean', pointValue: 40, isSystem: true }
            ]
          }
        },
        // Create default chore frequencies
        choreFrequencies: {
          createMany: {
            data: [
              { name: 'DAILY', displayName: 'Daily', daysInterval: 1, isSystem: true },
              { name: 'WEEKLY', displayName: 'Weekly', daysInterval: 7, isSystem: true },
              { name: 'BIWEEKLY', displayName: 'Every Two Weeks', daysInterval: 14, isSystem: true },
              { name: 'MONTHLY', displayName: 'Monthly', daysInterval: 30, isSystem: true }
            ]
          }
        }
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        choreRanks: true,
        choreFrequencies: true
      }
    })

    // Update the user's householdId
    await prisma.user.update({
      where: { id: decodedUser.userId },
      data: { householdId: household.id }
    })

    return res.status(201).json({ 
      success: true,
      message: 'Household created successfully',
      household 
    })
  } catch (error) {
    console.error('Failed to create household:', error)
    return res.status(500).json({ error: 'Failed to create household' })
  }
}
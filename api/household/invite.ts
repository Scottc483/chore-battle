// api/households/join.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { withAuth } from '../middleware/auth'
import prisma from '../../lib/prisma'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { decodedUser } = req.body
  const { inviteCode } = req.body

  if (!inviteCode) {
    return res.status(400).json({ error: 'Invite code is required' })
  }

  try {
    // Find the household with this invite code
    const household = await prisma.household.findUnique({
      where: {
        inviteCode
      }
    })

    if (!household) {
      return res.status(404).json({ error: 'Invalid invite code' })
    }

    // Check if user is already in a household
    const user = await prisma.user.findUnique({
      where: {
        id: decodedUser.userId
      }
    })

    if (user?.householdId) {
      return res.status(400).json({ 
        error: 'You are already a member of a household. You must leave your current household before joining a new one.' 
      })
    }

    // Add user to the household
    const updatedUser = await prisma.user.update({
      where: {
        id: decodedUser.userId
      },
      data: {
        householdId: household.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        householdId: true,
        household: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
            owner: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Generate a new JWT token with updated user info including householdId
    // This depends on how you're handling JWT tokens in your authentication system
    
    return res.status(200).json({ 
      success: true,
      message: `You have successfully joined ${household.name}`,
      user: updatedUser
    })
  } catch (error) {
    console.error('Error joining household:', error)
    return res.status(500).json({ error: 'Failed to join household' })
  }
}

export default withAuth(handler)
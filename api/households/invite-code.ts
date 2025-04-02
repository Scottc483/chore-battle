// api/households/invite-code.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { withAuth } from '../../lib/middleware/auth'
import { nanoid } from 'nanoid'
import prisma from '../../lib/prisma'

async function handler(req: VercelRequest, res: VercelResponse) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { decodedUser } = req.body
  try {
    // Find the household where the user is the owner
    const household = await prisma.household.findFirst({
      where: {
        ownerId: decodedUser.userId
      }
    })

    if (!household) {
      return res.status(403).json({ error: 'Only household owners can generate invite codes' })
    }

    // Generate a new 8-character invite code
    const inviteCode = nanoid(8).toUpperCase()

    // Update the household with the new code
    const updatedHousehold = await prisma.household.update({
      where: {
        id: household.id
      },
      data: {
        inviteCode
      }
    })

    return res.status(200).json({ inviteCode: updatedHousehold.inviteCode })
  } catch (error) {
    console.error('Error generating invite code:', error)
    return res.status(500).json({ error: 'Failed to generate invite code' })
  }
}

export default withAuth(handler)
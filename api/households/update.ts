// api/households/update.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'

export default async function updateHousehold(req: VercelRequest, res: VercelResponse) {
  try {

    const { name } = req.body
    const { decodedUser } = req.body
    const  id  = decodedUser.householdId
    // Check if user is the owner of the household
    const household = await prisma.household.findFirst({
      where: {
        id: id as string,
        ownerId: decodedUser.userId
      }
    })

    if (!household) {
      return res.status(403).json({ error: 'Only the household owner can update details' })
    }

    if (!name) {
      return res.status(400).json({ error: 'Household name is required' })
    }

    // Update the household
    const updatedHousehold = await prisma.household.update({
      where: { id: id as string },
      data: { name },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return res.status(200).json({ 
      success: true,
      message: 'Household updated successfully',
      household: updatedHousehold 
    })
  } catch (error) {
    console.error('Failed to update household:', error)
    return res.status(500).json({ error: 'Failed to update household' })
  }
}
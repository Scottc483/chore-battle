// api/households/update.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { withAuth } from '../../lib/middleware/auth'
import { householdUpdateSchema } from '../../lib/validations/households';

 async function updateHousehold(req: VercelRequest, res: VercelResponse) {
  try {
    const validationResult = householdUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.errors });
    } 

    const { name, decodedUser } = req.body
    console.log('decodedUser', decodedUser)
    if (!decodedUser) {
      return res.status(400).json({ error: 'User information is required' })
    }

    const id = decodedUser.householdId
    console.log('id', id) 
    
    // Check if user is the owner of the household
    const household = await prisma.household.findFirst({
      where: {
        id: id as string,
        ownerId: decodedUser.userId
      }
    })
    console.log('household', household)


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

export default withAuth(updateHousehold)
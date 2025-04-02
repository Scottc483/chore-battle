// api/households/delete.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { withAuth } from '../../lib/middleware/auth'
import { generateToken } from '../../lib/middleware/generateToken'
import { householdDeleteSchema } from '../../lib/validations/households';
async function deleteHousehold(req: VercelRequest, res: VercelResponse) {
  try {

    const validationResult = householdDeleteSchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.errors });
    }
    
    const { id } = req.query
    const { decodedUser } = req.body

    // Check if user is the owner of the household
    const household = await prisma.household.findFirst({
      where: {
        id: id as string,
        ownerId: decodedUser.userId
      }
    })

    if (!household) {
      return res.status(403).json({ error: 'Only the household owner can delete the household' })
    }

    // First, we need to update all users in this household to remove their householdId
    await prisma.user.updateMany({
      where: { householdId: id as string },
      data: { householdId: null }
    })

    // Delete all related records in a transaction
    await prisma.$transaction([
      // Delete point history
      prisma.pointHistory.deleteMany({
        where: { householdId: id as string }
      }),
      // Delete chore completions
      prisma.choreCompletion.deleteMany({
        where: { householdId: id as string }
      }),
      // Delete chores
      prisma.chore.deleteMany({
        where: { householdId: id as string }
      }),
      // Delete reward claims
      prisma.rewardClaim.deleteMany({
        where: { reward: { householdId: id as string } }
      }),
      // Delete rewards
      prisma.reward.deleteMany({
        where: { householdId: id as string }
      }),
      // Delete chore frequencies
      prisma.choreFrequency.deleteMany({
        where: { householdId: id as string }
      }),
      // Delete chore ranks
      prisma.choreRank.deleteMany({
        where: { householdId: id as string }
      }),
      // Finally, delete the household
      prisma.household.delete({
        where: { id: id as string }
      })
    ])

    return res.status(200).json({ 
      success: true,
      message: 'Household deleted successfully',
      token: generateToken({
        userId: decodedUser.userId,
        email: decodedUser.email,
        householdId: ""
      })
    })
  } catch (error) {
    console.error('Failed to delete household:', error)
    return res.status(500).json({ error: 'Failed to delete household' })
  }
}

export default withAuth(deleteHousehold)
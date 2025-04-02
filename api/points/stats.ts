import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { withAuth } from '../../lib/middleware/auth'

async function getUserStats(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body
  const { userId = decodedUser.id } = req.query

  try {
    const stats = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId as string },
        select: {
          id: true,
          name: true,
          totalPoints: true,
          householdId: true
        }
      })

      if (!user || user.householdId !== decodedUser.householdId) {
        throw new Error('User not found or not in same household')
      }

      const [
        totalChoresCompleted,
        pointsByType,
        currentStreaks
      ] = await Promise.all([
        tx.choreCompletion.count({
          where: { userId: userId as string }
        }),
        tx.pointHistory.groupBy({
          by: ['type'],
          where: { userId: userId as string },
          _sum: { points: true }
        }),
        tx.chore.findMany({
          where: {
            householdId: user.householdId? user.householdId : decodedUser.householdId,
            currentStreak: { gt: 0 },
            lastCompletedBy: userId as string
          },
          select: {
            id: true,
            title: true,
            currentStreak: true
          }
        })
      ])

      return {
        user,
        stats: {
          totalChoresCompleted,
          pointsByType,
          currentStreaks
        }
      }
    })

    return res.status(200).json(stats)
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return res.status(500).json({ error: 'Failed to fetch user statistics' })
  }
}

export default withAuth(getUserStats) 
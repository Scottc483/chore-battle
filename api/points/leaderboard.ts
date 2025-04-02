import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { withAuth } from '../../lib/middleware/auth'

async function getLeaderboard(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body
  const { timeframe = 'all' } = req.query // 'all', 'week', 'month'

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to view leaderboard' })
  }

  try {
    let dateFilter = {}
    const now = new Date()
    
    if (timeframe === 'week') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7))
      dateFilter = { createdAt: { gte: weekAgo } }
    } else if (timeframe === 'month') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1))
      dateFilter = { createdAt: { gte: monthAgo } }
    }

    const leaderboard = await prisma.user.findMany({
      where: {
        householdId: decodedUser.householdId
      },
      select: {
        id: true,
        name: true,
        totalPoints: true,
        _count: {
          select: {
            ChoreCompletion: true
          }
        },
        pointHistory: {
          where: dateFilter,
          select: {
            points: true
          }
        }
      },
      orderBy: {
        totalPoints: 'desc'
      }
    })

    // Calculate period-specific points
    const formattedLeaderboard = leaderboard.map(user => ({
      id: user.id,
      name: user.name,
      totalPoints: user.totalPoints,
      totalCompletions: user._count.ChoreCompletion,
      periodPoints: user.pointHistory.reduce((sum, ph) => sum + ph.points, 0)
    }))

    return res.status(200).json({
      timeframe,
      leaderboard: formattedLeaderboard
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
}

export default withAuth(getLeaderboard) 
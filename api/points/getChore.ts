import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'

async function getChorePointHistory(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body
  const { choreId } = req.query
  const { page = '1', limit = '10' } = req.query

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to view chore point history' })
  }

  try {
    // First verify the chore belongs to the user's household
    const chore = await prisma.chore.findFirst({
      where: {
        id: choreId as string,
        householdId: decodedUser.householdId
      }
    })

    if (!chore) {
      return res.status(404).json({ error: 'Chore not found or not accessible' })
    }

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [pointHistory, total] = await Promise.all([
      prisma.pointHistory.findMany({
        where: {
          choreId: choreId as string,
          householdId: decodedUser.householdId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.pointHistory.count({
        where: {
          choreId: choreId as string,
          householdId: decodedUser.householdId
        }
      })
    ])

    return res.status(200).json({
      pointHistory,
      pagination: {
        total,
        pages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        perPage: limitNum
      }
    })
  } catch (error) {
    console.error('Error fetching chore point history:', error)
    return res.status(500).json({ error: 'Failed to fetch chore point history' })
  }
}

export default getChorePointHistory 
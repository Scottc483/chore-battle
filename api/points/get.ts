import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'

async function getPointHistory(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body
  const { page = '1', limit = '10' } = req.query

  try {
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [pointHistory, total] = await Promise.all([
      prisma.pointHistory.findMany({
        where: {
          userId: decodedUser.id
        },
        include: {
          chore: {
            select: {
              id: true,
              title: true
            }
          },
          rewardClaim: {
            select: {
              id: true,
              reward: {
                select: {
                  id: true,
                  title: true
                }
              }
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
          userId: decodedUser.id
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
    console.error('Error fetching point history:', error)
    return res.status(500).json({ error: 'Failed to fetch point history' })
  }
}

export default getPointHistory 
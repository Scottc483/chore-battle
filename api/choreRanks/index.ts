// api/chore-ranks/index.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { withAuth } from '../../lib/middleware/auth'
import getChoreRanks from './get'
import createChoreRank from './create'
import updateChoreRank from './update'
import deleteChoreRank from './delete'

async function handler(req: VercelRequest, res: VercelResponse) {
  switch (req.method) {
    case 'GET':
      return getChoreRanks(req, res)
    case 'POST':
      return createChoreRank(req, res)
    case 'PATCH':
      return updateChoreRank(req, res)
    case 'DELETE':
      return deleteChoreRank(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

export default handler;
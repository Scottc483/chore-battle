import { VercelRequest, VercelResponse } from '@vercel/node'
import { withAuth } from '../../lib/middleware/auth'
import getPointHistory from './get'
import getHouseholdPointHistory from './getHousehold'
import getChorePointHistory from './getChore'

async function handler(req: VercelRequest, res: VercelResponse) {
  const { choreId, type } = req.query

  // Handle specific actions based on query params
  if (type === 'household') {
    return getHouseholdPointHistory(req, res)
  }

  if (choreId) {
    return getChorePointHistory(req, res)
  }

  // Default to user's point history
  switch (req.method) {
    case 'GET':
      return getPointHistory(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

export default withAuth(handler) 
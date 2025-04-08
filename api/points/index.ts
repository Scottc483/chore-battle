import { VercelRequest, VercelResponse } from '@vercel/node'
import { withAuth } from '../../lib/middleware/auth'
import getPointHistory from './get'
import getHouseholdPointHistory from './getHousehold'
import getChorePointHistory from './getChore'
import getUserStats from './stats'
import createPointHistory from './create'

async function handler(req: VercelRequest, res: VercelResponse) {
  const { choreId, type, action } = req.query

  // Handle specific actions
  if (action === 'stats') {
    return getUserStats(req, res)
  }

  // Handle specific types
  if (type === 'household') {
    return getHouseholdPointHistory(req, res)
  }

  if (choreId) {
    return getChorePointHistory(req, res)
  }

  // Handle standard operations
  switch (req.method) {
    case 'GET':
      return getPointHistory(req, res)
    case 'POST':
      return createPointHistory(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

export default withAuth(handler) 
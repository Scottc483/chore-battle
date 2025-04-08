import { VercelRequest, VercelResponse } from '@vercel/node'
import { withAuth } from '../../lib/middleware/auth'
import getRewards from './get'
import createReward from './create'
import claimReward from './claim'
import updateClaim from './updateClaim'
import getUserClaims from './claims'

async function handler(req: VercelRequest, res: VercelResponse) {
  const { action, id } = req.query

  // Handle specific actions
  if (action === 'claim' && id) {
    return claimReward(req, res)
  }

  if (action === 'claims') {
    return getUserClaims(req, res)
  }

  if (req.url?.includes('/claims/')) {
    return updateClaim(req, res)
  }

  // Handle standard CRUD operations
  switch (req.method) {
    case 'GET':
      return getRewards(req, res)
    case 'POST':
      return createReward(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

export default withAuth(handler) 
// api/households/index.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { withAuth } from '../../lib/middleware/auth'
import getHouseholds from './get'
import createHousehold from './create'
import updateHousehold from './update'
import deleteHousehold from './delete'
import getHouseholdById from './getById'
import getHouseholdMembers from './getMembers'
import removeMember from './removeMember'
import transferOwnership from './transferOwnership'
import leaveHousehold from './leave'
import joinHousehold from './join'
import generateInviteCode from './invite-code'

async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query

  // Handle specific actions
  if (action) {
    switch (action) {
      case 'members':
        return req.method === 'GET' 
          ? getHouseholdMembers(req, res)
          : req.method === 'DELETE'
          ? removeMember(req, res)
          : res.status(405).json({ error: 'Method not allowed' })
      case 'transfer':
        return req.method === 'POST'
          ? transferOwnership(req, res)
          : res.status(405).json({ error: 'Method not allowed' })
      case 'leave':
        return req.method === 'POST'
          ? leaveHousehold(req, res)
          : res.status(405).json({ error: 'Method not allowed' })
      case 'join':
        return req.method === 'POST'
          ? joinHousehold(req, res)
          : res.status(405).json({ error: 'Method not allowed' })
      case 'invite':
        return req.method === 'POST'
          ? generateInviteCode(req, res)
          : res.status(405).json({ error: 'Method not allowed' })
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  }

  // Handle standard CRUD operations
  switch (req.method) {
    case 'GET':
      return id ? getHouseholdById(req, res) : getHouseholds(req, res)
    case 'POST':
      return createHousehold(req, res)
    case 'PATCH':
      return updateHousehold(req, res)
    case 'DELETE':
      return deleteHousehold(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

export default withAuth(handler)
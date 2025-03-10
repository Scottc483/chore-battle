// api/households/index.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { withAuth } from '../middleware/auth'
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
  console.log('id in index household', id)
  // Handle specific actions based on query params
  if (action) {
    switch (action) {
      case 'members':
        if (req.method === 'GET') return getHouseholdMembers(req, res)
        if (req.method === 'DELETE') return removeMember(req, res)
        break
      case 'transfer-ownership':
        if (req.method === 'POST') return transferOwnership(req, res)
        break
      case 'leave':
        if (req.method === 'POST') return leaveHousehold(req, res)
        break
      case 'join':
        if (req.method === 'POST') return joinHousehold(req, res)
        break
      case 'invite-code':
        if (req.method === 'POST') return withAuth(generateInviteCode)(req, res)
        break
    }
  }
  
  // Handle standard CRUD operations
  switch (req.method) {
    case 'GET':
      if (id) {
        return getHouseholdById(req, res)
      }
      return getHouseholds(req, res)
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

export default handler;
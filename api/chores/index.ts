// api/chores/index.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { withAuth } from '../middleware/auth'
import getChores from './get'
import createChore from './create'
import updateChore from './update'
import deleteChore from './delete'
import getChoresById from './getById'

async function handler(req: VercelRequest, res: VercelResponse) {
  const {id} = req.query
  console.log('id', id)
  switch (req.method) {
    case 'GET':
      if (id) {
        return getChoresById(req, res)
      }
      return getChores(req, res)
    case 'POST':
      return createChore(req, res)
    case 'PATCH':
      return updateChore(req, res)
    case 'DELETE':
      return deleteChore(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

export default withAuth(handler)
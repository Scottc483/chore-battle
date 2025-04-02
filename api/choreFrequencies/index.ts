// api/chores/index.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { withAuth } from '../../lib/middleware/auth'
import  getFrequencies  from './get'
import  createFrequency  from './create'
import  updateFrequency  from './update'
import  deleteFrequency  from './delete'


async function handler(req: VercelRequest, res: VercelResponse) {
  
  switch (req.method) {
    case 'GET':
      return getFrequencies(req, res)
    case 'POST':
      return createFrequency(req, res)
    case 'PATCH':
      return updateFrequency(req, res)
    case 'DELETE':
      return deleteFrequency(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

export default handler;
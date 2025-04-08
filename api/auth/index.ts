import { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../lib/middleware/cors'
import registerHandler from './register'
import loginHandler from './login'

async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query

  switch (action) {
    case 'register':
      return registerHandler(req, res)
    case 'login':
      return loginHandler(req, res)
    default:
      return res.status(400).json({ error: 'Invalid auth action' })
  }
}

export default withCors(handler) 
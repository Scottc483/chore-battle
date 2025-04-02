// api/middleware/auth.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'
import { withCors } from './cors'

const JWT_SECRET = process.env.JWT_SECRET as string
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}

function authHandler(handler: Function) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      console.log('Starting auth middleware');

      // Get token from Authorization header
      // console.log('req', req.headers)
      const authHeader = req.headers.authorization
      // console.log('authHeader', authHeader)
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      const token = authHeader.split(' ')[1]
      
      // Verify JWT token
      const decodedUser = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        householdId?: string;
      }
   
      if (!decodedUser.userId || !decodedUser.email) {
        return res.status(401).json({ error: 'Invalid token' })
      }
      
      // console.log('Decoded user:', decodedUser);
      
      // Create a new request object with the decoded user
      const authenticatedReq = {
        ...req,
        body: {
          ...req.body,
          decodedUser
        }
      };
      
      // Call the original handler with the modified request
      return handler(authenticatedReq, res)
    } catch (error) {
      console.error('Auth Error:', error);
      return res.status(401).json({ error: 'Invalid token' })
    }
  }
}

// Compose the middlewares by first applying CORS and then auth
export function withAuth(handler: Function) {
  return withCors(authHandler(handler));
}
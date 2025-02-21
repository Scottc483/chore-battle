// lib/types/auth.ts
import { VercelRequest } from '@vercel/node'

export interface AuthenticatedRequest extends VercelRequest {
  body: {
    decodedUser: {
      userId: string
      householdId: string | null
      // add any other decoded user properties
    }
    [key: string]: any
  }
}
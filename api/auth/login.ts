// api/auth/login.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import * as z from 'zod'
import jwt from 'jsonwebtoken'
import { loginSchema } from '../../lib/validations/auth'
import prisma from '../../lib/prisma'
import { withCors } from '../../lib/middleware/cors' // Import your CORS middleware
import  { generateToken }  from '../../lib/middleware/generateToken'

// Ensure JWT_SECRET exists and is a string
const JWT_SECRET = process.env.JWT_SECRET as string
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}

async function loginHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validate input
    const result = loginSchema.safeParse(req.body)
    console.log("Login request received", result);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: result.error.issues,
      })
    }

    const { email, password } = req.body

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        household: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    console.log('Current server time:', new Date().toISOString());
    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      householdId: user.householdId || undefined
    })

    // Return user data and token
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        totalPoints: user.totalPoints,
        household: user.household,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Apply the CORS middleware
export default withCors(loginHandler);
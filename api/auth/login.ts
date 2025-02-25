import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import * as z from 'zod'
import jwt from 'jsonwebtoken'
import { loginSchema } from '../../lib/validations/auth'
import prisma from '../../lib/prisma'

// Login input validation schema

// Ensure JWT_SECRET exists and is a string
const JWT_SECRET = process.env.JWT_SECRET as string
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validate input
    const result = loginSchema.safeParse(req.body)
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

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        householdId: user.householdId 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

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
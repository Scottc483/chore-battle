// Purpose: Register a new user with the application.
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import * as z from 'zod'
import { registerSchema } from '../../lib/validations/auth'
import prisma from '../../lib/prisma'


// Compare this snippet from ChoreBattleAPI/api/auth/login.ts:
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validate input
    const result = registerSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: result.error.issues,
      })
    }
    
    const { email, password, name } = req.body

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        totalPoints: 0,
      },
      select: {
        id: true,
        email: true,
        name: true,
        totalPoints: true,
      },
    })

    return res.status(201).json({
      message: 'User registered successfully',
      user,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

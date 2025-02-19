// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { choreRanks, choreFrequencies } from '../lib/validations/chores'

enum ChoreRank {
  QUICK_WIN = 'QUICK_WIN',
  PIECE_OF_CAKE = 'PIECE_OF_CAKE',
  SMOOTH_SAILING = 'SMOOTH_SAILING',
  WEEKDAY_WARRIOR = 'WEEKDAY_WARRIOR',
  CHALLENGE_READY = 'CHALLENGE_READY',
  TASK_MASTER = 'TASK_MASTER',
  WEEKEND_WARRIOR = 'WEEKEND_WARRIOR',
  SUPER_ACHIEVER = 'SUPER_ACHIEVER',
  HOUSE_HERO = 'HOUSE_HERO',
  LEGENDARY_EFFORT = 'LEGENDARY_EFFORT',
}

enum ChoreFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.pointHistory.deleteMany()
  await prisma.choreCompletion.deleteMany()
  await prisma.chore.deleteMany()
  await prisma.choreRankPoints.deleteMany()
  await prisma.rewardClaim.deleteMany()
  await prisma.reward.deleteMany()
  await prisma.user.deleteMany()
  await prisma.household.deleteMany()

  // Create test users with hashed passwords
  const password = await bcrypt.hash('password123', 10)
  
  const user1 = await prisma.user.create({
    data: {
      email: 'john@example.com',
      name: 'John Doe',
      password: password,
      totalPoints: 0
    }
  })

  const user2 = await prisma.user.create({
    data: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      password: password,
      totalPoints: 0
    }
  })

  // Create a household
  const household = await prisma.household.create({
    data: {
      name: 'The Doe Household',
      inviteCode: 'DOE123',
      ownerId: user1.id,
      members: {
        connect: [
          {id: user1.id},
          { id: user2.id }
        ]
      }
    }
  })

  // Create rank points for the household
  const rankPointsData: { rank: ChoreRank; points: number }[] = [
    { rank: ChoreRank.QUICK_WIN, points: 5 },
    { rank: ChoreRank.PIECE_OF_CAKE, points: 10 },
    { rank: ChoreRank.SMOOTH_SAILING, points: 15 },
    { rank: ChoreRank.WEEKDAY_WARRIOR, points: 25 },
    { rank: ChoreRank.CHALLENGE_READY, points: 35 },
    { rank: ChoreRank.TASK_MASTER, points: 50 },
    { rank: ChoreRank.WEEKEND_WARRIOR, points: 75 },
    { rank: ChoreRank.SUPER_ACHIEVER, points: 100 },
    { rank: ChoreRank.HOUSE_HERO, points: 150 },
    { rank: ChoreRank.LEGENDARY_EFFORT, points: 200 },
  ]

  const choreRankPoints = await Promise.all(
    rankPointsData.map(({ rank, points }) =>
      prisma.choreRankPoints.create({
        data: {
          rank,
          pointValue: points,
          householdId: household.id
        }
      })
    )
  )

  // Create some sample chores
  const chores: { 
    title: string; 
    description: string; 
    difficulty: ChoreRank; 
    frequency: ChoreFrequency 
  }[] = [
    {
      title: 'Make Bed',
      description: 'Make the bed neat and tidy',
      difficulty: ChoreRank.QUICK_WIN,
      frequency: ChoreFrequency.DAILY,
    },
    {
      title: 'Do Dishes',
      description: 'Wash and put away dishes',
      difficulty: ChoreRank.WEEKDAY_WARRIOR,
      frequency: ChoreFrequency.DAILY,
    },
    {
      title: 'Clean Garage',
      description: 'Organize and clean the garage',
      difficulty: ChoreRank.LEGENDARY_EFFORT,
      frequency: ChoreFrequency.MONTHLY,
    }
  ]

  for (const chore of chores) {
    const rankPoint = choreRankPoints.find(rp => rp.rank === chore.difficulty)
    if (!rankPoint) continue

    const nextReset = new Date()
    switch (chore.frequency) {
      case ChoreFrequency.DAILY:
        nextReset.setDate(nextReset.getDate() + 1)
        break
      case ChoreFrequency.WEEKLY:
        nextReset.setDate(nextReset.getDate() + 7)
        break
      case ChoreFrequency.MONTHLY:
        nextReset.setMonth(nextReset.getMonth() + 1)
        break
    }

    await prisma.chore.create({
      data: {
        title: chore.title,
        description: chore.description,
        difficulty: chore.difficulty,
        frequency: chore.frequency,
        nextReset,
        householdId: household.id,
        createdById: user1.id,
        rankPointsId: rankPoint.id
      }
    })
  }

  // Create some rewards
  const rewards = [
    {
      title: 'Movie Night',
      description: 'Choose a movie for family movie night',
      pointsCost: 100,
      isRepeatable: true
    },
    {
      title: 'Sleep In',
      description: 'Sleep in for an extra hour',
      pointsCost: 50,
      isRepeatable: true
    }
  ]

  for (const reward of rewards) {
    await prisma.reward.create({
      data: {
        ...reward,
        householdId: household.id
      }
    })
  }

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
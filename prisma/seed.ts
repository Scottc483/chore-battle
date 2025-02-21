// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.pointHistory.deleteMany()
  await prisma.choreCompletion.deleteMany()
  await prisma.chore.deleteMany()
  await prisma.choreRank.deleteMany()
  await prisma.choreFrequency.deleteMany()
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

  // Create ranks for the household
  const ranksData = [
    { name: 'QUICK_WIN', displayName: 'Quick Win', pointValue: 5, isSystem: true },
    { name: 'PIECE_OF_CAKE', displayName: 'Piece of Cake', pointValue: 10, isSystem: true },
    { name: 'SMOOTH_SAILING', displayName: 'Smooth Sailing', pointValue: 15, isSystem: true },
    { name: 'WEEKDAY_WARRIOR', displayName: 'Weekday Warrior', pointValue: 25, isSystem: true },
    { name: 'CHALLENGE_READY', displayName: 'Challenge Ready', pointValue: 35, isSystem: true },
    { name: 'TASK_MASTER', displayName: 'Task Master', pointValue: 50, isSystem: true },
    { name: 'WEEKEND_WARRIOR', displayName: 'Weekend Warrior', pointValue: 75, isSystem: true },
    { name: 'SUPER_ACHIEVER', displayName: 'Super Achiever', pointValue: 100, isSystem: true },
    { name: 'HOUSE_HERO', displayName: 'House Hero', pointValue: 150, isSystem: true },
    { name: 'LEGENDARY_EFFORT', displayName: 'Legendary Effort', pointValue: 200, isSystem: true },
    // Custom rank example
    { name: 'QUICK_CLEAN', displayName: 'Quick Clean', pointValue: 8, isSystem: false },
  ]

  const ranks = await Promise.all(
    ranksData.map(rank =>
      prisma.choreRank.create({
        data: {
          ...rank,
          householdId: household.id
        }
      })
    )
  )

  // Create frequencies
  const frequenciesData = [
    // System defaults
    { name: 'DAILY', displayName: 'Daily', daysInterval: 1, isSystem: true },
    { name: 'WEEKLY', displayName: 'Weekly', daysInterval: 7, isSystem: true },
    { name: 'MONTHLY', displayName: 'Monthly', daysInterval: 30, isSystem: true },
    // Custom frequencies
    { name: 'BIWEEKLY', displayName: 'Every Two Weeks', daysInterval: 14, isSystem: false },
    { name: 'QUARTERLY', displayName: 'Every Three Months', daysInterval: 90, isSystem: false }
  ]

  const frequencies = await Promise.all(
    frequenciesData.map(frequency =>
      prisma.choreFrequency.create({
        data: {
          ...frequency,
          householdId: household.id
        }
      })
    )
  )

  // Create chores
  const choresData = [
    {
      title: 'Make Bed',
      description: 'Make the bed neat and tidy',
      rankName: 'QUICK_WIN',
      frequencyName: 'DAILY',
    },
    {
      title: 'Do Dishes',
      description: 'Wash and put away dishes',
      rankName: 'WEEKDAY_WARRIOR',
      frequencyName: 'DAILY',
      assignTo: user2.id
    },
    {
      title: 'Vacuum Living Room',
      description: 'Vacuum the entire living room floor and furniture',
      rankName: 'CHALLENGE_READY',
      frequencyName: 'WEEKLY',
    },
    {
      title: 'Clean Garage',
      description: 'Organize and clean the garage thoroughly',
      rankName: 'LEGENDARY_EFFORT',
      frequencyName: 'QUARTERLY'
    },
    {
      title: 'Quick Bathroom Cleanup',
      description: 'Wipe down counters and mirrors',
      rankName: 'QUICK_CLEAN', // Custom rank
      frequencyName: 'BIWEEKLY'
    }
  ]

  for (const chore of choresData) {
    const rank = ranks.find(r => r.name === chore.rankName)
    if (!rank) continue

    const frequency = frequencies.find(f => f.name === chore.frequencyName)
    if (!frequency) continue

    const nextReset = new Date()
    nextReset.setDate(nextReset.getDate() + frequency.daysInterval)

    await prisma.chore.create({
      data: {
        title: chore.title,
        description: chore.description,
        rankId: rank.id,
        frequencyId: frequency.id,
        nextReset,
        householdId: household.id,
        createdById: user1.id,
        assignedToId: chore.assignTo,
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
    },
    {
      title: 'Restaurant Choice',
      description: 'Pick the restaurant for the next family dinner out',
      pointsCost: 200,
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
import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const staffPasswordHash = await bcrypt.hash('staff123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pool.local' },
    update: {},
    create: {
      email: 'admin@pool.local',
      name: 'Admin User',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  })

  const staff = await prisma.user.upsert({
    where: { email: 'staff@pool.local' },
    update: {},
    create: {
      email: 'staff@pool.local',
      name: 'Staff User',
      passwordHash: staffPasswordHash,
      role: 'STAFF',
    },
  })

  console.log('Seeded users:', { admin: admin.email, staff: staff.email })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

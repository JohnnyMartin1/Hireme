import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
// Make sure your NextAuth file exports `authOptions`
import { authOptions } from '../../auth/[...nextauth]/route'

const prisma = new PrismaClient()

async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return null
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  return user?.id ?? null
}

// GET: return current user's CandidatePreference (or null)
export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true, preferences: true },
  })

  if (!profile) {
    return NextResponse.json(
      { error: 'Create your profile before setting preferences.' },
      { status: 400 }
    )
  }

  return NextResponse.json(profile.preferences ?? null)
}

// POST: upsert CandidatePreference for the current user
export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!profile) {
    return NextResponse.json(
      { error: 'Create your profile before setting preferences.' },
      { status: 400 }
    )
  }

  const body = await req.json()

  // Helpers
  const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : [])
  const toDate = (v: unknown) =>
    typeof v === 'string' || v instanceof Date ? new Date(v as any) : null

  const data: any = {}

  if ('desiredTitles' in body) data.desiredTitles = arr(body.desiredTitles)
  if ('employment' in body) data.employment = arr(body.employment) // EmploymentType[]
  if ('workModes' in body) data.workModes = arr(body.workModes)     // WorkMode[]
  if ('industries' in body) data.industries = arr(body.industries)
  if ('preferredCities' in body) data.preferredCities = arr(body.preferredCities)

  if ('salaryMin' in body) data.salaryMin = body.salaryMin ?? null
  if ('salaryMax' in body) data.salaryMax = body.salaryMax ?? null
  if ('hourlyRate' in body) data.hourlyRate = body.hourlyRate ?? null
  if ('earliestStart' in body)
    data.earliestStart = body.earliestStart ? toDate(body.earliestStart) : null
  if ('hoursPerWeek' in body) data.hoursPerWeek = body.hoursPerWeek ?? null
  if ('travelPct' in body) data.travelPct = body.travelPct ?? null
  if ('relocate' in body) data.relocate = body.relocate ?? null
  if ('companySizes' in body) data.companySizes = arr(body.companySizes) // CompanySize[]
  if ('workAuth' in body) data.workAuth = body.workAuth ?? null
  if ('clearance' in body) data.clearance = body.clearance ?? null
  if ('sponsorshipOk' in body) data.sponsorshipOk = body.sponsorshipOk ?? null

  try {
    const pref = await prisma.candidatePreference.upsert({
      where: { profileId: profile.id }, // profileId is unique
      create: { profileId: profile.id, ...data },
      update: data,
    })
    return NextResponse.json(pref)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Generate unique referral code
    const referralCode = generateReferralCode(userId)

    // Store in database
    await createReferralCode(userId, referralCode)

    return NextResponse.json({
      referralCode,
      referralUrl: `${process.env.NEXT_PUBLIC_APP_URL}?ref=${referralCode}`,
    })
  } catch (error) {
    console.error("Referral generation error:", error)
    return NextResponse.json({ error: "Failed to generate referral code" }, { status: 500 })
  }
}

function generateReferralCode(userId: string): string {
  // Create a unique, user-friendly referral code
  const prefix = "VIDFORGE"
  const userHash = userId.slice(-4).toUpperCase()
  const random = Math.random().toString(36).substr(2, 4).toUpperCase()
  return `${prefix}-${userHash}${random}`
}

async function createReferralCode(userId: string, code: string) {
  // Replace with your database logic
  console.log(`Creating referral code ${code} for user ${userId}`)

  // Example implementation:
  // await db.referralCodes.create({
  //   data: {
  //     userId,
  //     code,
  //     createdAt: new Date(),
  //     isActive: true,
  //   }
  // })
}

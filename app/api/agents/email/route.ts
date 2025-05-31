import { type NextRequest, NextResponse } from "next/server"
import { emailAgent } from "@/lib/agents/email-agent"

export async function POST(request: NextRequest) {
  console.log("Email Agent API: Request received")

  try {
    const { input } = await request.json()

    if (!input) {
      return NextResponse.json({ error: "Email content is required" }, { status: 400 })
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    console.log("Email Agent: Processing input")
    const result = await emailAgent.process(input)

    console.log("Email Agent: Processing successful")
    return NextResponse.json(result)
  } catch (error) {
    console.error("Email agent error:", error)
    return NextResponse.json(
      {
        error: "Email processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

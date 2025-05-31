import { type NextRequest, NextResponse } from "next/server"
import { jsonAgent } from "@/lib/agents/json-agent"

export async function POST(request: NextRequest) {
  console.log("JSON Agent API: Request received")

  try {
    const { input } = await request.json()

    if (!input) {
      return NextResponse.json({ error: "JSON input is required" }, { status: 400 })
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    console.log("JSON Agent: Processing input")
    const result = await jsonAgent.process(input)

    console.log("JSON Agent: Processing successful")
    return NextResponse.json(result)
  } catch (error) {
    console.error("JSON agent error:", error)
    return NextResponse.json(
      {
        error: "JSON processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

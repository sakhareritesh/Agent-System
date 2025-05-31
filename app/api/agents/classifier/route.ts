import { type NextRequest, NextResponse } from "next/server";
import { classifierAgent } from "@/lib/agents/classifier-agent";

export async function POST(request: NextRequest) {
  console.log("Classifier API: Request received");

  try {
    const body = await request.json();
    const { input, inputType } = body;

    if (!input || typeof input !== "string") {
      console.error("Invalid input provided");
      return NextResponse.json(
        { error: "Valid input string is required" },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("Missing Gemini API key");
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    console.log("Processing input:", { inputType, inputLength: input.length });

    const result = await classifierAgent.process(input, inputType);

    if (!result || !result.classification || !result.extractedData) {
      console.error("Invalid result structure:", result);
      return NextResponse.json(
        { error: "Invalid processing result" },
        { status: 500 }
      );
    }

    console.log("Processing successful:", {
      format: result.classification.format,
      intent: result.classification.intent,
      memoryId: result.memoryId,
      agent: result.processingAgent,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Classifier agent error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown processing error";
    return NextResponse.json(
      {
        error: "Processing failed",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

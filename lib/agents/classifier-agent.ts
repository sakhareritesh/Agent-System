import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import { sharedMemory } from "../memory"
import { jsonAgent } from "./json-agent"
import { emailAgent } from "./email-agent"

const classificationSchema = z.object({
  format: z.enum(["email", "json", "pdf", "text"]),
  intent: z.enum(["invoice", "rfq", "complaint", "regulation", "general", "quote_request", "support", "webhook"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

export class ClassifierAgent {
  async process(input: string, inputType?: string) {
    console.log("Classifier Agent: Starting classification...")

    try {
      // Step 1: Classify the input using Gemini
      const { object: classification } = await generateObject({
        model: google("gemini-1.5-flash"),
        schema: classificationSchema,
        prompt: `You are a document classification AI agent. Analyze the following input and classify it accurately.

Input Type Hint: ${inputType || "unknown"}
Content: ${input}

Classify the:
1. Format: What type of content is this? (email, json, pdf, text)
2. Intent: What is the business purpose? (invoice, rfq, complaint, regulation, general, quote_request, support, webhook)
3. Confidence: How confident are you? (0-1 scale)
4. Reasoning: Explain your classification decision

Look for:
- Email indicators: From:, Subject:, email addresses, signatures
- JSON structure: brackets, key-value pairs, webhook patterns
- Business keywords: RFQ, invoice, complaint, regulation, urgent
- Intent signals: request for quote, payment terms, compliance requirements

Be precise and confident in your classification.`,
      })

      console.log("Classification result:", classification)

      // Step 2: Route to appropriate specialized agent
      let extractedData: any = {}
      let anomalies: string[] = []
      let processingAgent = "classifier_agent"

      try {
        if (classification.format === "email") {
          console.log("Routing to Email Agent...")
          const emailResult = await emailAgent.process(input)
          extractedData = emailResult.extractedData
          anomalies = emailResult.anomalies || []
          processingAgent = "email_agent"
        } else if (classification.format === "json") {
          console.log("Routing to JSON Agent...")
          const jsonResult = await jsonAgent.process(input)
          extractedData = jsonResult.extractedData
          anomalies = jsonResult.anomalies || []
          processingAgent = "json_agent"
        } else {
          console.log("Using basic extraction...")
          extractedData = await this.basicExtraction(input, classification.intent)
          processingAgent = "basic_extractor"
        }
      } catch (agentError) {
        console.error("Agent processing error:", agentError)
        anomalies.push(`Processing error: ${agentError instanceof Error ? agentError.message : "Unknown error"}`)

        // Fallback to basic extraction
        extractedData = await this.basicExtraction(input, classification.intent)
        processingAgent = "fallback_extractor"
      }

      // Step 3: Store in shared memory
      const memoryId = sharedMemory.store({
        source: input.substring(0, 500),
        format: classification.format,
        intent: classification.intent,
        extractedData,
        anomalies: anomalies.length > 0 ? anomalies : undefined,
        processingAgent,
      })

      console.log("Processing completed successfully")

      return {
        classification,
        extractedData,
        memoryId,
        timestamp: new Date().toISOString(),
        anomalies: anomalies.length > 0 ? anomalies : undefined,
        processingAgent,
      }
    } catch (error) {
      console.error("Classifier Agent error:", error)
      throw new Error(`Classification failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private async basicExtraction(input: string, intent: string) {
    try {
      const { object } = await generateObject({
        model: google("gemini-1.5-flash"),
        schema: z.object({
          summary: z.string(),
          keyPoints: z.array(z.string()),
          entities: z.array(
            z.object({
              type: z.string(),
              value: z.string(),
            }),
          ),
          urgency: z.enum(["low", "medium", "high"]),
          actionItems: z.array(z.string()),
        }),
        prompt: `Extract key information from this ${intent} content:

${input}

Provide:
1. A concise summary (2-3 sentences)
2. Key points or requirements (bullet points)
3. Important entities (dates, amounts, names, companies, etc.)
4. Urgency level based on language and deadlines
5. Suggested action items

Focus on business-relevant information and be thorough.`,
      })

      return object
    } catch (error) {
      console.error("Basic extraction error:", error)
      return {
        summary: "Failed to extract detailed information",
        keyPoints: ["Processing error occurred"],
        entities: [],
        urgency: "medium" as const,
        actionItems: ["Review input and try again"],
      }
    }
  }
}

export const classifierAgent = new ClassifierAgent()

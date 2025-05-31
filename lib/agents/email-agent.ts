import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"

const emailExtractionSchema = z.object({
  sender: z.object({
    name: z.string(),
    email: z.string(),
    company: z.string().optional(),
    title: z.string().optional(),
  }),
  subject: z.string(),
  intent: z.enum(["rfq", "quote_request", "complaint", "support", "invoice_inquiry", "general", "urgent_request"]),
  urgency: z.enum(["low", "medium", "high"]),
  extractedData: z.object({
    requestType: z.string(),
    requirements: z.array(z.string()),
    deadline: z.string().optional(),
    budget: z.string().optional(),
    quantities: z
      .array(
        z.object({
          item: z.string(),
          quantity: z.number().optional(),
          specifications: z.string().optional(),
        }),
      )
      .optional(),
    contactPreference: z.string().optional(),
    keyDates: z.array(z.string()).optional(),
  }),
  conversationId: z.string(),
  confidence: z.number().min(0).max(1),
  sentiment: z.enum(["positive", "neutral", "negative"]),
})

export class EmailAgent {
  async process(emailContent: string) {
    console.log("Email Agent: Starting email processing...")

    try {
      const { object: extracted } = await generateObject({
        model: google("gemini-1.5-flash"),
        schema: emailExtractionSchema,
        prompt: `You are an email processing specialist for CRM systems. Parse this email content and extract comprehensive structured data:

${emailContent}

Extract and analyze:

SENDER INFORMATION:
- Full name, email address, company, job title
- Look in signatures, headers, and email body

EMAIL CLASSIFICATION:
- Subject line
- Intent: rfq, quote_request, complaint, support, invoice_inquiry, general, urgent_request
- Urgency: low/medium/high (look for urgent keywords, deadlines, CAPS)
- Sentiment: positive/neutral/negative tone

BUSINESS DETAILS:
- Type of request or inquiry
- Specific requirements or specifications
- Deadlines and important dates
- Budget mentions or price discussions
- Quantities and items requested
- Preferred contact method
- All key dates mentioned

CONVERSATION TRACKING:
- Generate a unique conversation ID
- Confidence score for extraction accuracy

Look for urgency indicators:
- Words like "urgent", "ASAP", "deadline", "immediately"
- Specific dates and timelines
- Escalation language

Be thorough and business-focused. Extract all actionable information.`,
      })

      console.log("Email extraction completed")

      // Generate comprehensive CRM record
      const crmRecord = {
        leadId: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        source: "email",
        timestamp: new Date().toISOString(),
        contact: extracted.sender,
        communication: {
          subject: extracted.subject,
          intent: extracted.intent,
          urgency: extracted.urgency,
          sentiment: extracted.sentiment,
          conversationId: extracted.conversationId,
        },
        opportunity: extracted.extractedData,
        nextActions: this.generateNextActions(extracted.intent, extracted.urgency, extracted.sentiment),
        confidence: extracted.confidence,
        priority: this.calculatePriority(extracted.urgency, extracted.intent, extracted.sentiment),
      }

      return {
        extractedData: crmRecord,
        conversationId: extracted.conversationId,
        anomalies: this.detectAnomalies(extracted),
      }
    } catch (error) {
      console.error("Email Agent processing error:", error)
      throw new Error(`Email processing failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private generateNextActions(intent: string, urgency: string, sentiment: string): string[] {
    const actions = []

    // Intent-based actions
    if (intent === "rfq" || intent === "quote_request") {
      actions.push("Prepare detailed quotation")
      actions.push("Review technical specifications")
      actions.push("Check inventory and pricing")
      actions.push("Assign to sales team")
    }

    if (intent === "complaint") {
      actions.push("Escalate to customer service manager")
      actions.push("Investigate reported issue")
      actions.push("Prepare resolution plan")
    }

    if (intent === "support") {
      actions.push("Route to technical support")
      actions.push("Create support ticket")
    }

    // Urgency-based actions
    if (urgency === "high") {
      actions.unshift("PRIORITY: Respond within 2 hours")
      actions.push("Notify team lead immediately")
    }

    // Sentiment-based actions
    if (sentiment === "negative") {
      actions.push("Handle with extra care")
      actions.push("Consider escalation to senior staff")
    }

    // Standard actions
    actions.push("Send acknowledgment email")
    actions.push("Update CRM with interaction")

    return actions
  }

  private calculatePriority(
    urgency: string,
    intent: string,
    sentiment: string,
  ): "low" | "medium" | "high" | "critical" {
    let score = 0

    // Urgency scoring
    if (urgency === "high") score += 3
    else if (urgency === "medium") score += 2
    else score += 1

    // Intent scoring
    if (intent === "complaint") score += 2
    else if (intent === "rfq" || intent === "quote_request") score += 2
    else if (intent === "urgent_request") score += 3

    // Sentiment scoring
    if (sentiment === "negative") score += 2

    if (score >= 7) return "critical"
    if (score >= 5) return "high"
    if (score >= 3) return "medium"
    return "low"
  }

  private detectAnomalies(extracted: any): string[] {
    const anomalies = []

    // Email format validation
    if (!extracted.sender.email.includes("@") || !extracted.sender.email.includes(".")) {
      anomalies.push("Invalid or suspicious email format")
    }

    // Confidence check
    if (extracted.confidence < 0.7) {
      anomalies.push("Low confidence in extraction accuracy")
    }

    // Business logic validation
    if (
      extracted.intent === "rfq" &&
      (!extracted.extractedData.requirements || extracted.extractedData.requirements.length === 0)
    ) {
      anomalies.push("RFQ detected but no clear requirements identified")
    }

    // Urgency vs content mismatch
    if (extracted.urgency === "high" && !extracted.extractedData.deadline) {
      anomalies.push("High urgency claimed but no specific deadline mentioned")
    }

    // Missing critical information
    if (!extracted.sender.name || extracted.sender.name.length < 2) {
      anomalies.push("Sender name missing or incomplete")
    }

    if (extracted.intent === "quote_request" && !extracted.extractedData.quantities) {
      anomalies.push("Quote request without quantity specifications")
    }

    return anomalies
  }
}

export const emailAgent = new EmailAgent()

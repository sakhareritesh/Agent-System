import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"

// FlowBit schema - standardized format for extracted data
const flowBitSchema = z.object({
  id: z.string(),
  type: z.string(),
  source: z.string(),
  timestamp: z.string(),
  data: z.object({
    amount: z.number().optional(),
    currency: z.string().optional(),
    vendor: z.string().optional(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    status: z.string().optional(),
    lineItems: z
      .array(
        z.object({
          description: z.string(),
          quantity: z.number().optional(),
          unitPrice: z.number().optional(),
          total: z.number().optional(),
        }),
      )
      .optional(),
  }),
  metadata: z.object({
    confidence: z.number(),
    processingAgent: z.string(),
    anomalies: z.array(z.string()).optional(),
  }),
})

export class JsonAgent {
  async process(jsonInput: string) {
    console.log("JSON Agent: Starting JSON processing...")

    let parsedJson: any
    const anomalies: string[] = []

    // Step 1: Parse and validate JSON
    try {
      parsedJson = JSON.parse(jsonInput)
      console.log("JSON parsed successfully")
    } catch (error) {
      anomalies.push("Invalid JSON format - could not parse")
      throw new Error("Invalid JSON input")
    }

    // Step 2: Analyze and extract data using Gemini
    try {
      const { object: analysis } = await generateObject({
        model: google("gemini-1.5-flash"),
        schema: z.object({
          extractedData: z.object({
            id: z.string(),
            type: z.string(),
            vendor: z.string().optional(),
            amount: z.number().optional(),
            currency: z.string().optional(),
            description: z.string().optional(),
            dueDate: z.string().optional(),
            status: z.string().optional(),
            lineItems: z
              .array(
                z.object({
                  description: z.string(),
                  quantity: z.number().optional(),
                  unitPrice: z.number().optional(),
                  total: z.number().optional(),
                }),
              )
              .optional(),
          }),
          detectedAnomalies: z.array(z.string()),
          confidence: z.number().min(0).max(1),
          businessContext: z.string(),
        }),
        prompt: `You are a JSON processing specialist. Analyze this JSON data and extract it into a standardized business format:

${JSON.stringify(parsedJson, null, 2)}

Extract and standardize:
1. ID (use existing ID or generate descriptive one)
2. Type (invoice, order, webhook, payment, etc.)
3. Vendor/supplier/company name
4. Amount and currency (if financial)
5. Description of the transaction/event
6. Due date or important dates
7. Status (pending, approved, completed, etc.)
8. Line items with quantities and prices (if applicable)

Also identify anomalies:
- Missing critical fields for the document type
- Inconsistent data types or formats
- Invalid amounts, dates, or values
- Suspicious or unusual patterns
- Data quality issues

Provide:
- Confidence score (0-1)
- Business context explanation
- Comprehensive anomaly detection

Be thorough and business-focused.`,
      })

      console.log("JSON analysis completed")

      // Step 3: Add detected anomalies
      anomalies.push(...analysis.detectedAnomalies)

      // Step 4: Create FlowBit standardized format
      const flowBitData = {
        id: analysis.extractedData.id,
        type: analysis.extractedData.type,
        source: "json_agent",
        timestamp: new Date().toISOString(),
        data: analysis.extractedData,
        metadata: {
          confidence: analysis.confidence,
          processingAgent: "json_agent",
          anomalies: anomalies.length > 0 ? anomalies : undefined,
          businessContext: analysis.businessContext,
        },
      }

      // Step 5: Validate against FlowBit schema
      try {
        const validatedData = flowBitSchema.parse(flowBitData)
        console.log("FlowBit validation successful")

        return {
          extractedData: validatedData,
          anomalies: anomalies.length > 0 ? anomalies : undefined,
        }
      } catch (validationError) {
        console.warn("FlowBit validation failed:", validationError)
        anomalies.push("Data does not fully conform to FlowBit schema")

        return {
          extractedData: flowBitData,
          anomalies,
        }
      }
    } catch (error) {
      console.error("JSON Agent processing error:", error)
      throw new Error(`JSON processing failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
}

export const jsonAgent = new JsonAgent()

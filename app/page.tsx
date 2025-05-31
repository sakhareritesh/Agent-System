"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Mail, FileJson, FileText, Brain, Database, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProcessingResult {
  classification: {
    format: string
    intent: string
    confidence: number
    reasoning: string
  }
  extractedData: any
  memoryId: string
  timestamp: string
  anomalies?: string[]
  processingAgent: string
}

export default function MultiAgentSystem() {
  const [input, setInput] = useState("")
  const [inputType, setInputType] = useState<"email" | "json" | "text">("email")
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [memory, setMemory] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleProcess = async () => {
    if (!input.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/agents/classifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, inputType }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setResult(data)

      // Fetch updated memory
      try {
        const memoryResponse = await fetch("/api/memory")
        if (memoryResponse.ok) {
          const memoryData = await memoryResponse.json()
          setMemory(memoryData.entries || [])
        }
      } catch (memoryError) {
        console.warn("Failed to fetch memory:", memoryError)
      }
    } catch (error) {
      console.error("Processing failed:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const clearMemory = async () => {
    try {
      await fetch("/api/memory", { method: "DELETE" })
      setMemory([])
    } catch (error) {
      console.error("Failed to clear memory:", error)
    }
  }

  const sampleInputs = {
    email: `From: john.doe@acmecorp.com
Subject: Urgent RFQ - Manufacturing Equipment

Hi there,

We need a quote for 50 units of industrial pumps for our new facility. 
This is urgent as we need to finalize our vendor selection by Friday.

Specifications:
- Flow rate: 100 GPM
- Pressure: 150 PSI
- Material: Stainless steel

Please send your best pricing and delivery timeline.

Best regards,
John Doe
Procurement Manager
ACME Corp`,
    json: `{
  "webhook_type": "invoice_received",
  "invoice_id": "INV-2024-001",
  "vendor": "TechSupply Inc",
  "amount": 15750.00,
  "currency": "USD",
  "due_date": "2024-02-15",
  "line_items": [
    {
      "description": "Server Hardware",
      "quantity": 2,
      "unit_price": 5000.00,
      "total": 10000.00
    },
    {
      "description": "Network Equipment",
      "quantity": 1,
      "unit_price": 5750.00,
      "total": 5750.00
    }
  ],
  "status": "pending_approval"
}`,
    text: `REGULATION NOTICE: New environmental compliance requirements for manufacturing facilities effective March 1, 2024. All facilities must implement waste reduction protocols and submit quarterly reports. Companies must designate a compliance officer and submit initial assessment by April 15, 2024.`,
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Brain className="h-10 w-10 text-blue-600" />
          Multi-Agent Processing System
        </h1>
        <p className="text-gray-600 text-lg">
          Intelligent document classification and extraction using Gemini AI agents
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Powered by Gemini AI
          </Badge>
          <Badge variant="secondary">Free Tier</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="xl:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Input Processing
              </CardTitle>
              <CardDescription>Submit content for AI classification and extraction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={inputType} onValueChange={(value) => setInputType(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="email" className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="json" className="flex items-center gap-1">
                    <FileJson className="h-4 w-4" />
                    JSON
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => setInput(sampleInputs.email)} className="w-full">
                    📧 Load Sample RFQ Email
                  </Button>
                </TabsContent>
                <TabsContent value="json" className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => setInput(sampleInputs.json)} className="w-full">
                    📄 Load Sample Invoice JSON
                  </Button>
                </TabsContent>
                <TabsContent value="text" className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => setInput(sampleInputs.text)} className="w-full">
                    📋 Load Sample Regulation
                  </Button>
                </TabsContent>
              </Tabs>

              <Textarea
                placeholder={`Enter ${inputType} content here...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />

              <Button onClick={handleProcess} disabled={loading || !input.trim()} className="w-full" size="lg">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing with Gemini AI...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Process with AI Agents
                  </>
                )}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="xl:col-span-2 space-y-4">
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>🎯 Processing Results</span>
                  <Badge variant="outline">{result.processingAgent}</Badge>
                </CardTitle>
                <CardDescription>Classification and extracted data from Gemini AI agents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Classification Results */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-blue-800">Format</div>
                    <div className="text-lg font-bold text-blue-900">{result.classification.format}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-green-800">Intent</div>
                    <div className="text-lg font-bold text-green-900">{result.classification.intent}</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-purple-800">Confidence</div>
                    <div className="text-lg font-bold text-purple-900">
                      {Math.round((result.classification.confidence || 0) * 100)}%
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                {result.classification.reasoning && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">🧠 AI Reasoning:</h4>
                    <p className="text-sm text-gray-700">{result.classification.reasoning}</p>
                  </div>
                )}

                {/* Extracted Data */}
                {result.extractedData && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">📊 Extracted Data:</h4>
                    <pre className="text-sm overflow-auto max-h-64 bg-white p-3 rounded border">
                      {JSON.stringify(result.extractedData, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Anomalies */}
                {result.anomalies && result.anomalies.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Anomalies Detected:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {result.anomalies.map((anomaly, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-yellow-600">•</span>
                          <span>{anomaly}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-xs text-gray-500 border-t pt-2">
                  Memory ID: {result.memoryId} | Processed: {new Date(result.timestamp).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Memory Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Shared Memory
                </span>
                {memory.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearMemory}>
                    Clear Memory
                  </Button>
                )}
              </CardTitle>
              <CardDescription>Recent processing history across all AI agents</CardDescription>
            </CardHeader>
            <CardContent>
              {memory.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No entries in memory yet</p>
                  <p className="text-sm text-gray-400">Process some content to see the history</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {memory
                    .slice(-10)
                    .reverse()
                    .map((entry, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {entry.format || "unknown"}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {entry.intent || "unknown"}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-500">
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : "unknown"}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm truncate">
                          {entry.source ? entry.source.substring(0, 150) + "..." : "No source data"}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

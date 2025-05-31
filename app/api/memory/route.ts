import { NextResponse } from "next/server"
import { sharedMemory } from "@/lib/memory"

export async function GET() {
  try {
    const entries = sharedMemory.getAll()
    const stats = sharedMemory.getStats()

    console.log("Memory retrieved:", { entryCount: entries.length, stats })

    return NextResponse.json({
      entries,
      stats,
      success: true,
    })
  } catch (error) {
    console.error("Memory retrieval error:", error)
    return NextResponse.json({ error: "Failed to retrieve memory" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    sharedMemory.clear()
    console.log("Memory cleared successfully")
    return NextResponse.json({ message: "Memory cleared successfully", success: true })
  } catch (error) {
    console.error("Memory clear error:", error)
    return NextResponse.json({ error: "Failed to clear memory" }, { status: 500 })
  }
}

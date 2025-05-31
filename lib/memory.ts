interface MemoryEntry {
  id: string
  timestamp: string
  source: string
  format: string
  intent: string
  extractedData: any
  conversationId?: string
  anomalies?: string[]
  processingAgent: string
}

class SharedMemory {
  private entries: Map<string, MemoryEntry> = new Map()

  store(entry: Omit<MemoryEntry, "id" | "timestamp">): string {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    const memoryEntry: MemoryEntry = {
      id,
      timestamp,
      ...entry,
    }

    this.entries.set(id, memoryEntry)

    // Keep only last 50 entries to prevent memory bloat
    if (this.entries.size > 50) {
      const oldestKey = Array.from(this.entries.keys())[0]
      this.entries.delete(oldestKey)
    }

    console.log(`Memory stored: ${id} - ${entry.format}/${entry.intent}`)
    return id
  }

  get(id: string): MemoryEntry | undefined {
    return this.entries.get(id)
  }

  getAll(): MemoryEntry[] {
    return Array.from(this.entries.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
  }

  getByConversationId(conversationId: string): MemoryEntry[] {
    return Array.from(this.entries.values()).filter((entry) => entry.conversationId === conversationId)
  }

  clear(): void {
    this.entries.clear()
    console.log("Memory cleared")
  }

  getStats() {
    const entries = Array.from(this.entries.values())
    return {
      total: entries.length,
      byFormat: entries.reduce(
        (acc, entry) => {
          acc[entry.format] = (acc[entry.format] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
      byIntent: entries.reduce(
        (acc, entry) => {
          acc[entry.intent] = (acc[entry.intent] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    }
  }
}

export const sharedMemory = new SharedMemory()

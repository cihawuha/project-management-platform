import { isSupabaseConfigured } from "@/lib/supabase"

function getStore<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setStore<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

function genId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createLocalService<T extends { id: string }>(storageKey: string) {
  return {
    isLocal: !isSupabaseConfigured,

    async fetchAll(): Promise<T[]> {
      return getStore<T>(storageKey)
    },

    async create(item: Omit<T, "id">): Promise<T> {
      const newItem = { ...item, id: genId() } as T
      const items = getStore<T>(storageKey)
      items.unshift(newItem)
      setStore(storageKey, items)
      return newItem
    },

    async update(id: string, updates: Partial<T>): Promise<T> {
      const items = getStore<T>(storageKey)
      const idx = items.findIndex((i) => i.id === id)
      if (idx === -1) throw new Error("记录不存在")
      items[idx] = { ...items[idx], ...updates }
      setStore(storageKey, items)
      return items[idx]
    },

    async remove(id: string): Promise<void> {
      const items = getStore<T>(storageKey)
      setStore(storageKey, items.filter((i) => i.id !== id))
    },
  }
}

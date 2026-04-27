function toSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (ch) => "_" + ch.toLowerCase())
}

function toCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase())
}

export function camelToSnake<T>(obj: T): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(camelToSnake)
  if (typeof obj === "object" && !(obj instanceof Date) && !(obj instanceof File)) {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      result[toSnakeKey(key)] = camelToSnake(value)
    }
    return result
  }
  return obj
}

export function snakeToCamel<T>(obj: any): T {
  if (obj === null || obj === undefined) return obj as T
  if (Array.isArray(obj)) return obj.map(snakeToCamel) as T
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[toCamelKey(key)] = snakeToCamel(value)
    }
    return result as T
  }
  return obj as T
}

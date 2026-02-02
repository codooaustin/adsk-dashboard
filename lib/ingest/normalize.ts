import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Load all product aliases into a Map for fast batch lookups
 * Returns Map<normalized_alias, product_key>
 */
export async function loadProductAliasesMap(
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  const aliasMap = new Map<string, string>()

  const { data: aliases, error } = await supabase
    .from('product_aliases')
    .select('alias, product_key')

  if (error) {
    console.warn('Failed to load product aliases:', error)
    return aliasMap
  }

  if (aliases) {
    for (const alias of aliases) {
      const normalized = alias.alias.trim().toLowerCase()
      aliasMap.set(normalized, alias.product_key)
    }
  }

  console.log(`Loaded ${aliasMap.size} product aliases into memory`)
  return aliasMap
}

/**
 * Normalize product name using in-memory alias map (batch mode)
 * Returns canonical product_key if found, otherwise returns normalized product name
 */
export function normalizeProductNameBatch(
  productName: string,
  aliasMap: Map<string, string>
): string {
  if (!productName || typeof productName !== 'string') {
    return 'unknown'
  }

  const normalized = productName.trim().toLowerCase()

  // Look up in memory map
  const productKey = aliasMap.get(normalized)
  if (productKey) {
    return productKey
  }

  // If no alias found, return normalized product name
  return normalized
}

/**
 * Normalize product name by looking up in product_aliases table
 * Returns canonical product_key if found, otherwise returns normalized product name
 * 
 * @deprecated Use normalizeProductNameBatch for better performance
 */
export async function normalizeProductName(
  productName: string,
  supabase: SupabaseClient
): Promise<string> {
  if (!productName || typeof productName !== 'string') {
    return 'unknown'
  }

  const normalized = productName.trim().toLowerCase()

  // Look up in product_aliases table (case-insensitive)
  const { data: alias, error } = await supabase
    .from('product_aliases')
    .select('product_key')
    .ilike('alias', normalized)
    .single()

  if (!error && alias) {
    return alias.product_key
  }

  // If no alias found, return normalized product name
  return normalized
}

/**
 * Normalize user identifier (typically email)
 */
export function normalizeUserKey(userIdentifier: string): string {
  if (!userIdentifier || typeof userIdentifier !== 'string') {
    return 'unknown'
  }

  return userIdentifier.trim().toLowerCase()
}

/**
 * Normalize project key
 */
export function normalizeProjectKey(projectKey: string | null | undefined): string | null {
  if (!projectKey || typeof projectKey !== 'string') {
    return null
  }

  const normalized = projectKey.trim()
  return normalized || null
}

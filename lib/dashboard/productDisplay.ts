import { SupabaseClient } from '@supabase/supabase-js'
import type { ChartDataPoint } from './chartData'

export const UNGROUPED_TAG = '__ungrouped__'

export interface ProductGroupInfo {
  group_id: string
  group_name: string
}

export interface ProductMetadata {
  colors: Map<string, string>
  displayNames: Map<string, string>
  /** product_key -> group info when product is in a group. Used when "group by groups" is on. */
  productToGroup: Map<string, ProductGroupInfo>
}

export interface ProductNamesDashboard {
  /** product_name -> display_label ?? product_name */
  displayNames: Map<string, string>
  /** product_name -> tag (null = ungrouped) */
  productToTag: Map<string, string | null>
  /** product_name -> color (only when set) */
  productColors: Map<string, string>
  /** product_name -> logo_url (only when set) */
  productLogos: Map<string, string>
}

/** Default palette for chart series when no product-specific color exists. */
export const DEFAULT_CHART_COLORS = [
  '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1',
]

/**
 * Fetch product_names for dashboard: display_label, tag, color, and logo_url. Used for charts (raw product_name only).
 */
export async function fetchProductNamesForDashboard(
  supabase: SupabaseClient
): Promise<ProductNamesDashboard> {
  const { data: rows, error } = await supabase
    .from('product_names')
    .select('product_name, display_label, tag, color, logo_url')
  if (error) {
    console.warn('Failed to fetch product_names for dashboard:', error)
    return { displayNames: new Map(), productToTag: new Map(), productColors: new Map(), productLogos: new Map() }
  }
  const displayNames = new Map<string, string>()
  const productToTag = new Map<string, string | null>()
  const productColors = new Map<string, string>()
  const productLogos = new Map<string, string>()
  rows?.forEach((r) => {
    displayNames.set(r.product_name, r.display_label?.trim() ? r.display_label : r.product_name)
    productToTag.set(r.product_name, r.tag?.trim() ? r.tag : null)
    if (r.color?.trim()) productColors.set(r.product_name, r.color.trim())
    if (r.logo_url?.trim()) productLogos.set(r.product_name, r.logo_url.trim())
  })
  return { displayNames, productToTag, productColors, productLogos }
}

/**
 * Aggregate chart data by tag. product_name -> tag (null = ungrouped). Returns transformed
 * data, display names (tag or "Ungrouped"), and colors from default palette.
 */
export function aggregateChartDataByTag(
  data: ChartDataPoint[],
  productToTag: Map<string, string | null>,
  displayNames: Map<string, string>,
  productColors: Map<string, string>
): { data: ChartDataPoint[]; displayNames: Map<string, string>; colors: Map<string, string> } {
  const out: ChartDataPoint[] = []
  const newDisplayNames = new Map<string, string>()
  const newColors = new Map<string, string>()
  const tagFirstProduct = new Map<string, string>()
  let colorIndex = 0
  const nextColor = () => DEFAULT_CHART_COLORS[colorIndex++ % DEFAULT_CHART_COLORS.length]

  for (const point of data) {
    const sums = new Map<string, number>()
    const date = point.date as string

    Object.keys(point).forEach((k) => {
      if (k === 'date') return
      const v = point[k]
      if (typeof v !== 'number') return
      const tag = productToTag.get(k) ?? null
      const key = tag ?? UNGROUPED_TAG
      sums.set(key, (sums.get(key) ?? 0) + v)
      if (tag) {
        newDisplayNames.set(key, tag)
        if (!tagFirstProduct.has(key)) tagFirstProduct.set(key, k)
      } else {
        newDisplayNames.set(key, 'Ungrouped')
        if (!tagFirstProduct.has(key)) tagFirstProduct.set(key, k)
      }
    })

    const row: ChartDataPoint = { date }
    sums.forEach((val, k) => { row[k] = val })
    out.push(row)
  }

  const assigned = new Set<string>()
  tagFirstProduct.forEach((productKey, tagKey) => {
    const c = productColors.get(productKey)
    if (c) {
      newColors.set(tagKey, c)
      assigned.add(tagKey)
    }
  })
  Array.from(newDisplayNames.keys()).forEach((k) => {
    if (!assigned.has(k)) newColors.set(k, nextColor())
  })

  return { data: out, displayNames: newDisplayNames, colors: newColors }
}

/**
 * Fetch product colors, display names, and group mapping for dashboard charts.
 * displayNames: product_key and alias -> canonical_name.
 * productToGroup: product_key -> { group_id, group_name } when product is in a group.
 */
export async function fetchProductMetadata(
  supabase: SupabaseClient
): Promise<ProductMetadata> {
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('product_key, canonical_name, color')

  if (productsError) {
    console.warn('Failed to fetch products for metadata:', productsError)
    return {
      colors: new Map(),
      displayNames: new Map(),
      productToGroup: new Map(),
    }
  }

  const colors = new Map<string, string>()
  const displayNames = new Map<string, string>()

  products?.forEach((p) => {
    if (p.product_key) {
      displayNames.set(p.product_key, p.canonical_name ?? p.product_key)
      if (p.color) colors.set(p.product_key, p.color)
    }
  })

  const { data: aliases } = await supabase
    .from('product_aliases')
    .select('alias, product_key')

  aliases?.forEach((a) => {
    const name = displayNames.get(a.product_key) ?? a.product_key
    displayNames.set(a.alias, name)
  })

  const productToGroup = new Map<string, ProductGroupInfo>()
  const { data: groups, error: ge } = await supabase.from('product_groups').select('id, name')
  if (!ge) {
    const { data: members } = await supabase
      .from('product_group_members')
      .select('group_id, product_key')

    const groupNames = new Map<string, string>()
    groups?.forEach((g) => groupNames.set(g.id, g.name ?? ''))
    members?.forEach((m) => {
      const group_name = groupNames.get(m.group_id) ?? ''
      productToGroup.set(m.product_key, { group_id: m.group_id, group_name })
    })
  }

  return { colors, displayNames, productToGroup }
}

/**
 * Aggregate chart data by product groups. Products in a group are summed under group_id.
 * Ungrouped products stay as product_key. Returns transformed data, display names, and
 * colors for grouped + ungrouped keys (group color = first member's color).
 */
export function aggregateChartDataByGroup(
  data: ChartDataPoint[],
  productToGroup: Map<string, ProductGroupInfo>,
  displayNames: Map<string, string>,
  productColors: Map<string, string>
): { data: ChartDataPoint[]; displayNames: Map<string, string>; colors: Map<string, string> } {
  const out: ChartDataPoint[] = []
  const newDisplayNames = new Map<string, string>()
  const newColors = new Map<string, string>()
  const groupFirstProduct = new Map<string, string>()

  for (const point of data) {
    const sums = new Map<string, number>()
    const date = point.date as string

    Object.keys(point).forEach((k) => {
      if (k === 'date') return
      const v = point[k]
      if (typeof v !== 'number') return
      const info = productToGroup.get(k)
      const key = info ? info.group_id : k
      sums.set(key, (sums.get(key) ?? 0) + v)
      if (info) {
        newDisplayNames.set(info.group_id, info.group_name)
        if (!groupFirstProduct.has(info.group_id)) groupFirstProduct.set(info.group_id, k)
      } else {
        newDisplayNames.set(k, displayNames.get(k) ?? k)
        const c = productColors.get(k)
        if (c) newColors.set(k, c)
      }
    })

    const row: ChartDataPoint = { date }
    sums.forEach((val, k) => { row[k] = val })
    out.push(row)
  }

  groupFirstProduct.forEach((productKey, groupId) => {
    const c = productColors.get(productKey)
    if (c) newColors.set(groupId, c)
  })

  return { data: out, displayNames: newDisplayNames, colors: newColors }
}

'use client'

import { ReactNode } from 'react'

export type ChartTitleMetric = 'Tokens' | 'Hours' | 'Users'

export interface ChartTitleContentProps {
  metric: ChartTitleMetric
  productName: string | null | undefined
  productDisplayNames: Map<string, string>
  productLogos: Map<string, string>
  defaultTitle: string
  /** When set with single product, suffix becomes "Tokens Consumed - {period}" (e.g. "Monthly", "Daily"). */
  period?: string
}

/**
 * Returns the chart title as ReactNode: defaultTitle, or (logo | displayName) + metric when single product.
 * When period is provided for a single product, token titles use "Tokens Consumed - {period}".
 */
export function chartTitleContent({
  metric,
  productName,
  productDisplayNames,
  productLogos,
  defaultTitle,
  period,
}: ChartTitleContentProps): ReactNode {
  if (!productName) return defaultTitle

  const suffix = period && metric === 'Tokens' ? `Tokens Consumed - ${period}` : metric
  const logoUrl = productLogos.get(productName)
  if (logoUrl) {
    return (
      <>
        <img src={logoUrl} alt="" className="h-[40px] w-auto object-contain flex-shrink-0 mr-3" />
        <span>{suffix}</span>
      </>
    )
  }

  const displayName = productDisplayNames.get(productName) ?? productName
  return <span>{displayName} {suffix}</span>
}

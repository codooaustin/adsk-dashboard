'use client'

import { ReactNode } from 'react'

export type ChartTitleMetric = 'Tokens' | 'Hours' | 'Users'

export interface ChartTitleContentProps {
  metric: ChartTitleMetric
  productName: string | null | undefined
  productDisplayNames: Map<string, string>
  productLogos: Map<string, string>
  defaultTitle: string
}

/**
 * Returns the chart title as ReactNode: defaultTitle, or (logo | displayName) + metric when single product.
 */
export function chartTitleContent({
  metric,
  productName,
  productDisplayNames,
  productLogos,
  defaultTitle,
}: ChartTitleContentProps): ReactNode {
  if (!productName) return defaultTitle

  const logoUrl = productLogos.get(productName)
  if (logoUrl) {
    return (
      <>
        <img src={logoUrl} alt="" className="h-24 w-24 object-contain" />
        <span>{metric}</span>
      </>
    )
  }

  const displayName = productDisplayNames.get(productName) ?? productName
  return <span>{displayName} {metric}</span>
}

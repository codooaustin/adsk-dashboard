import { toPng } from 'html-to-image'

/**
 * Copy chart element to clipboard as an image
 * @param element - The HTML element containing the chart
 * @returns Promise that resolves when image is copied to clipboard
 */
export async function copyChartToClipboard(element: HTMLElement): Promise<void> {
  try {
    // Convert element to PNG with high resolution
    const dataUrl = await toPng(element, {
      pixelRatio: 2, // High resolution
      backgroundColor: '#000000', // Black background
      quality: 1.0, // Maximum quality
    })

    // Convert data URL to blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    // Copy to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ])
  } catch (error) {
    console.error('Failed to copy chart to clipboard:', error)
    throw error
  }
}

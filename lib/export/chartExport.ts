import { toPng } from 'html-to-image'

const PIXEL_RATIO = 2
const BACKGROUND_COLOR = '#000000'

/**
 * Copy chart element to clipboard as an image
 * @param element - The HTML element containing the chart
 * @param options - Optional settings; padding is in logical (CSS) pixels
 * @returns Promise that resolves when image is copied to clipboard
 */
export async function copyChartToClipboard(
  element: HTMLElement,
  options?: { padding?: number },
): Promise<void> {
  const padding = options?.padding ?? 24

  try {
    const dataUrl = await toPng(element, {
      pixelRatio: PIXEL_RATIO,
      backgroundColor: BACKGROUND_COLOR,
      quality: 1.0,
    })

    let blob: Blob

    if (padding <= 0) {
      const response = await fetch(dataUrl)
      blob = await response.blob()
    } else {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = dataUrl
      })

      const pad = padding * PIXEL_RATIO
      const outW = img.naturalWidth + 2 * pad
      const outH = img.naturalHeight + 2 * pad

      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = BACKGROUND_COLOR
      ctx.fillRect(0, 0, outW, outH)
      ctx.drawImage(img, pad, pad, img.naturalWidth, img.naturalHeight)

      blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png', 1)
      })
    }

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

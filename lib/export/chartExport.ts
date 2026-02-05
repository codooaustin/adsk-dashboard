import { toPng } from 'html-to-image'

const PIXEL_RATIO = 2
const BACKGROUND_COLOR = '#000000'

/**
 * Build a PNG blob from the chart element (used so Safari receives a Promise for ClipboardItem).
 */
async function chartElementToPngBlob(
  element: HTMLElement,
  padding: number,
): Promise<Blob> {
  const dataUrl = await toPng(element, {
    pixelRatio: PIXEL_RATIO,
    backgroundColor: BACKGROUND_COLOR,
    quality: 1.0,
  })

  if (padding <= 0) {
    const response = await fetch(dataUrl)
    return response.blob()
  }

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

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png', 1)
  })
}

/**
 * Copy chart element to clipboard as an image.
 * Passes a Promise to ClipboardItem so Safari keeps user-gesture context (avoids NotAllowedError after await).
 */
export async function copyChartToClipboard(
  element: HTMLElement,
  options?: { padding?: number },
): Promise<void> {
  const padding = options?.padding ?? 24

  try {
    const blobPromise = chartElementToPngBlob(element, padding)
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blobPromise,
      }),
    ])
  } catch (error) {
    console.error('Failed to copy chart to clipboard:', error)
    throw error
  }
}

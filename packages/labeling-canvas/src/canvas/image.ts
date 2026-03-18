// ─── Image Processing Utilities ───

/**
 * Create an HTMLImageElement from a URL.
 */
export const createImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = src
    img.setAttribute('crossOrigin', '')
    img.onload = () => resolve(img)
  })
}

/**
 * Set black pixels transparent and apply opacity to non-black pixels.
 */
export const transparentBlackPixel = (
  imageData: ImageData,
  opacity: number,
): ImageData => {
  for (let i = 0; i < imageData.data.length; i += 4) {
    const red = imageData.data[i]
    const green = imageData.data[i + 1]
    const blue = imageData.data[i + 2]

    if (red === 0 && green === 0 && blue === 0) {
      imageData.data[i + 3] = 0
    } else if (opacity) {
      imageData.data[i + 3] = Math.round(255 * opacity * 100) / 100
    }
  }
  return imageData
}

/**
 * Crop image data to the bounding box of non-transparent pixels.
 */
export const cropAlphaArea = (
  imgData: ImageData,
): { canvas: HTMLCanvasElement; minX: number; minY: number } => {
  const findNonTransparentArea = (imageData: ImageData) => {
    const data = imageData.data
    let minX = imageData.width
    let minY = imageData.height
    let maxX = 0
    let maxY = 0

    for (let y = 0; y < imageData.height; y += 1) {
      for (let x = 0; x < imageData.width; x += 1) {
        const index = (y * imageData.width + x) * 4
        if (data[index + 3] > 0) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    return { minX, minY, maxX, maxY }
  }

  const tmpCanvas = document.createElement('canvas')
  const tmpCtx = tmpCanvas.getContext('2d')
  if (!tmpCtx) {
    return { canvas: tmpCanvas, minX: 0, minY: 0 }
  }

  const { minX, minY, maxX, maxY } = findNonTransparentArea(imgData)

  const cropWidth = maxX - minX + 1
  const cropHeight = maxY - minY + 1

  const croppedImageData = tmpCtx.createImageData(cropWidth, cropHeight)

  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      const srcIndex = ((minY + y) * imgData.width + minX + x) * 4
      const destIndex = (y * cropWidth + x) * 4

      croppedImageData.data[destIndex] = imgData.data[srcIndex]
      croppedImageData.data[destIndex + 1] = imgData.data[srcIndex + 1]
      croppedImageData.data[destIndex + 2] = imgData.data[srcIndex + 2]
      croppedImageData.data[destIndex + 3] = imgData.data[srcIndex + 3]
    }
  }

  tmpCanvas.width = cropWidth
  tmpCanvas.height = cropHeight

  tmpCtx.putImageData(croppedImageData, 0, 0)

  return { canvas: tmpCanvas, minX, minY }
}

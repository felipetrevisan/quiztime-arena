export const fileToAvatarDataUrl = async (file: File): Promise<string> => {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Falha ao ler avatar'))
    }
    reader.onerror = () => reject(new Error('Falha ao ler avatar'))
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar avatar'))
    img.src = dataUrl
  })

  const size = 96
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) {
    return dataUrl
  }

  context.clearRect(0, 0, size, size)

  const minSide = Math.min(image.width, image.height)
  const sourceX = (image.width - minSide) / 2
  const sourceY = (image.height - minSide) / 2

  context.drawImage(image, sourceX, sourceY, minSide, minSide, 0, 0, size, size)

  return canvas.toDataURL('image/jpeg', 0.78)
}

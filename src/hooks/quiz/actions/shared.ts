export const getFileExtension = (fileName: string): string => {
  if (!fileName.includes('.')) {
    return 'jpg'
  }

  const chunks = fileName.split('.')
  return chunks[chunks.length - 1]
}

export const revokeBlobUrls = (urls: Record<string, string>) => {
  for (const url of Object.values(urls)) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  }
}

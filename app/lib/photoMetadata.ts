export type PhotoMetadata = {
  fileLastModifiedAt: string | null
  fileName: string
  fileSize: number
  fileType: string
  photoLat: number | null
  photoLong: number | null
  photoTakenAt: string | null
}

function toIsoDate(value: unknown) {
  if (!value) return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString()
    }
  }

  return null
}

function toNumber(value: unknown) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : null
}

export async function readPhotoMetadata(file: File): Promise<PhotoMetadata> {
  const metadata: PhotoMetadata = {
    fileLastModifiedAt: file.lastModified
      ? new Date(file.lastModified).toISOString()
      : null,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    photoLat: null,
    photoLong: null,
    photoTakenAt: null,
  }

  try {
    const exifr = await import('exifr')
    const parsed = await exifr.parse(file, true)

    if (!parsed) return metadata

    metadata.photoLat = toNumber(parsed.latitude ?? parsed.GPSLatitude)
    metadata.photoLong = toNumber(parsed.longitude ?? parsed.GPSLongitude)
    metadata.photoTakenAt =
      toIsoDate(parsed.DateTimeOriginal) ||
      toIsoDate(parsed.CreateDate) ||
      toIsoDate(parsed.ModifyDate)

    return metadata
  } catch (err) {
    console.warn('Could not read photo metadata:', err)
    return metadata
  }
}

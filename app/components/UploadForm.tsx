'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  getCurrentBrowserLocation,
  useBrowserLocation,
} from '@/app/lib/browserLocation'
import { readPhotoMetadata } from '@/app/lib/photoMetadata'
import {
  DEFAULT_CATEGORY,
  DEFAULT_FIND_QUALITY,
  DEFAULT_STOCK_LEVEL,
  FIND_QUALITY_OPTIONS,
  POPULAR_CATEGORIES,
  STOCK_LEVEL_OPTIONS,
} from '@/app/lib/uploadOptions'

export default function UploadForm({
  storeId,
  categories,
}: {
  storeId: number
  categories: string[]
}) {
  const {
    coords: browserCoords,
    requestLocation,
    status: locationStatus,
  } = useBrowserLocation()

  const [category, setCategory] = useState(
    categories[0] || DEFAULT_CATEGORY
  )

  const [stockLevel, setStockLevel] = useState(DEFAULT_STOCK_LEVEL)
  const [findQuality, setFindQuality] = useState(DEFAULT_FIND_QUALITY)
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)

  async function createUploadBatch(
    payload: Record<string, unknown>,
    fallbackPayload: Record<string, unknown>
  ) {
    const enhancedResult = await supabase
      .from('upload_batches')
      .insert(payload)
      .select()
      .single()

    if (!enhancedResult.error) {
      return enhancedResult
    }

    console.warn(
      'Upload batch verification columns unavailable, retrying base insert:',
      enhancedResult.error
    )

    return supabase
      .from('upload_batches')
      .insert(fallbackPayload)
      .select()
      .single()
  }

  async function createUploadRow(
    payload: Record<string, unknown>,
    fallbackPayload: Record<string, unknown>
  ) {
    const enhancedResult = await supabase
      .from('uploads')
      .insert(payload)

    if (!enhancedResult.error) {
      return enhancedResult
    }

    console.warn(
      'Upload photo verification columns unavailable, retrying base insert:',
      enhancedResult.error
    )

    return supabase
      .from('uploads')
      .insert(fallbackPayload)
  }

  const handleUpload = async () => {
    try {
      if (!files || files.length === 0) {
        alert('Please choose at least one photo.')
        return
      }

      setUploading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      console.log('USER:', user)
      console.log('USER ERROR:', userError)

      if (!user) {
        alert('You must be logged in.')
        setUploading(false)
        return
      }

      const uploadLocation =
        await getCurrentBrowserLocation() || browserCoords

      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || null

      const baseBatchPayload = {
        user_id: user.id,
        store_id: storeId,
        category,
        notes,
        visibility_type: 'public',
        status: 'pending',
      }

      const {
        data: batch,
        error: batchError,
      } = await createUploadBatch(
        {
          ...baseBatchPayload,
          client_timezone: timezone,
          upload_accuracy_m: uploadLocation?.accuracyM ?? null,
          upload_lat: uploadLocation?.lat ?? null,
          upload_location_captured_at:
            uploadLocation?.capturedAt || new Date().toISOString(),
          upload_location_source: uploadLocation
            ? 'browser_geolocation'
            : 'not_available',
          upload_long: uploadLocation?.long ?? null,
        },
        baseBatchPayload
      )

      console.log('BATCH:', batch)
      console.log('BATCH ERROR:', batchError)

      if (batchError || !batch) {
        alert('Failed to create upload batch.')
        setUploading(false)
        return
      }

      for (const file of Array.from(files)) {
        console.log('UPLOADING FILE:', file.name)

        const metadata = await readPhotoMetadata(file)
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `${batch.id}/${fileName}`

        console.log('FILE PATH:', filePath)

        const {
          data: storageData,
          error: storageError,
        } = await supabase
          .storage
          .from('uploads')
          .upload(filePath, file)

        console.log('STORAGE DATA:', storageData)
        console.log('STORAGE ERROR:', storageError)

        if (storageError) {
          continue
        }

        const {
          data: publicUrlData,
        } = supabase
          .storage
          .from('uploads')
          .getPublicUrl(filePath)

        console.log('PUBLIC URL:', publicUrlData.publicUrl)

        const baseUploadPayload = {
          batch_id: batch.id,
          photo_url: publicUrlData.publicUrl,
          caption: notes,
          stock_level: stockLevel,
          find_quality: findQuality,
          status: 'pending',
        }

        const {
          error: uploadRowError,
        } = await createUploadRow(
          {
            ...baseUploadPayload,
            photo_lat: metadata.photoLat,
            photo_long: metadata.photoLong,
            photo_metadata: metadata,
            photo_taken_at: metadata.photoTakenAt,
          },
          baseUploadPayload
        )

        console.log('UPLOAD ROW ERROR:', uploadRowError)
      }

      alert('Upload successful!')
    } catch (err) {
      console.error('FULL ERROR:', err)
      alert('Something failed. Check console.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block mb-3 text-sm text-gray-400">
          Popular Categories
        </label>

        <div className="flex flex-wrap gap-2">
          {POPULAR_CATEGORIES.map((popular) => (
            <button
              key={popular}
              type="button"
              onClick={() => setCategory(popular)}
              className={`px-3 py-2 rounded-full text-sm border transition ${
                category === popular
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {popular}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block mb-2 text-sm text-gray-400">
          Category
        </label>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-black border border-gray-700 rounded-lg p-3"
        >
          {categories.map((categoryOption) => (
            <option
              key={categoryOption}
              value={categoryOption}
            >
              {categoryOption}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2 text-sm text-gray-400">
          Stock Level
        </label>

        <select
          value={stockLevel}
          onChange={(e) => setStockLevel(e.target.value)}
          className="w-full bg-black border border-gray-700 rounded-lg p-3"
        >
          {STOCK_LEVEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2 text-sm text-gray-400">
          Find Quality
        </label>

        <select
          value={findQuality}
          onChange={(e) => setFindQuality(e.target.value)}
          className="w-full bg-black border border-gray-700 rounded-lg p-3"
        >
          {FIND_QUALITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2 text-sm text-gray-400">
          Notes
        </label>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-black border border-gray-700 rounded-lg p-3 h-32"
          placeholder="Anything interesting?"
        />
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-gray-200">
              Upload Verification
            </div>

            <div className="mt-1 text-xs text-gray-500">
              {browserCoords
                ? `Location ready${
                    browserCoords.accuracyM
                      ? `, about ${Math.round(browserCoords.accuracyM)}m accuracy`
                      : ''
                  }`
                : locationStatus === 'requesting' || locationStatus === 'checking'
                ? 'Getting location...'
                : 'Location not captured yet'}
            </div>
          </div>

          <button
            type="button"
            onClick={requestLocation}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 transition hover:bg-gray-800"
          >
            Refresh Location
          </button>
        </div>
      </div>

      <div>
        <label className="block mb-2 text-sm text-gray-400">
          Photos
        </label>

        <p className="text-xs text-gray-500 mb-3">
          Upload one or multiple photos from the same section or aisle.
        </p>

        <input
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="w-full bg-black border border-gray-700 rounded-lg p-3"
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
      >
        {uploading
          ? 'Uploading...'
          : 'Upload Photos'}
      </button>
    </div>
  )
}

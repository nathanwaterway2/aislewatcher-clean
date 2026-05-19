'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/app/components/Navbar'
import { getDistanceMiles } from '@/app/lib/browserLocation'
import { getStoreColor } from '@/app/lib/storeStyles'
import {
  DEFAULT_FIND_QUALITY,
  FIND_QUALITY_OPTIONS,
  STOCK_LEVEL_OPTIONS,
  UPLOAD_CATEGORIES,
  UPLOAD_STATUS_OPTIONS,
  withCurrentSelectOption,
  withCurrentStringOption,
} from '@/app/lib/uploadOptions'

export default function AdminUploadsPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null)

  useEffect(() => {
    loadUploads()
  }, [statusFilter])

  async function loadUploads() {
    setLoading(true)

    let uploadQuery = supabase
      .from('uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)

    if (statusFilter !== 'all') {
      uploadQuery = uploadQuery.eq('status', statusFilter)
    } else {
      uploadQuery = uploadQuery.in('status', [
        'pending',
        'approved',
        'rejected',
      ])
    }

    const { data: uploadsData, error: uploadsError } = await uploadQuery

    if (uploadsError) {
      console.error('UPLOADS ERROR:', uploadsError)
      setBatches([])
      setLoading(false)
      return
    }

    const batchIds = [
      ...new Set(
        (uploadsData || [])
          .map((u) => Number(u.batch_id))
          .filter(Boolean)
      ),
    ]

    let batchRows: any[] = []

    if (batchIds.length > 0) {
      const { data: batchData } = await supabase
        .from('upload_batches')
        .select('*')
        .in('id', batchIds)

      batchRows = batchData || []
    }

    const storeIds = [
      ...new Set(
        batchRows
          .map((b) => Number(b.store_id))
          .filter(Boolean)
      ),
    ]

    let stores: any[] = []

    if (storeIds.length > 0) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .in('id', storeIds)

      stores = storeData || []
    }

    const userIds = [
      ...new Set(
        batchRows
          .map((b) => b.user_id)
          .filter(Boolean)
      ),
    ]

    let profiles: any[] = []

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)

      profiles = profileData || []
    }

    const mergedUploads = (uploadsData || []).map((upload) => {
      const batch = batchRows.find(
        (b) => Number(b.id) === Number(upload.batch_id)
      )

      const store = stores.find(
        (s) => Number(s.id) === Number(batch?.store_id)
      )

      const user = profiles.find(
        (p) => p.id === batch?.user_id
      )

      return {
        ...upload,
        batch,
        store,
        user,
      }
    })

    const groupedMap = new Map()

    mergedUploads.forEach((upload) => {
      const batchId = Number(upload.batch_id)

      if (!batchId) return

      if (!groupedMap.has(batchId)) {
        groupedMap.set(batchId, {
          id: batchId,
          batch: upload.batch,
          store: upload.store,
          user: upload.user,
          uploads: [],
          created_at: upload.batch?.created_at || upload.created_at,
        })
      }

      groupedMap.get(batchId).uploads.push(upload)
    })

    const groupedBatches = Array.from(groupedMap.values()).sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )

    setBatches(groupedBatches)
    setLoading(false)
  }

  async function approveBatch(batchId: number) {
    await supabase
      .from('uploads')
      .update({ status: 'approved' })
      .eq('batch_id', batchId)
      .neq('status', 'rejected')

    await supabase
      .from('upload_batches')
      .update({ status: 'approved' })
      .eq('id', batchId)

    loadUploads()
  }

  async function rejectBatch(batchId: number) {
    await supabase
      .from('uploads')
      .update({ status: 'rejected' })
      .eq('batch_id', batchId)

    await supabase
      .from('upload_batches')
      .update({ status: 'rejected' })
      .eq('id', batchId)

    loadUploads()
  }

  async function removePhoto(uploadId: number) {
    const confirmRemove = confirm(
      'Remove this photo from the batch? It will be marked rejected.'
    )

    if (!confirmRemove) return

    await supabase
      .from('uploads')
      .update({ status: 'rejected' })
      .eq('id', uploadId)

    loadUploads()
  }

  async function saveBatchChanges(batchGroup: any) {
    const firstUpload = batchGroup.uploads[0]

    if (batchGroup.batch?.id) {
      await supabase
        .from('upload_batches')
        .update({
          category: batchGroup.batch.category,
          notes: batchGroup.batch.notes,
        })
        .eq('id', batchGroup.batch.id)
    }

    if (firstUpload) {
      await supabase
        .from('uploads')
        .update({
          stock_level: firstUpload.stock_level,
          find_quality: firstUpload.find_quality,
          caption: batchGroup.batch?.notes || '',
        })
        .eq('batch_id', batchGroup.id)
    }

    alert('Saved!')

    loadUploads()
  }

  function updateBatchGroup(
    batchId: number,
    field: string,
    value: any
  ) {
    setBatches((prev) =>
      prev.map((group) =>
        group.id === batchId
          ? {
              ...group,
              batch: {
                ...group.batch,
                [field]: value,
              },
            }
          : group
      )
    )
  }

  function updateBatchUploadField(
    batchId: number,
    field: string,
    value: any
  ) {
    setBatches((prev) =>
      prev.map((group) =>
        group.id === batchId
          ? {
              ...group,
              uploads: group.uploads.map((upload: any) => ({
                ...upload,
                [field]: value,
              })),
            }
          : group
      )
    )
  }

  function timeAgo(dateString: string) {
    const then = new Date(dateString).getTime()
    const now = Date.now()
    const diff = now - then

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`

    return `${days}d ago`
  }

  function getStockColor(stock: string) {
    const value = (stock || '').toLowerCase()

    if (value.includes('high') || value.includes('full')) {
      return 'bg-green-900/40 text-green-300'
    }

    if (value.includes('moderate')) {
      return 'bg-yellow-900/40 text-yellow-300'
    }

    if (
      value.includes('low') ||
      value.includes('limited') ||
      value.includes('empty')
    ) {
      return 'bg-red-900/40 text-red-300'
    }

    return 'bg-gray-800 text-gray-300'
  }

  function formatDateTime(dateString?: string | null) {
    if (!dateString) return 'Not available'

    return new Date(dateString).toLocaleString()
  }

  function getStoreDistanceFromCoords(
    store: any,
    lat?: number | string | null,
    long?: number | string | null
  ) {
    const parsedLat = Number(lat)
    const parsedLong = Number(long)

    if (
      !Number.isFinite(parsedLat) ||
      !Number.isFinite(parsedLong)
    ) {
      return null
    }

    return getDistanceMiles(
      {
        lat: parsedLat,
        long: parsedLong,
      },
      store || {}
    )
  }

  function getDistanceTone(distanceMiles: number | null) {
    if (distanceMiles === null) return 'text-gray-400'
    if (distanceMiles <= 0.5) return 'text-green-400'
    if (distanceMiles <= 2) return 'text-yellow-400'

    return 'text-red-400'
  }

  function getDistanceText(distanceMiles: number | null) {
    if (distanceMiles === null) return 'No GPS'

    return `${distanceMiles.toFixed(2)} mi from store`
  }

  function getVerificationSummary(batchGroup: any) {
    const uploadDistance = getStoreDistanceFromCoords(
      batchGroup.store,
      batchGroup.batch?.upload_lat,
      batchGroup.batch?.upload_long
    )

    const photosWithGps = batchGroup.uploads.filter(
      (upload: any) => upload.photo_lat && upload.photo_long
    ).length

    const photosWithTakenAt = batchGroup.uploads.filter(
      (upload: any) => upload.photo_taken_at
    ).length

    return {
      photosWithGps,
      photosWithTakenAt,
      uploadDistance,
    }
  }

  function getBatchStatus(batchGroup: any) {
    const statuses = batchGroup.uploads.map((u: any) => u.status)

    if (statuses.every((s: string) => s === 'approved')) return 'approved'
    if (statuses.every((s: string) => s === 'rejected')) return 'rejected'
    if (statuses.some((s: string) => s === 'pending')) return 'pending'

    return 'mixed'
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* HEADER */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Upload Moderation
                </h1>

                <p className="text-gray-400">
                  Review full upload batches, approve submissions, or remove individual photos.
                </p>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold">
                  {batches.length}
                </div>

                <div className="text-gray-500 text-sm">
                  batches loaded
                </div>
              </div>
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap gap-2 sticky top-0 z-20 bg-black py-3">
              {[
                ...UPLOAD_STATUS_OPTIONS,
                { value: 'all', label: 'All' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-4 py-2 rounded-xl border text-sm transition ${
                    statusFilter === value
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 border-white/10 text-white hover:border-white/30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-gray-400">
              Loading batches...
            </div>
          )}

          {/* EMPTY */}
          {!loading && batches.length === 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-gray-400">
              No batches found.
            </div>
          )}

          {/* BATCHES */}
          {!loading && batches.length > 0 && (
            <div className="space-y-5">
              {batches.map((batchGroup) => {
                const firstUpload = batchGroup.uploads[0]
                const batchStatus = getBatchStatus(batchGroup)
                const verification = getVerificationSummary(batchGroup)

                return (
                  <div
                    key={batchGroup.id}
                    className="bg-[#071225] border border-white/10 rounded-3xl overflow-hidden"
                  >
                    {/* MAIN BATCH ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-[180px_1.5fr_1fr_1fr_1fr_240px] gap-4 px-6 py-5 items-center hover:bg-white/[0.03] transition">
                      {/* PHOTO PREVIEWS */}
                      <div>
                        <div className="grid grid-cols-2 gap-2">
                          {batchGroup.uploads.slice(0, 4).map((upload: any) => (
                            <img
                              key={upload.id}
                              src={upload.photo_url}
                              alt="Upload"
                              className="w-full h-[70px] object-cover rounded-xl border border-white/10"
                            />
                          ))}
                        </div>

                        {batchGroup.uploads.length > 4 && (
                          <div className="text-xs text-gray-500 mt-2">
                            +{batchGroup.uploads.length - 4} more
                          </div>
                        )}
                      </div>

                      {/* STORE */}
                      <div>
                        <div className={`font-semibold ${getStoreColor(batchGroup.store?.store || '').text}`}>
                          {batchGroup.store?.store || 'Unknown Store'}
                        </div>

                        <div className="text-sm text-gray-300 line-clamp-1">
                          {batchGroup.store?.address || 'No address'}
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          {batchGroup.store?.city || 'Unknown'}
                          {batchGroup.store?.st ? `, ${batchGroup.store.st}` : ''}
                        </div>
                      </div>

                      {/* USER */}
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                          Uploader
                        </div>

                        <div className="text-sm text-white">
                          {batchGroup.user?.username || 'Unknown'}
                        </div>
                      </div>

                      {/* CATEGORY */}
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                          Category
                        </div>

                        <div className={`inline-flex px-3 py-1 rounded-full text-xs ${getStoreColor(batchGroup.store?.store || '').badge}`}>
                          {batchGroup.batch?.category || 'Unknown'}
                        </div>

                        <div className="text-xs text-gray-500 mt-2">
                          {batchGroup.uploads.length} photo{batchGroup.uploads.length === 1 ? '' : 's'}
                        </div>
                      </div>

                      {/* STATUS */}
                      <div>
                        <div className={`inline-flex px-3 py-1 rounded-full text-xs ${getStockColor(firstUpload?.stock_level || '')}`}>
                          {firstUpload?.stock_level || 'unknown'}
                        </div>

                        <div
                          className={`text-xs mt-2 ${
                            batchStatus === 'approved'
                              ? 'text-green-400'
                              : batchStatus === 'rejected'
                              ? 'text-red-400'
                              : batchStatus === 'mixed'
                              ? 'text-blue-400'
                              : 'text-yellow-400'
                          }`}
                        >
                          {batchStatus}
                        </div>

                        <div className="text-green-400 text-sm mt-2">
                          {timeAgo(batchGroup.created_at)}
                        </div>

                        <div className={`text-xs mt-2 ${getDistanceTone(verification.uploadDistance)}`}>
                          {getDistanceText(verification.uploadDistance)}
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => approveBatch(batchGroup.id)}
                          className="bg-green-600 hover:bg-green-500 px-3 py-2 rounded-lg text-xs font-medium"
                        >
                          Approve Batch
                        </button>

                        <button
                          onClick={() => rejectBatch(batchGroup.id)}
                          className="bg-red-600 hover:bg-red-500 px-3 py-2 rounded-lg text-xs font-medium"
                        >
                          Reject Batch
                        </button>

                        <button
                          onClick={() =>
                            setExpandedBatch(
                              expandedBatch === batchGroup.id
                                ? null
                                : batchGroup.id
                            )
                          }
                          className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-xs font-medium"
                        >
                          {expandedBatch === batchGroup.id ? 'Close' : 'Expand'}
                        </button>
                      </div>
                    </div>

                    {/* EXPANDED PANEL */}
                    {expandedBatch === batchGroup.id && (
                      <div className="px-6 pb-6 bg-black/20 border-t border-white/5">
                        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 pt-6">
                          {/* PHOTO GRID */}
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">
                              Photos in this batch
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {batchGroup.uploads.map((upload: any) => (
                                <div
                                  key={upload.id}
                                  className="bg-black border border-white/10 rounded-2xl overflow-hidden"
                                >
                                  <img
                                    src={upload.photo_url}
                                    alt="Upload"
                                    className="w-full h-64 object-cover"
                                  />

                                  <div className="p-3 flex items-center justify-between gap-3">
                                    <div>
                                      <div
                                        className={`text-xs ${
                                          upload.status === 'approved'
                                            ? 'text-green-400'
                                            : upload.status === 'rejected'
                                            ? 'text-red-400'
                                            : 'text-yellow-400'
                                        }`}
                                      >
                                        {upload.status}
                                      </div>

                                      <div className="mt-1 text-[11px] text-gray-500">
                                        Taken: {formatDateTime(upload.photo_taken_at)}
                                      </div>

                                      <div className={`mt-1 text-[11px] ${getDistanceTone(
                                        getStoreDistanceFromCoords(
                                          batchGroup.store,
                                          upload.photo_lat,
                                          upload.photo_long
                                        )
                                      )}`}>
                                        Photo GPS: {getDistanceText(
                                          getStoreDistanceFromCoords(
                                            batchGroup.store,
                                            upload.photo_lat,
                                            upload.photo_long
                                          )
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => removePhoto(upload.id)}
                                      className="bg-red-900/40 hover:bg-red-800 text-red-300 px-3 py-2 rounded-lg text-xs"
                                    >
                                      Remove Photo
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* EDIT PANEL */}
                          <div className="space-y-5">
                            {/* VERIFICATION */}
                            <div className="rounded-2xl border border-white/10 bg-black p-4">
                              <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">
                                Verification
                              </div>

                              <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-gray-400">
                                    Browser Location
                                  </span>
                                  <span className={getDistanceTone(verification.uploadDistance)}>
                                    {getDistanceText(verification.uploadDistance)}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-gray-400">
                                    Browser Accuracy
                                  </span>
                                  <span className="text-gray-300">
                                    {batchGroup.batch?.upload_accuracy_m
                                      ? `${Math.round(Number(batchGroup.batch.upload_accuracy_m))}m`
                                      : 'Not captured'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-gray-400">
                                    Photo GPS
                                  </span>
                                  <span className="text-gray-300">
                                    {verification.photosWithGps} / {batchGroup.uploads.length}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-gray-400">
                                    Photo Taken Time
                                  </span>
                                  <span className="text-gray-300">
                                    {verification.photosWithTakenAt} / {batchGroup.uploads.length}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-gray-400">
                                    Server Upload Time
                                  </span>
                                  <span className="text-gray-300 text-right">
                                    {formatDateTime(batchGroup.created_at)}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 text-xs leading-relaxed text-gray-500">
                                Distances depend on the store latitude and longitude saved in the stores table.
                              </div>
                            </div>

                            {/* NOTES */}
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                                Batch Notes
                              </div>

                              <textarea
                                value={batchGroup.batch?.notes || ''}
                                onChange={(e) =>
                                  updateBatchGroup(
                                    batchGroup.id,
                                    'notes',
                                    e.target.value
                                  )
                                }
                                className="w-full bg-black border border-gray-700 rounded-xl p-4 h-28 text-gray-300"
                              />
                            </div>

                            {/* CATEGORY */}
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                                Category
                              </div>

                              <select
                                value={batchGroup.batch?.category || 'Hot Wheels'}
                                onChange={(e) =>
                                  updateBatchGroup(
                                    batchGroup.id,
                                    'category',
                                    e.target.value
                                  )
                                }
                                className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-gray-300"
                              >
                                {withCurrentStringOption(
                                  UPLOAD_CATEGORIES,
                                  batchGroup.batch?.category
                                ).map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* STOCK */}
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                                Stock Level
                              </div>

                              <select
                                value={firstUpload?.stock_level || 'unknown'}
                                onChange={(e) =>
                                  updateBatchUploadField(
                                    batchGroup.id,
                                    'stock_level',
                                    e.target.value
                                  )
                                }
                                className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-gray-300"
                              >
                                {withCurrentSelectOption(
                                  STOCK_LEVEL_OPTIONS,
                                  firstUpload?.stock_level
                                ).map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* FIND QUALITY */}
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                                Find Quality
                              </div>

                              <select
                                value={firstUpload?.find_quality || DEFAULT_FIND_QUALITY}
                                onChange={(e) =>
                                  updateBatchUploadField(
                                    batchGroup.id,
                                    'find_quality',
                                    e.target.value
                                  )
                                }
                                className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-gray-300"
                              >
                                {withCurrentSelectOption(
                                  FIND_QUALITY_OPTIONS,
                                  firstUpload?.find_quality
                                ).map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* SAVE */}
                            <button
                              onClick={() => saveBatchChanges(batchGroup)}
                              className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-medium"
                            >
                              Save Batch Changes
                            </button>

                            <div className="text-xs text-gray-500 leading-relaxed">
                              Approving the batch approves all photos that have not been removed.
                              Removing a photo marks only that photo as rejected.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

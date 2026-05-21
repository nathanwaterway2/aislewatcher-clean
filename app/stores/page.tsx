'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SaveStoreButton from '@/app/components/SaveStoreButton'
import { getStoreColor } from '@/app/lib/storeStyles'
import Navbar from '@/app/components/Navbar'
import {
  getDistanceMiles,
  getLocationBounds,
  useBrowserLocation,
} from '@/app/lib/browserLocation'

function StoresPageContent() {

  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  const [searchInput, setSearchInput] = useState(query)
  const [stores, setStores] = useState<any[]>([])
  const [recentUploads, setRecentUploads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedStore, setSelectedStore] = useState('All')
  const [mounted, setMounted] = useState(false)

  const {
    coords: userCoords,
    requestLocation,
    status: locationStatus,
  } = useBrowserLocation()

  useEffect(() => {
    setMounted(true)
  }, [])

  function timeAgo(dateString: string) {

    const then = new Date(dateString).getTime()
    const now = Date.now()

    const diff = Math.max(0, now - then)

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`

    return `${days}d ago`
  }

  useEffect(() => {
    setSearchInput(query)
  }, [query])

  useEffect(() => {

    const runSearch = async () => {

      const raw = query.trim().toLowerCase()
      const parts = raw ? raw.split(/\s+/) : []

      setLoading(true)

      let zip: string | null = null
      let state: string | null = null
      let textParts: string[] = []

      for (const part of parts) {

        if (!part) continue

        if (/^\d{5}$/.test(part)) {
          zip = part
        }

        else if (part.length === 2) {
          state = part.toUpperCase()
        }

        else {
          textParts.push(part)
        }
      }

      let queryBuilder = supabase
        .from('stores')
        .select('*')

      if (selectedStore !== 'All') {
        queryBuilder = queryBuilder.eq('store', selectedStore)
      }

      if (zip) {
        queryBuilder = queryBuilder.eq('postal', zip)
      }

      if (state) {
        queryBuilder = queryBuilder.eq('st', state)
      }

      if (textParts.length > 0) {

        // Match each word separately so searches like
        // "Walmart Branford" can match store = Walmart AND city = Branford.
        for (const textPart of textParts) {

          const safeText = textPart
            .replace(/[,()]/g, '')
            .trim()

          if (!safeText) continue

          queryBuilder = queryBuilder.or(
            `city.ilike.%${safeText}%,store.ilike.%${safeText}%,address.ilike.%${safeText}%,postal.ilike.%${safeText}%`
          )
        }
      }

      const usingBrowserLocation =
        !!userCoords &&
        !zip &&
        !state

      if (usingBrowserLocation) {

        // Keep search results local when location is available.
        // This prevents a search like "Walmart" from showing Georgia/Missouri
        // stores before nearby Connecticut stores.
        const bounds = getLocationBounds(userCoords, 100)

        queryBuilder = queryBuilder
          .gte('lat', bounds.minLat)
          .lte('lat', bounds.maxLat)
          .gte('long', bounds.minLong)
          .lte('long', bounds.maxLong)
      }

      const { data: storeData, error: storeError } =
        await queryBuilder.limit(usingBrowserLocation ? 300 : 150)

      if (storeError) {

        console.error(storeError)

        setStores([])
        setLoading(false)

        return
      }

      const baseStores = storeData || []

      const storeIds = baseStores.map((store) =>
        Number(store.id)
      )

      const { data: batchesData } = await supabase
        .from('upload_batches')
        .select('*')
        .in('store_id', storeIds)

      const batches = batchesData || []

      const batchIds = batches.map((batch) =>
        Number(batch.id)
      )

      const { data: approvedUploadsData } = await supabase
        .from('uploads')
        .select('*')
        .in('batch_id', batchIds)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      const approvedUploads = approvedUploadsData || []

      // RECENT GLOBAL UPLOADS
      const { data: recentUploadsData } = await supabase
        .from('uploads')
        .select('*')
        .eq('status', 'approved')
        .not('photo_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50)

      setRecentUploads(recentUploadsData || [])

      const storesWithUploads = baseStores.map((store) => {

        const storeBatches = batches.filter(
          (batch) =>
            Number(batch.store_id) === Number(store.id)
        )

        const storeBatchIds = storeBatches.map(
          (batch) => Number(batch.id)
        )

        const storeUploads = approvedUploads.filter(
          (upload) =>
            storeBatchIds.includes(Number(upload.batch_id))
        )

        const latestUpload = storeUploads[0] || null

        return {
          ...store,
          latestUpload,
          distanceMiles: getDistanceMiles(userCoords, store),
          uploadCount: storeUploads.length,
        }
      })

      if (userCoords) {

        storesWithUploads.sort((a, b) => {

          if (a.distanceMiles === null && b.distanceMiles === null) {
            return 0
          }

          if (a.distanceMiles === null) return 1
          if (b.distanceMiles === null) return -1

          return a.distanceMiles - b.distanceMiles
        })
      }

      setStores(storesWithUploads)
      setLoading(false)
    }

    runSearch()

  }, [query, selectedStore, userCoords])

  return (
    <main className="min-h-screen bg-black text-white">

      <Navbar />

      <div className="p-4 md:p-6">

        <div className="max-w-5xl mx-auto">

          {/* HEADER */}
          <div className="mb-8">

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-5">

              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

              {!mounted
                ? 'Loading location...'
                : userCoords
                ? 'Using your browser location'
                : 'Search stores or allow location'}

            </div>

            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-3">

              {!mounted
                ? 'Find a Store'
                : userCoords && !query
                ? 'Stores Near You'
                : 'Find a Store'}

            </h1>

            <p className="text-gray-400 text-lg">

              {loading
                ? 'Loading stores...'
                : `${stores.length} stores found`}

            </p>

          </div>

          {/* SEARCH */}
          <form
            onSubmit={(e) => {

              e.preventDefault()

              if (!searchInput.trim()) return

              router.push(
                `/stores?q=${encodeURIComponent(searchInput)}`
              )
            }}
            className="mb-8"
          >

            <div className="flex flex-col sm:flex-row gap-3">

              <input
                type="text"
                value={searchInput}
                onChange={(e) =>
                  setSearchInput(e.target.value)
                }
                placeholder="Search stores, cities, ZIP codes..."
                className="flex-1 px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder:text-gray-500"
              />

              <button
                type="submit"
                className="px-6 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 transition font-medium"
              >
                Search
              </button>

              <button
                type="button"
                onClick={requestLocation}
                className="px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition font-medium text-white"
              >
                Use My Location
              </button>

            </div>

          </form>

          {/* FILTERS */}
          <div className="flex flex-wrap gap-2 mb-8">

            {[
              'All',
              'Walmart',
              'Target',
              'CVS',
              'Walgreens',
              'Dollar General',
              'Dollar Tree',
              'Family Dollar',
              'Stop & Shop',
            ].map((name) => (

              <button
                key={name}
                onClick={() => setSelectedStore(name)}
                className={`px-3 py-1 rounded-full border transition text-xs font-medium ${
                  selectedStore === name
                    ? 'bg-white text-black border-white'
                    : 'bg-white/5 text-white border-white/10 hover:border-white/30'
                }`}
              >
                {name}
              </button>

            ))}

          </div>

          {/* RESULTS */}
          {loading ? (

            <p className="text-gray-400">
              Loading...
            </p>

          ) : (

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {stores.map((store, index) => {

                const fallbackUpload =
                  recentUploads.length > 0
                    ? recentUploads[
                        index % recentUploads.length
                      ]
                    : null

                return (

                  <div
                    key={store.id}
                    className="bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm hover:border-white/20 transition"
                  >

                    <Link href={`/stores/${store.id}`}>

                      {store.latestUpload?.photo_url ? (

                        <div className="overflow-hidden bg-black">

                          <img
                            src={store.latestUpload.photo_url}
                            alt="Latest upload"
                            className="w-full h-40 object-cover hover:scale-[1.02] transition duration-500"
                          />

                        </div>

                      ) : fallbackUpload?.photo_url ? (

                        <div className="overflow-hidden bg-black relative">

                          <img
                            src={fallbackUpload.photo_url}
                            alt="Nearby activity"
                            className="w-full h-40 object-cover opacity-90"
                          />

                          <div className="absolute inset-0 bg-black/40" />

                          <div className="absolute bottom-3 left-3">

                            <div className="text-xs px-2 py-1 rounded-full bg-black/60 border border-white/10 text-white">
                              Nearby activity
                            </div>

                          </div>

                        </div>

                      ) : (

                        <div className="w-full h-40 bg-gradient-to-br from-zinc-900 to-black flex flex-col items-center justify-center text-center px-4 border-b border-white/5">

                          <div className="text-3xl mb-2">
                            📸
                          </div>

                          <p className="text-gray-300 font-medium">
                            No uploads yet
                          </p>

                        </div>

                      )}

                    </Link>

                    <div className="p-5">

                      <div className="flex items-start justify-between gap-4">

                        <div className="flex-1 min-w-0">

                          <Link
                            href={`/stores/${store.id}`}
                            className={`block font-bold text-2xl mb-1 hover:opacity-80 transition ${getStoreColor(store.store).text}`}
                          >
                            {store.store}
                          </Link>

                          <div className="text-gray-300 text-sm leading-relaxed">
                            {store.address}
                          </div>

                          <div className="text-gray-500 text-sm mb-4">
                            {store.city}, {store.st} {store.postal}
                          </div>

                          {store.distanceMiles !== null && (

                            <div className="text-xs text-blue-300 mb-4">

                              {store.distanceMiles.toFixed(1)} mi away

                            </div>

                          )}

                          <div className="flex flex-wrap gap-2 mb-4">

                            {store.uploadCount > 0 && (

                              <div className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">

                                {store.uploadCount} uploads

                              </div>

                            )}

                          </div>

                          {store.latestUpload ? (

                            <div className="border-t border-white/10 pt-4 mt-4">

                              <div className="text-sm text-green-400 mb-2">

                                Updated {timeAgo(store.latestUpload.created_at)}

                              </div>

                              {store.latestUpload.caption && (

                                <div className="text-sm text-gray-400 line-clamp-2">

                                  {store.latestUpload.caption}

                                </div>

                              )}

                            </div>

                          ) : (

                            <div className="border-t border-white/10 pt-4 mt-4 text-sm text-gray-500">

                              No local uploads yet.

                            </div>

                          )}

                        </div>

                        <div className="shrink-0">

                          <SaveStoreButton
                            storeId={String(store.id)}
                          />

                        </div>

                      </div>

                    </div>

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

export default function StoresPage() {

  return (

    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white">

          <Navbar />

          <div className="p-6">

            <div className="max-w-4xl mx-auto text-gray-400">
              Loading stores...
            </div>

          </div>

        </main>
      }
    >

      <StoresPageContent />

    </Suspense>

  )
}
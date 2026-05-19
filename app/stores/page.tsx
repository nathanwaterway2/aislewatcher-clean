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
  const [loading, setLoading] = useState(true)

  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [authLoading, setAuthLoading] = useState(true)

  const [selectedStore, setSelectedStore] = useState('All')
  const {
    coords: userCoords,
    requestLocation,
    status: locationStatus,
  } = useBrowserLocation()

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

  function getStockColor(stock: string) {

    const value = (stock || '').toLowerCase()

    if (value.includes('high') || value.includes('loaded')) {
      return 'bg-green-900/40 text-green-300'
    }

    if (value.includes('moderate')) {
      return 'bg-yellow-900/40 text-yellow-300'
    }

    if (
      value.includes('low') ||
      value.includes('empty') ||
      value.includes('sparse')
    ) {
      return 'bg-red-900/40 text-red-300'
    }

    return 'bg-gray-800 text-gray-300'
  }

  useEffect(() => {

    const loadUser = async () => {

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const currentUser = session?.user || null
      setUser(currentUser)

      if (!currentUser) {
        setAuthLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (profile) {
        setUsername(profile.username)
        setIsAdmin(profile.is_admin === true)
      }

      setAuthLoading(false)
    }

    loadUser()

  }, [])

  useEffect(() => {
    setSearchInput(query)
  }, [query])

  useEffect(() => {

    const runSearch = async () => {
      const raw = query.trim().toLowerCase()
      const parts = raw ? raw.split(/\s+/) : []

      if (
        !raw &&
        !userCoords &&
        (locationStatus === 'checking' || locationStatus === 'requesting')
      ) {
        setLoading(true)
        return
      }

      if (
        !raw &&
        !userCoords &&
        (locationStatus === 'denied' || locationStatus === 'unavailable')
      ) {
        setStores([])
        setLoading(false)
        return
      }

      setLoading(true)

      let zip: string | null = null
      let state: string | null = null
      let textParts: string[] = []

      for (const part of parts) {
        if (!part) continue

        if (/^\d{5}$/.test(part)) {
          zip = part
        } else if (part.length === 2) {
          state = part.toUpperCase()
        } else {
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

        const text = textParts.join(' ')

        queryBuilder = queryBuilder.or(
          `city.ilike.%${text}%,store.ilike.%${text}%`
        )
      }

      const usingBrowserLocation =
        !!userCoords &&
        !zip &&
        !state &&
        textParts.length === 0

      if (usingBrowserLocation) {
        const bounds = getLocationBounds(userCoords, 100)

        queryBuilder = queryBuilder
          .gte('lat', bounds.minLat)
          .lte('lat', bounds.maxLat)
          .gte('long', bounds.minLong)
          .lte('long', bounds.maxLong)
      }

      const { data: storeData, error: storeError } = await queryBuilder
        .limit(usingBrowserLocation ? 300 : 100)

      if (storeError) {
        console.error('STORE SEARCH ERROR:', storeError)
        setStores([])
        setLoading(false)
        return
      }

      const baseStores = storeData || []
      const storeIds = baseStores.map((store) => Number(store.id))

      if (storeIds.length === 0) {
        setStores([])
        setLoading(false)
        return
      }

      const { data: batchesData } = await supabase
        .from('upload_batches')
        .select('*')
        .in('store_id', storeIds)

      const batches = batchesData || []
      const batchIds = batches.map((batch) => Number(batch.id))

      const { data: approvedUploadsData } = await supabase
        .from('uploads')
        .select('*')
        .in('batch_id', batchIds)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      const approvedUploads = approvedUploadsData || []

      const userIds = [
        ...new Set(
          batches
            .map((batch) => batch.user_id)
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

      const storesWithUploads = baseStores.map((store) => {

        const storeBatches = batches.filter(
          (batch) => Number(batch.store_id) === Number(store.id)
        )

        const storeBatchIds = storeBatches.map(
          (batch) => Number(batch.id)
        )

        const storeUploads = approvedUploads.filter(
          (upload) => storeBatchIds.includes(Number(upload.batch_id))
        )

        const latestUpload = storeUploads[0] || null

        const latestBatch = latestUpload
          ? storeBatches.find(
              (batch) => Number(batch.id) === Number(latestUpload.batch_id)
            )
          : null

        const latestUser = latestBatch
          ? profiles.find((profile) => profile.id === latestBatch.user_id)
          : null

        return {
          ...store,
          latestUpload,
          latestBatch,
          latestUser,
          distanceMiles: getDistanceMiles(userCoords, store),
          uploadCount: storeUploads.length,
        }
      })

      if (userCoords) {
        storesWithUploads.sort((a, b) => {
          if (a.distanceMiles === null && b.distanceMiles === null) return 0
          if (a.distanceMiles === null) return 1
          if (b.distanceMiles === null) return -1

          return a.distanceMiles - b.distanceMiles
        })
      }

      setStores(storesWithUploads)
      setLoading(false)
    }

    runSearch()

  }, [query, selectedStore, userCoords, locationStatus])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const handleLogin = async () => {

    const email = prompt('Enter your email')
    const password = prompt('Enter your password')

    if (!email || !password) return

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert(error.message)
      return
    }

    window.location.reload()
  }

  const handleSignup = async () => {

    const email = prompt('Enter your email')
    const password = prompt('Create a password')

    if (!email || !password) return

    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Account created. Now click LOGIN.')
  }

  return (
    <main className="min-h-screen bg-black text-white">

      <Navbar />

      <div className="p-6">

        <div className="max-w-4xl mx-auto">

          {/* PAGE HEADER */}
          <div className="mb-10">

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-5">

              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

              {userCoords
                ? 'Using your browser location'
                : locationStatus === 'requesting' || locationStatus === 'checking'
                ? 'Finding stores near you'
                : 'Search or allow location'}

            </div>

            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
              {userCoords && !query ? 'Stores Near You' : 'Find a Store'}
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

              router.push(`/stores?q=${encodeURIComponent(searchInput)}`)
            }}
            className="mb-8"
          >

            <div className="flex flex-col sm:flex-row gap-3">

              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search Walmart Branford, Target Milford, CVS East Haven..."
                className="flex-1 px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder:text-gray-500"
              />

              <button
                type="submit"
                className="px-6 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 transition font-medium shadow-lg shadow-violet-900/10"
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
              'Dollar General',
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

          ) : stores.length === 0 ? (

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-gray-400">
              {userCoords || query
                ? 'No stores found for this search.'
                : 'Allow browser location or search by city, store, state, or ZIP to find stores.'}
            </div>

          ) : (

            <div className="space-y-6">

              {stores.map((store) => (

                <div
                  key={store.id}
                  className="bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm hover:border-white/20 transition"
                >

                  {/* IMAGE */}
                  {store.latestUpload?.photo_url ? (

                    <div className="overflow-hidden">

                      <img
                        src={store.latestUpload.photo_url}
                        alt="Latest upload"
                        className="w-full h-56 object-cover hover:scale-105 transition duration-500"
                      />

                    </div>

                  ) : (

                    <div className="w-full h-40 bg-black/30 flex flex-col items-center justify-center text-center px-4">

                      <p className="text-gray-500">
                        No recent activity yet
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        Be the first to upload photos for this store
                      </p>

                    </div>

                  )}

                  {/* CONTENT */}
                  <div className="p-5">

                    <div className="flex items-start justify-between gap-4">

                      <Link
                        href={`/stores/${store.id}`}
                        className="block hover:opacity-90 transition flex-1"
                      >

                        {/* STORE NAME */}
                        <div className={`font-bold text-2xl mb-1 ${getStoreColor(store.store).text}`}>
                          {store.store}
                        </div>

                        {/* ADDRESS */}
                        <div className="text-gray-300">
                          {store.address}
                        </div>

                        <div className="text-gray-500 mb-4">
                          {store.city}, {store.st} {store.postal}
                        </div>

                        {store.distanceMiles !== null && (
                          <div className="text-xs text-blue-300 mb-4">
                            {store.distanceMiles.toFixed(1)} mi away
                          </div>
                        )}

                        {/* STORE STATUS */}
                        <div className="flex flex-wrap gap-2 mb-5">

                          {store.latestUpload && (
                            <div className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                              Active
                            </div>
                          )}

                          {store.uploadCount > 0 && (
                            <div className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
                              {store.uploadCount} uploads
                            </div>
                          )}

                          <div className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                            {store.city}
                          </div>

                        </div>

                        {/* ACTIVITY */}
                        {store.latestUpload ? (

                          <div className="border-t border-white/10 pt-5 mt-5">

                            <div className="flex flex-wrap items-center gap-2 mb-4">

                              <div className={`text-xs px-2.5 py-1 rounded-full ${getStoreColor(store.store).badge}`}>
                                {store.latestBatch?.category || 'Unknown'}
                              </div>

                              <div className={`text-xs px-2.5 py-1 rounded-full ${getStockColor(store.latestUpload.stock_level)}`}>
                                {store.latestUpload.stock_level || 'unknown'}
                              </div>

                            </div>

                            <div className="text-sm text-green-400 mb-2">
                              Updated {timeAgo(store.latestUpload.created_at)}
                            </div>

                            <div className="text-xs text-gray-500 mb-4">
                              Uploaded by {store.latestUser?.username || 'Unknown User'}
                            </div>

                            <div className="text-gray-300 leading-relaxed">
                              {store.latestUpload.caption || 'No notes'}
                            </div>

                          </div>

                        ) : (

                          <div className="border-t border-white/10 pt-5 mt-5 text-gray-500">
                            No approved activity yet.
                          </div>

                        )}

                      </Link>

                      {/* SAVE BUTTON */}
                      <div className="shrink-0">
                        <SaveStoreButton storeId={String(store.id)} />
                      </div>

                    </div>

                  </div>

                </div>

              ))}

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

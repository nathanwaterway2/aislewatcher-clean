'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getStoreColor } from '@/app/lib/storeStyles'
import Navbar from '@/app/components/Navbar'
import {
  getDistanceMiles,
  useBrowserLocation,
} from '@/app/lib/browserLocation'

export default function MyStoresPage() {

  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const [sortMode, setSortMode] = useState('recent')
  const viewMode = 'default'
  const [chainFilter, setChainFilter] = useState('All')
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

    if (value.includes('high') || value.includes('loaded') || value.includes('full')) {
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

  function isRecentlyActive(store: any) {
    if (!store.latestUpload?.created_at) return false
    const then = new Date(store.latestUpload.created_at).getTime()
    const diffHours = (Date.now() - then) / 1000 / 60 / 60
    return diffHours <= 72
  }

  async function loadSavedStores() {

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      setAuthLoading(false)
      return
    }

    setUser(user)

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      setUsername(profile.username)
      setIsAdmin(profile.is_admin === true)
    }

    setAuthLoading(false)

    const { data: savedStores, error: savedError } = await supabase
      .from('saved_stores')
      .select('store_id')
      .eq('user_id', user.id)

    if (savedError || !savedStores) {
      console.log('SAVED STORE ERROR:', savedError)
      setLoading(false)
      return
    }

    const storeIds = savedStores.map((s) => Number(s.store_id))

    if (storeIds.length === 0) {
      setStores([])
      setLoading(false)
      return
    }

    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .in('id', storeIds)

    if (storeError) {
      console.error(storeError)
      setStores([])
      setLoading(false)
      return
    }

    const baseStores = storeData || []

    const { data: batchesData } = await supabase
      .from('upload_batches')
      .select('*')
      .in('store_id', storeIds)

    const batches = batchesData || []
    const batchIds = batches.map((batch) => Number(batch.id))

    let approvedUploads: any[] = []

    if (batchIds.length > 0) {
      const { data: approvedUploadsData } = await supabase
        .from('uploads')
        .select('*')
        .in('batch_id', batchIds)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      approvedUploads = approvedUploadsData || []
    }

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

    const storesWithActivity = baseStores.map((store) => {

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
        uploadCount: storeUploads.length,
      }
    })

    setStores(storesWithActivity)
    setLoading(false)
  }

  useEffect(() => {
    loadSavedStores()
  }, [])

  const handleRemoveStore = async (storeId: number) => {

    if (!user) {
      alert('You must be logged in.')
      return
    }

    const confirmRemove = confirm('Remove this store from My Stores?')

    if (!confirmRemove) return

    const { error } = await supabase
      .from('saved_stores')
      .delete()
      .eq('user_id', user.id)
      .eq('store_id', storeId)

    if (error) {
      alert('Could not remove store.')
      console.error(error)
      return
    }

    setStores((prev) =>
      prev.filter((store) => Number(store.id) !== Number(storeId))
    )
  }

  const chains = useMemo(() => {
    const names = stores
      .map((store) => store.store)
      .filter(Boolean)

    return ['All', ...Array.from(new Set(names))]
  }, [stores])

  const displayStores = useMemo(() => {
    let filtered = [...stores]

    if (chainFilter !== 'All') {
      filtered = filtered.filter((store) => store.store === chainFilter)
    }

    filtered = filtered.map((store) => ({
      ...store,
      distanceMiles: getDistanceMiles(userCoords, store),
    }))

    if (sortMode === 'nearby') {
      filtered.sort((a, b) => {
        if (a.distanceMiles === null && b.distanceMiles === null) return 0
        if (a.distanceMiles === null) return 1
        if (b.distanceMiles === null) return -1
        return a.distanceMiles - b.distanceMiles
      })
    }

    if (sortMode === 'recent') {
      filtered.sort((a, b) => {
        const aTime = a.latestUpload?.created_at ? new Date(a.latestUpload.created_at).getTime() : 0
        const bTime = b.latestUpload?.created_at ? new Date(b.latestUpload.created_at).getTime() : 0
        return bTime - aTime
      })
    }

    if (sortMode === 'active') {
      filtered.sort((a, b) => Number(b.uploadCount || 0) - Number(a.uploadCount || 0))
    }

    if (sortMode === 'az') {
      filtered.sort((a, b) => `${a.store} ${a.city}`.localeCompare(`${b.store} ${b.city}`))
    }

    return filtered
  }, [stores, chainFilter, sortMode, userCoords])

  const activeStores = displayStores.filter((store) => isRecentlyActive(store))
  const quietStores = displayStores.filter((store) => !isRecentlyActive(store))

  const updatedToday = stores.filter((store) => {
    if (!store.latestUpload?.created_at) return false
    const then = new Date(store.latestUpload.created_at).getTime()
    const diffHours = (Date.now() - then) / 1000 / 60 / 60
    return diffHours <= 24
  }).length

  const totalUploads = stores.reduce((sum, store) => sum + Number(store.uploadCount || 0), 0)

function StoreCard({ store }: { store: any }) {
  return (
    <div
      className={`${
        false
          ? 'grid grid-cols-1 md:grid-cols-[60px_1.5fr_110px_110px_150px] gap-3 p-3'
          : 'grid grid-cols-1 md:grid-cols-[80px_1.4fr_1fr_1fr_1fr_180px] gap-4 p-4'
      } items-center hover:bg-gray-800/60 transition`}
    >

      <Link
        href={`/stores/${store.id}`}
        className="block"
      >
        {store.latestUpload?.photo_url ? (
          <img
            src={store.latestUpload.photo_url}
            alt="Latest upload"
            className={`${
              false
                ? 'w-full md:w-14 h-20 md:h-14'
                : 'w-full md:w-20 h-28 md:h-20'
            } object-cover rounded-lg border border-gray-700`}
          />
        ) : (
          <div
            className={`${
              false
                ? 'w-full md:w-14 h-14'
                : 'w-full md:w-20 h-20'
            } bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-center text-[10px] text-gray-600`}
          >
            No photo
          </div>
        )}
      </Link>

      <div className="min-w-0">

        <Link
          href={`/stores/${store.id}`}
          className={`font-semibold hover:underline truncate block ${getStoreColor(store.store).text}`}
        >
          {store.store}
        </Link>

        

        <div className="text-xs text-gray-500 truncate">
          {store.city}, {store.st} {store.postal}
        </div>

        {store.distanceMiles !== null && (
          <div className="text-[11px] text-blue-300 mt-1">
            {store.distanceMiles.toFixed(1)} mi away
          </div>
        )}
      </div>

      {true && (
        <div>

          <div className="md:hidden text-xs uppercase tracking-wide text-gray-500 mb-1">
            Latest Stock
          </div>

          {store.latestUpload ? (
            <div
              className={`inline-block text-xs px-2 py-1 rounded-full ${getStockColor(
                store.latestUpload.stock_level
              )}`}
            >
              {store.latestUpload.stock_level || 'unknown'}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No reports
            </div>
          )}

          {store.latestBatch?.category && (
            <div
              className={`text-xs mt-1 truncate ${getStoreColor(store.store).text}`}
            >
              {store.latestBatch.category}
            </div>
          )}

        </div>
      )}

      <div>

        <div className="md:hidden text-xs uppercase tracking-wide text-gray-500 mb-1">
          Updated
        </div>

        {store.latestUpload ? (
          <div className="text-sm text-green-400">
            {timeAgo(store.latestUpload.created_at)}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            No activity yet
          </div>
        )}

        {store.latestUser?.username && (
          <div className="text-[11px] text-gray-500 truncate">
            by {store.latestUser.username}
          </div>
        )}
      </div>

      <div>

        <div className="md:hidden text-xs uppercase tracking-wide text-gray-500 mb-1">
          Activity
        </div>

        <div className="text-sm text-gray-300">
          {store.uploadCount || 0} uploads
        </div>

        <div className="text-[11px] text-gray-500 mt-1 line-clamp-1">
          {store.latestUpload?.caption || 'No notes yet'}
        </div>

      </div>

      <div className="flex flex-wrap gap-1">

        <Link
          href={`/stores/${store.id}`}
          className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1.5 rounded-lg transition"
        >
          View
        </Link>

        <Link
          href={`/stores/${store.id}/upload`}
          className="text-xs bg-gray-800 border border-gray-700 hover:bg-gray-700 px-2 py-1.5 rounded-lg transition"
        >
          Upload
        </Link>

        <button
          onClick={() => handleRemoveStore(store.id)}
          className="text-xs bg-gray-800 border border-gray-700 hover:bg-red-900/30 text-gray-300 px-2 py-1.5 rounded-lg transition"
        >
          Remove
        </button>

      </div>

    </div>
  )
}

  return (
    <main className="min-h-screen bg-black text-white">

      <Navbar />

      <div className="p-6">

        <div className="max-w-6xl mx-auto">

          <div className="flex items-center justify-between mb-6">

            <div>
              <h1 className="text-3xl font-bold">
                My Stores
              </h1>

              <p className="text-gray-400 text-sm mt-1">
                Your saved stores, latest activity, and quick actions in one place.
              </p>
            </div>

            <Link
              href="/stores"
              className="text-blue-400 hover:underline"
            >
              Browse Stores
            </Link>

          </div>

          {authLoading || loading ? (

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-gray-400">
              Loading your saved stores...
            </div>

          ) : !user ? (

            <div className="rounded-3xl border border-violet-500/20 bg-violet-500/10 p-8 md:p-10">

              <div className="text-4xl mb-4">
                ⭐
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">
                Sign in to see your saved stores
              </h2>

              <p className="text-gray-300 leading-relaxed max-w-2xl mb-6">
                Save stores, track activity near you, earn points from approved uploads, and come back to the stores you care about fastest.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition"
                >
                  Login / Sign Up
                </Link>

                <Link
                  href="/stores"
                  className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold transition"
                >
                  Browse Stores
                </Link>

              </div>

            </div>

          ) : stores.length === 0 ? (

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 md:p-10">

              <div className="text-4xl mb-4">
                📍
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">
                No saved stores yet
              </h2>

              <p className="text-gray-400 leading-relaxed max-w-2xl mb-6">
                Start by saving the stores you check most often. They will show up here with recent uploads, distance, and quick upload buttons.
              </p>

              <Link
                href="/stores"
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition"
              >
                Browse Stores
              </Link>

            </div>

          ) : (

            <>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Saved Stores
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {stores.length}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Updated Today
                  </div>
                  <div className="text-2xl font-bold mt-1 text-green-400">
                    {updatedToday}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Total Uploads
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {totalUploads}
                  </div>
                </div>

              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">

                <div className="flex flex-wrap items-center justify-between gap-4">

                  <div className="flex flex-wrap gap-2">
                    {chains.map((chain) => (
                      <button
                        key={chain}
                        onClick={() => setChainFilter(chain)}
                        className={`text-sm px-3 py-2 rounded-lg border transition ${
                          chainFilter === chain
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-gray-950 border-gray-800 text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {chain}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">

                    <button
                      onClick={() => setSortMode('recent')}
                      className={`text-sm px-3 py-2 rounded-lg border transition ${sortMode === 'recent' ? 'bg-blue-600 border-blue-500' : 'bg-gray-950 border-gray-800 hover:bg-gray-800'}`}
                    >
                      Recent
                    </button>

                    <button
                      onClick={() => setSortMode('nearby')}
                      className={`text-sm px-3 py-2 rounded-lg border transition ${sortMode === 'nearby' ? 'bg-blue-600 border-blue-500' : 'bg-gray-950 border-gray-800 hover:bg-gray-800'}`}
                    >
                      Nearby
                    </button>

                    <button
                      onClick={() => setSortMode('active')}
                      className={`text-sm px-3 py-2 rounded-lg border transition ${sortMode === 'active' ? 'bg-blue-600 border-blue-500' : 'bg-gray-950 border-gray-800 hover:bg-gray-800'}`}
                    >
                      Most Active
                    </button>

                    <button
                      onClick={() => setSortMode('az')}
                      className={`text-sm px-3 py-2 rounded-lg border transition ${sortMode === 'az' ? 'bg-blue-600 border-blue-500' : 'bg-gray-950 border-gray-800 hover:bg-gray-800'}`}
                    >
                      A-Z
                    </button>

                  </div>

                </div>

              </div>

              {displayStores.length === 0 ? (

                <div className="bg-gray-900 rounded-xl p-6 text-gray-400 border border-gray-800">
                  No stores match this filter.
                </div>

              ) : sortMode === 'recent' ? (

                <div className="space-y-6">

                  <div>
                    <h2 className="text-lg font-bold mb-3">
                      Active Recently
                    </h2>

                    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                      {activeStores.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">
                          No recently active saved stores.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-800">
                          {activeStores.map((store) => (
                            <StoreCard key={store.id} store={store} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold mb-3">
                      Older Activity
                    </h2>

                    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                      {quietStores.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">
                          No quiet saved stores.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-800">
                          {quietStores.map((store) => (
                            <StoreCard key={store.id} store={store} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              ) : (

                <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">

                  {true && (
                    <div className="hidden md:grid grid-cols-[90px_1.4fr_1fr_1fr_1fr_220px] gap-4 px-4 py-3 bg-gray-950 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-800">

                      <div>
                        Preview
                      </div>

                      <div>
                        Store
                      </div>

                      <div>
                        Latest Stock
                      </div>

                      <div>
                        Updated
                      </div>

                      <div>
                        Activity
                      </div>

                      <div>
                        Actions
                      </div>

                    </div>
                  )}

                  <div className="divide-y divide-gray-800">
                    {displayStores.map((store) => (
                      <StoreCard key={store.id} store={store} />
                    ))}
                  </div>

                </div>

              )}

            </>

          )}

        </div>

      </div>

    </main>
  )
}

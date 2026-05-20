'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/app/components/Navbar'
import UploadForm from '@/app/components/UploadForm'
import { supabase } from '@/lib/supabase'
import {
  DEFAULT_CATEGORY,
  DEFAULT_FIND_QUALITY,
  DEFAULT_STOCK_LEVEL,
  FIND_QUALITY_OPTIONS,
  STOCK_LEVEL_OPTIONS,
  UPLOAD_CATEGORIES,
} from '@/app/lib/uploadOptions'
import { getStoreColor } from '@/app/lib/storeStyles'
import {
  getCurrentBrowserLocation,
  useBrowserLocation,
} from '@/app/lib/browserLocation'

export default function GlobalUploadPage() {

  const [search, setSearch] = useState('')
  const [stores, setStores] = useState<any[]>([])
  const [selectedStore, setSelectedStore] = useState<any>(null)

  const [loading, setLoading] = useState(false)
  const [showMissingStoreForm, setShowMissingStoreForm] = useState(false)

  const {
    coords: browserCoords,
    requestLocation,
    status: locationStatus,
  } = useBrowserLocation()

  const [storeName, setStoreName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [st, setSt] = useState('')
  const [postal, setPostal] = useState('')

  const [category, setCategory] = useState(DEFAULT_CATEGORY)
  const [stockLevel, setStockLevel] = useState(DEFAULT_STOCK_LEVEL)
  const [findQuality, setFindQuality] = useState(DEFAULT_FIND_QUALITY)
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)

  const [submittingMissingStore, setSubmittingMissingStore] = useState(false)

  useEffect(() => {

    const runSearch = async () => {

      if (!search.trim()) {
        setStores([])
        return
      }

      setLoading(true)

      const text = search.trim()

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .or(
          `store.ilike.%${text}%,city.ilike.%${text}%,address.ilike.%${text}%,postal.ilike.%${text}%`
        )
        .limit(20)

      if (error) {
        console.error(error)
        setStores([])
        setLoading(false)
        return
      }

      setStores(data || [])
      setLoading(false)
    }

    const timeout = setTimeout(runSearch, 250)

    return () => clearTimeout(timeout)

  }, [search])

  function resetMissingStoreForm() {
    setShowMissingStoreForm(false)
    setStoreName('')
    setAddress('')
    setCity('')
    setSt('')
    setPostal('')
    setCategory(DEFAULT_CATEGORY)
    setStockLevel(DEFAULT_STOCK_LEVEL)
    setFindQuality(DEFAULT_FIND_QUALITY)
    setNotes('')
    setFiles(null)
  }

  async function handleMissingStoreSubmit() {

    try {

      if (!storeName.trim()) {
        alert('Please enter the store name.')
        return
      }

      if (!address.trim()) {
        alert('Please enter the address.')
        return
      }

      if (!city.trim()) {
        alert('Please enter the city.')
        return
      }

      if (!st.trim()) {
        alert('Please enter the state.')
        return
      }

      if (!files || files.length === 0) {
        alert('Please choose at least one photo.')
        return
      }

      setSubmittingMissingStore(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert('You must be logged in.')
        setSubmittingMissingStore(false)
        return
      }

      const uploadLocation =
        await getCurrentBrowserLocation() || browserCoords

      const photoUrls: string[] = []

      for (const file of Array.from(files)) {

        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `store-submissions/${user.id}/${fileName}`

        const {
          error: storageError,
        } = await supabase
          .storage
          .from('store-submissions')
          .upload(filePath, file)

        if (storageError) {
          console.error('STORE SUBMISSION PHOTO ERROR:', storageError)
          continue
        }

        const {
          data: publicUrlData,
        } = supabase
          .storage
          .from('store-submissions')
          .getPublicUrl(filePath)

        photoUrls.push(publicUrlData.publicUrl)
      }

      if (photoUrls.length === 0) {
        alert('No photos uploaded. Please try again.')
        setSubmittingMissingStore(false)
        return
      }

      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || null

      const { error } = await supabase
        .from('store_submissions')
        .insert({
          user_id: user.id,
          store_name: storeName.trim(),
          address: address.trim(),
          city: city.trim(),
          st: st.trim().toUpperCase(),
          postal: postal.trim() || null,
          lat: uploadLocation?.lat ?? null,
          long: uploadLocation?.long ?? null,
          accuracy_m: uploadLocation?.accuracyM ?? null,
          location_captured_at:
            uploadLocation?.capturedAt || new Date().toISOString(),
          location_source: uploadLocation
            ? 'browser_geolocation'
            : 'not_available',
          client_timezone: timezone,
          category,
          stock_level: stockLevel,
          find_quality: findQuality,
          notes,
          photo_urls: photoUrls,
          status: 'pending',
        })

      if (error) {

  console.log('========================')
  console.log('FULL ERROR')
  console.log(JSON.stringify(error, null, 2))
  console.log('========================')

  alert(error.message || 'Store submission failed.')

  setSubmittingMissingStore(false)
  return
}

      alert('Store submitted for review!')

      resetMissingStoreForm()
      setSearch('')
      setStores([])

    } catch (err) {
      console.error('FULL STORE SUBMISSION ERROR:', err)
      alert('Something failed. Check console.')
    } finally {
      setSubmittingMissingStore(false)
    }
  }

  return (

    <main className="min-h-screen bg-black text-white">

      <Navbar />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">

        {/* HEADER */}
        <div className="mb-10">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-5">

            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />

            Live community uploads

          </div>

          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">

            Upload Store Activity

          </h1>

          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">

            Search for a store, upload shelf photos, or submit a new store if it is not listed yet.

          </p>

        </div>

        {/* STORE SEARCH */}
        {!selectedStore && !showMissingStoreForm && (

          <div className="mb-10">

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-6">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">

                <div>

                  <div className="text-lg font-semibold text-white">

                    Select a Store

                  </div>

                  <div className="text-sm text-gray-500 mt-1">

                    Search first. If the store is missing, submit it for admin review.

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowMissingStoreForm(true)
                    setSelectedStore(null)
                  }}
                  className="px-4 py-2 rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition text-sm"
                >
                  My store is not listed
                </button>

              </div>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Walmart Branford, Target Milford, CVS East Haven..."
                className="w-full px-5 py-4 rounded-2xl bg-black border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder:text-gray-500 mb-5"
              />

              {loading ? (

                <div className="text-gray-400 text-sm">
                  Searching stores...
                </div>

              ) : stores.length > 0 ? (

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {stores.map((store) => (

                    <button
                      key={store.id}
                      onClick={() => setSelectedStore(store)}
                      className="text-left rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition p-5"
                    >

                      <div className={`text-xl font-semibold mb-2 ${getStoreColor(store.store).text}`}>

                        {store.store}

                      </div>

                      <div className="text-gray-300 text-sm mb-1">

                        {store.address}

                      </div>

                      <div className="text-gray-500 text-sm">

                        {store.city}, {store.st} {store.postal}

                      </div>

                    </button>

                  ))}

                </div>

              ) : search.trim() ? (

                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">

                  <div className="text-gray-300 font-medium mb-2">
                    No stores found.
                  </div>

                  <div className="text-gray-500 text-sm mb-4">
                    If you are standing in the store, submit it and your location will be attached for admin review.
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMissingStoreForm(true)}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 transition text-white text-sm font-medium"
                  >
                    My store is not listed
                  </button>

                </div>

              ) : (

                <div className="text-gray-500 text-sm">
                  Start typing to search stores.
                </div>

              )}

            </div>

          </div>

        )}

        {/* MISSING STORE FORM */}
        {showMissingStoreForm && (

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-6">

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 mb-8">

              <div>

                <div className="text-sm uppercase tracking-wide text-gray-500 mb-2">

                  New Store Submission

                </div>

                <h2 className="text-3xl font-bold mb-2">

                  My store is not listed

                </h2>

                <p className="text-gray-400 max-w-2xl">

                  Submit the store, attach your current location, and upload photos.
                  An admin can review it and make it official later.

                </p>

              </div>

              <button
                type="button"
                onClick={resetMissingStoreForm}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-white"
              >
                Back to Search
              </button>

            </div>

            <div className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block mb-2 text-sm text-gray-400">
                    Store Name
                  </label>

                  <input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="CVS, Walmart, Local Toy Store..."
                    className="w-full bg-black border border-gray-700 rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm text-gray-400">
                    ZIP / Postal Code
                  </label>

                  <input
                    value={postal}
                    onChange={(e) => setPostal(e.target.value)}
                    placeholder="06512"
                    className="w-full bg-black border border-gray-700 rounded-lg p-3"
                  />
                </div>

              </div>

              <div>
                <label className="block mb-2 text-sm text-gray-400">
                  Street Address
                </label>

                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full bg-black border border-gray-700 rounded-lg p-3"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">

                <div>
                  <label className="block mb-2 text-sm text-gray-400">
                    City
                  </label>

                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="East Haven"
                    className="w-full bg-black border border-gray-700 rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm text-gray-400">
                    State
                  </label>

                  <input
                    value={st}
                    onChange={(e) => setSt(e.target.value)}
                    placeholder="CT"
                    maxLength={2}
                    className="w-full bg-black border border-gray-700 rounded-lg p-3 uppercase"
                  />
                </div>

              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <div className="text-sm font-medium text-gray-200">
                      Location Verification
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
                  Category
                </label>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-lg p-3"
                >
                  {UPLOAD_CATEGORIES.map((categoryOption) => (
                    <option
                      key={categoryOption}
                      value={categoryOption}
                    >
                      {categoryOption}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
                      <option
                        key={option.value}
                        value={option.value}
                      >
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
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

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

              <div>
                <label className="block mb-2 text-sm text-gray-400">
                  Photos
                </label>

                <p className="text-xs text-gray-500 mb-3">
                  Upload one or multiple photos from the store.
                </p>

                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="w-full bg-black border border-gray-700 rounded-lg p-3"
                />
              </div>

              <button
                type="button"
                onClick={handleMissingStoreSubmit}
                disabled={submittingMissingStore}
                className="bg-violet-600 hover:bg-violet-500 px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
              >
                {submittingMissingStore
                  ? 'Submitting...'
                  : 'Submit Store for Review'}
              </button>

            </div>

          </div>

        )}

        {/* SELECTED STORE */}
        {selectedStore && (

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-6">

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 mb-8">

              <div>

                <div className="text-sm uppercase tracking-wide text-gray-500 mb-2">

                  Selected Store

                </div>

                <div className={`text-3xl font-bold mb-2 ${getStoreColor(selectedStore.store).text}`}>

                  {selectedStore.store}

                </div>

                <div className="text-gray-300 mb-1">

                  {selectedStore.address}

                </div>

                <div className="text-gray-500">

                  {selectedStore.city}, {selectedStore.st} {selectedStore.postal}

                </div>

              </div>

              <button
                onClick={() => {

                  setSelectedStore(null)
                  setSearch('')
                  setStores([])

                }}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-white"
              >
                Change Store
              </button>

            </div>

            <UploadForm
              storeId={selectedStore.id}
              categories={UPLOAD_CATEGORIES}
            />

          </div>

        )}

      </div>

    </main>
  )
}

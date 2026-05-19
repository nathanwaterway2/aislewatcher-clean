'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SaveStoreButton from '@/app/components/SaveStoreButton'

export default function StorePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {

  const [store, setStore] = useState<any>(null)
  const [uploads, setUploads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

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

    if (
      value.includes('high') ||
      value.includes('loaded')
    ) {
      return 'bg-green-900/40 text-green-300'
    }

    if (
      value.includes('moderate')
    ) {
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

    const loadPage = async () => {

      const resolvedParams = await params
      const id = resolvedParams.id

      // LOAD STORE
      const { data: storeData, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', Number(id))
        .limit(1)

      if (error || !storeData || storeData.length === 0) {
        console.error(error)
        setLoading(false)
        return
      }

      setStore(storeData[0])

      // LOAD BATCHES
      const { data: batchesData } = await supabase
        .from('upload_batches')
        .select('*')
        .eq('store_id', Number(id))

      const batches = batchesData || []

      const batchIds = batches.map((batch) => Number(batch.id))

      // LOAD APPROVED UPLOADS
      let approvedUploads: any[] = []

      if (batchIds.length > 0) {

        const { data: uploadsData } = await supabase
          .from('uploads')
          .select('*')
          .in('batch_id', batchIds)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })

        approvedUploads = uploadsData || []
      }

      // LOAD USER PROFILES
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

      // ATTACH USER/BATCH DATA
      const uploadsWithMeta = approvedUploads.map((upload) => {

        const batch = batches.find(
          (b) => Number(b.id) === Number(upload.batch_id)
        )

        const profile = batch
          ? profiles.find((p) => p.id === batch.user_id)
          : null

        return {
          ...upload,
          batch,
          profile,
        }
      })

      setUploads(uploadsWithMeta)

      // LOAD AUTH USER
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const currentUser = session?.user || null

      setUser(currentUser)

      if (currentUser) {

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (profile) {
          setUsername(profile.username)
          setIsAdmin(profile.is_admin === true)
        }
      }

      setAuthLoading(false)
      setLoading(false)
    }

    loadPage()

  }, [params])

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

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        Loading...
      </main>
    )
  }

  if (!store) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        Store not found.
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">

      {/* NAVBAR */}
      <header className="border-b border-gray-800 bg-black">

        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">

          <Link
            href="/"
            className="text-white font-bold text-2xl"
          >
            AisleWatcher
          </Link>

          <div className="flex items-center gap-3">

            {authLoading ? (

              <div className="text-sm text-gray-400">
                Loading...
              </div>

            ) : user ? (
              <>

                {isAdmin && (
                  <Link
                    href="/admin/uploads"
                    className="border border-yellow-700 text-yellow-400 px-4 py-2 rounded-lg hover:bg-yellow-900/20 transition text-sm"
                  >
                    Moderation
                  </Link>
                )}

                <Link
                  href="/my-stores"
                  className="border border-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900/20 transition text-sm"
                >
                  My Stores
                </Link>

                <div className="text-sm text-gray-300 px-2">
                  {username || 'User'}
                </div>

                <button
                  onClick={handleLogout}
                  className="border border-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition text-sm"
                >
                  Logout
                </button>

              </>
            ) : (
              <>

                <button
                  onClick={handleLogin}
                  className="border border-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition text-sm"
                >
                  Login
                </button>

                <button
                  onClick={handleSignup}
                  className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                >
                  Sign Up
                </button>

              </>
            )}

          </div>

        </div>

      </header>

      <div className="p-6">

        <div className="max-w-5xl mx-auto">

          <Link
            href="/stores"
            className="text-blue-400 hover:underline"
          >
            ← Back to Stores
          </Link>

          {/* STORE HEADER */}
          <div className="mt-6 bg-gray-900 rounded-2xl p-6 border border-gray-800">

            <div className="text-sm uppercase tracking-wide text-gray-400 mb-2">
              {store.store}
            </div>

            <h1 className="text-3xl font-bold mb-4">
              {store.address}
            </h1>

            <div className="text-lg text-gray-300 mb-6">
              {store.city}, {store.st} {store.postal}
            </div>

            {(store.lat && store.long) && (
              <div className="text-sm text-gray-500 mb-6">
                {store.lat}, {store.long}
              </div>
            )}

            <div className="flex flex-wrap gap-3">

              <SaveStoreButton storeId={String(store.id)} />

              <Link
                href={`/stores/${store.id}/upload`}
                className="bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Upload Photos
              </Link>

            </div>

          </div>

          {/* RECENT ACTIVITY */}
          <div className="mt-8">

            <h2 className="text-2xl font-semibold mb-5">
              Recent Activity
            </h2>

            {uploads.length === 0 ? (

              <div className="bg-gray-900 rounded-xl p-6 text-gray-500 border border-gray-800">
                No approved uploads yet.
              </div>

            ) : (

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {uploads.map((upload) => (

                  <div
                    key={upload.id}
                    className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-blue-700 transition"
                  >

                    <img
                      src={upload.photo_url}
                      alt="Upload"
                      className="w-full h-72 object-cover"
                    />

                    <div className="p-5">

                      {/* TAGS */}
                      <div className="flex gap-2 flex-wrap mb-4">

                        <div className="bg-blue-900/40 text-blue-300 text-xs px-3 py-1 rounded-full">
                          {upload.batch?.category || 'Unknown'}
                        </div>

                        <div className={`text-xs px-3 py-1 rounded-full ${getStockColor(upload.stock_level)}`}>
                          {upload.stock_level || 'unknown'}
                        </div>

                        <div className="bg-green-900/40 text-green-300 text-xs px-3 py-1 rounded-full">
                          Verified Upload
                        </div>

                      </div>

                      {/* TIME */}
                      <div className="text-green-400 text-sm mb-2">
                        {timeAgo(upload.created_at)}
                      </div>

                      {/* USER */}
                      <div className="text-xs text-gray-500 mb-4">
                        Uploaded by {upload.profile?.username || 'Unknown User'}
                      </div>

                      {/* NOTES */}
                      <div className="text-gray-300 mb-5 leading-relaxed">
                        {upload.caption || 'No notes'}
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center gap-3 border-t border-gray-800 pt-4">

                        <button
                          className="text-sm bg-gray-800 hover:bg-gray-700 transition px-4 py-2 rounded-lg border border-gray-700"
                        >
                          Helpful
                        </button>

                        <button
                          className="text-sm bg-gray-800 hover:bg-red-900/30 transition px-4 py-2 rounded-lg border border-gray-700 text-gray-300"
                        >
                          Report
                        </button>

                        <div className="ml-auto text-xs text-gray-500">
                          Community photo
                        </div>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </div>

      </div>

    </main>
  )
}
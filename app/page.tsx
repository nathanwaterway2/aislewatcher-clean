'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createUniqueUsername } from '@/lib/createUniqueUsername'
import Navbar from '@/app/components/Navbar'
import { getStoreColor } from '@/app/lib/storeStyles'

export default function Home() {

  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')

  const [recentBatches, setRecentBatches] = useState<any[]>([])

  useEffect(() => {

    const init = async () => {

      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (user) {

        setUser(user)

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {

          setUsername(profile.username)
          setIsAdmin(profile.is_admin || false)

        } else {

          const newUsername = await createUniqueUsername()

          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: newUsername,
              is_admin: false
            })

          setUsername(newUsername)
        }
      }

      const { data: batchData } = await supabase
        .from('upload_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12)

      const batches = batchData || []

      const storeIds = [
        ...new Set(
          batches
            .map((b: any) => Number(b.store_id))
            .filter(Boolean)
        )
      ]

      const { data: storesData } = await supabase
        .from('stores')
        .select('*')
        .in('id', storeIds)

      const batchIds = batches.map((b: any) => Number(b.id))

      const { data: uploadsData } = await supabase
        .from('uploads')
        .select('*')
        .in('batch_id', batchIds)
        .eq('status', 'approved')
        .not('photo_url', 'is', null)

      const mergedBatches = batches
        .map((batch: any) => {

          const store = storesData?.find(
            (s: any) =>
              Number(s.id) === Number(batch.store_id)
          )

          const uploads = uploadsData?.filter(
            (u: any) =>
              Number(u.batch_id) === Number(batch.id)
          ) || []

          if (uploads.length === 0) return null

          return {
            ...batch,
            store,
            uploads
          }
        })
        .filter(Boolean)

      setRecentBatches(mergedBatches)

      setLoading(false)
    }

    init()

  }, [])

  const handleSearch = () => {

    if (!search.trim()) return

    router.push(
      `/stores?q=${encodeURIComponent(search.trim())}`
    )
  }

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

  return (

    <main className="min-h-screen bg-black text-white">

      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_45%)]" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">

          <h1 className="text-5xl md:text-7xl font-semibold mb-6 leading-tight tracking-tight">

            See what’s actually
            <br />
            in stores near you

          </h1>

          <p className="text-gray-400 mb-12 text-xl max-w-2xl mx-auto leading-relaxed">

            Browse real shelf photos, recent finds,
            and live inventory activity from nearby stores.

          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Walmart Branford, Target Milford, CVS East Haven..."
              className="w-full max-w-2xl px-6 py-5 rounded-2xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder:text-gray-500 backdrop-blur-sm"
            />

            <button
              onClick={handleSearch}
              className="px-8 py-5 rounded-2xl bg-violet-600 text-white font-medium hover:bg-violet-500 transition"
            >
              Search
            </button>

          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">

            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10">
              Real shelf photos
            </div>

            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10">
              Community uploads
            </div>

            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10">
              Live store activity
            </div>

          </div>

        </div>

      </section>

      {/* RECENT ACTIVITY */}
      <section className="max-w-7xl mx-auto px-6 pb-20">

        <div className="flex items-center justify-between mb-6">

          <div>

            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-1">
              Recent store activity
            </h2>

            <p className="text-gray-400">
              Latest uploads grouped by store activity
            </p>

          </div>

          <Link
            href="/stores"
            className="text-violet-400 hover:text-violet-300 transition text-sm"
          >
            Browse all →
          </Link>

        </div>

        {loading ? (

          <div className="text-gray-400">
            Loading...
          </div>

        ) : recentBatches.length === 0 ? (

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">

            <div className="text-5xl mb-4">
              📸
            </div>

            <h3 className="text-xl font-semibold text-white mb-2">
              No recent uploads yet
            </h3>

            <p className="text-gray-500">
              Uploads will appear here once approved.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            {recentBatches.map((batch: any) => {

              const uploads = batch.uploads || []

              return (

                <Link
                  key={batch.id}
                  href={`/stores/${batch.store?.id || ''}`}
                  className="group"
                >

                  <div className="rounded-3xl overflow-hidden bg-[#0b0b0f] border border-white/10 hover:border-white/20 transition hover:-translate-y-1">

                    {/* IMAGES */}
                    <div className="relative bg-black">

                      {/* SINGLE IMAGE */}
                      {uploads.length === 1 && (

                        <div className="relative h-[250px]">

                          <img
                            src={uploads[0].photo_url}
                            alt="Upload"
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500"
                          />

                        </div>

                      )}

                      {/* TWO IMAGES */}
                      {uploads.length === 2 && (

                        <div className="grid grid-cols-2 gap-[2px] h-[340px]">

                          {uploads.map((upload: any) => (

                            <img
                              key={upload.id}
                              src={upload.photo_url}
                              alt="Upload"
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500"
                            />

                          ))}

                        </div>

                      )}

                      {/* THREE+ IMAGES */}
                      {uploads.length >= 3 && (

                        <div className="grid grid-cols-2 gap-[2px] h-[340px]">

                          <img
                            src={uploads[0].photo_url}
                            alt="Upload"
                            className="w-full h-full object-cover"
                          />

                          <div className="relative">

                            <img
                              src={uploads[1].photo_url}
                              alt="Upload"
                              className="w-full h-full object-cover"
                            />

                            {uploads.length > 2 && (

                              <div className="absolute inset-0 bg-black/55 flex items-center justify-center">

                                <div className="text-white text-3xl font-bold">

                                  +{uploads.length - 2}

                                </div>

                              </div>

                            )}

                          </div>

                        </div>

                      )}

                      {/* TIME BADGE */}
                      <div className="absolute top-3 left-3">

                        <div className="px-2.5 py-1 rounded-full bg-green-500 text-white text-xs font-semibold shadow-lg">

                          {timeAgo(batch.created_at)}

                        </div>

                      </div>

                    </div>

                    {/* INFO */}
                    <div className="p-4">

                      <div className="mb-3">

                        <div className={`text-lg font-semibold mb-1 ${getStoreColor(batch.store?.store || '').text}`}>

                          {batch.store?.store || 'Unknown Store'}

                        </div>

                        <div className="text-sm text-gray-400">

                          {batch.store?.city || 'Unknown City'}
                          {batch.store?.st
                            ? `, ${batch.store.st}`
                            : ''}

                        </div>

                      </div>

                      <div className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-2">

                        {batch.notes ||
                          uploads[0]?.caption ||
                          'Recent community upload activity'}

                      </div>

                      <div className="flex items-center justify-between text-xs">

                        <div className="text-gray-500">

                          {uploads.length} photo
                          {uploads.length !== 1 ? 's' : ''}

                        </div>

                        <div className="text-violet-400">

                          View store →

                        </div>

                      </div>

                    </div>

                  </div>

                </Link>

              )
            })}

          </div>

        )}

      </section>

    </main>

  )
}
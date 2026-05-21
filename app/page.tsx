'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createUniqueUsername } from '@/lib/createUniqueUsername'
import Navbar from '@/app/components/Navbar'
import { getStoreColor } from '@/app/lib/storeStyles'

type PlatformStats = {
  storesTracked: number
  uploadsThisWeek: number
  uploadsToday: number
}

export default function Home() {

  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [recentBatches, setRecentBatches] = useState<any[]>([])
  const [earlierBatches, setEarlierBatches] = useState<any[]>([])
  const [stats, setStats] = useState<PlatformStats>({
    storesTracked: 0,
    uploadsThisWeek: 0,
    uploadsToday: 0,
  })

  useEffect(() => {

    const init = async () => {

      setLoading(true)

      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (user) {

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile) {

          const newUsername = await createUniqueUsername()

          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: newUsername,
              is_admin: false
            })
        }
      }

      const now = new Date()

      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)

      const [
        storesCountResult,
        uploadsWeekResult,
        uploadsTodayResult,
      ] = await Promise.all([
        supabase
          .from('stores')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('uploads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('created_at', sevenDaysAgo.toISOString()),

        supabase
          .from('uploads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('created_at', todayStart.toISOString()),
      ])

      setStats({
        storesTracked: storesCountResult.count || 0,
        uploadsThisWeek: uploadsWeekResult.count || 0,
        uploadsToday: uploadsTodayResult.count || 0,
      })

      const { data: batchData } = await supabase
        .from('upload_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)

      const batches = batchData || []

      const storeIds = [
        ...new Set(
          batches
            .map((b: any) => Number(b.store_id))
            .filter(Boolean)
        )
      ]

      const batchIds = batches.map((b: any) => Number(b.id))

      const [
        storesResult,
        uploadsResult,
      ] = await Promise.all([

        storeIds.length > 0
          ? supabase
              .from('stores')
              .select('*')
              .in('id', storeIds)
          : Promise.resolve({ data: [] as any[] }),

        batchIds.length > 0
          ? supabase
              .from('uploads')
              .select('*')
              .in('batch_id', batchIds)
              .eq('status', 'approved')
              .not('photo_url', 'is', null)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as any[] }),

      ])

      const storesData = storesResult.data || []
      const uploadsData = uploadsResult.data || []

      const mergedBatches = batches
        .map((batch: any) => {

          const store = storesData.find(
            (s: any) =>
              Number(s.id) === Number(batch.store_id)
          )

          const uploads = uploadsData.filter(
            (u: any) =>
              Number(u.batch_id) === Number(batch.id)
          )

          if (uploads.length === 0) return null

          return {
            ...batch,
            store,
            uploads,
          }
        })
        .filter(Boolean)

      const fresh = mergedBatches.filter((batch: any) => {
        const createdAt = new Date(batch.created_at).getTime()
        return createdAt >= sevenDaysAgo.getTime()
      })

      const earlier = mergedBatches.filter((batch: any) => {
        const createdAt = new Date(batch.created_at).getTime()
        return createdAt < sevenDaysAgo.getTime()
      })

      setRecentBatches(fresh.slice(0, 8))
      setEarlierBatches(earlier.slice(0, 4))

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

  function formatNumber(value: number) {

    return value.toLocaleString()
  }

  function getBatchPrice(batch: any) {

    const uploads = batch.uploads || []

    const uploadWithPrice = uploads.find((upload: any) =>
      upload.price_seen ||
      upload.price ||
      upload.priceSeen
    )

    const value =
      uploadWithPrice?.price_seen ||
      uploadWithPrice?.price ||
      uploadWithPrice?.priceSeen ||
      batch.price_seen ||
      batch.price ||
      null

    if (!value) return null

    const text = String(value).trim()

    if (!text) return null

    return text.startsWith('$') ? text : `$${text}`
  }

  function getBatchText(batch: any) {

    const uploads = batch.uploads || []

    return (
      batch.notes ||
      uploads[0]?.caption ||
      'Fresh community shelf update'
    )
  }

  function renderBatchCard(batch: any, compact = false) {

    const uploads = batch.uploads || []
    const price = getBatchPrice(batch)
    const note = getBatchText(batch)

    return (

      <Link
        key={batch.id}
        href={`/stores/${batch.store?.id || ''}`}
        className="group block"
      >

        <div className={`rounded-3xl overflow-hidden bg-[#0b0b0f] border border-white/10 hover:border-white/20 transition hover:-translate-y-1 ${compact ? 'opacity-80 hover:opacity-100' : ''}`}>

          <div className="relative bg-black">

            {uploads.length === 1 && (

              <div className={compact ? 'relative h-[190px]' : 'relative h-[280px] md:h-[300px]'}>

                <img
                  src={uploads[0].photo_url}
                  alt="Store upload"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500"
                />

              </div>

            )}

            {uploads.length === 2 && (

              <div className={`grid grid-cols-2 gap-[2px] ${compact ? 'h-[190px]' : 'h-[280px] md:h-[300px]'}`}>

                {uploads.slice(0, 2).map((upload: any) => (

                  <img
                    key={upload.id}
                    src={upload.photo_url}
                    alt="Store upload"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500"
                  />

                ))}

              </div>

            )}

            {uploads.length >= 3 && (

              <div className={`grid grid-cols-2 gap-[2px] ${compact ? 'h-[190px]' : 'h-[280px] md:h-[300px]'}`}>

                <img
                  src={uploads[0].photo_url}
                  alt="Store upload"
                  className="w-full h-full object-cover"
                />

                <div className="relative">

                  <img
                    src={uploads[1].photo_url}
                    alt="Store upload"
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">

                    <div className="text-white text-3xl font-bold">

                      +{uploads.length - 2}

                    </div>

                  </div>

                </div>

              </div>

            )}

            <div className="absolute top-3 left-3 flex flex-wrap gap-2">

              <div className="px-2.5 py-1 rounded-full bg-green-500 text-white text-xs font-semibold shadow-lg">

                Updated {timeAgo(batch.created_at)}

              </div>

              {price && (

                <div className="px-2.5 py-1 rounded-full bg-black/70 border border-white/15 text-white text-xs font-semibold shadow-lg">

                  Seen at {price}

                </div>

              )}

            </div>

          </div>

          <div className={compact ? 'p-4' : 'p-5'}>

            <div className="mb-3">

              <div className={`font-semibold mb-1 ${compact ? 'text-lg' : 'text-xl'} ${getStoreColor(batch.store?.store || '').text}`}>

                {batch.store?.store || 'Unknown Store'}

              </div>

              <div className="text-sm text-gray-400">

                {batch.store?.city || 'Unknown City'}
                {batch.store?.st ? `, ${batch.store.st}` : ''}

              </div>

            </div>

            <div className={`text-gray-300 text-sm leading-relaxed mb-4 ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>

              {note}

            </div>

            <div className="flex items-center justify-between gap-3 text-xs">

              <div className="text-gray-500">

                {uploads.length} photo
                {uploads.length !== 1 ? 's' : ''}

              </div>

              <div className="text-violet-400 font-medium">

                View store →

              </div>

            </div>

          </div>

        </div>

      </Link>

    )
  }

  return (

    <main className="min-h-screen bg-black text-white">

      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_45%)]" />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-14 text-center">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-300 text-sm mb-7">

            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

            Soft launch is live — early uploads earn points

          </div>

          <h1 className="text-5xl md:text-7xl font-semibold mb-6 leading-tight tracking-tight">

            See what’s actually
            <br />
            in stores near you

          </h1>

          <p className="text-gray-300 mb-3 text-xl max-w-2xl mx-auto leading-relaxed">

            Fresh restocks, price sightings, and collector finds near you.

          </p>

          <p className="text-gray-500 mb-10 text-base max-w-2xl mx-auto leading-relaxed">

            Search a store, check recent shelf photos, or post the first update for your area.

          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
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

          <div className="text-sm text-gray-500 mb-8">

            No update for your store yet?{' '}

            <Link
              href="/login"
              className="text-violet-300 hover:text-violet-200 underline underline-offset-4"
            >
              Sign up
            </Link>

            {' '}and be the first to post it.

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">

            <div className="px-5 py-4 rounded-2xl bg-white/5 border border-white/10">

              <div className="text-2xl font-semibold text-white">
                {formatNumber(stats.storesTracked)}
              </div>

              <div className="text-sm text-gray-400">
                stores tracked
              </div>

            </div>

            <div className="px-5 py-4 rounded-2xl bg-white/5 border border-white/10">

              <div className="text-2xl font-semibold text-white">
                {formatNumber(stats.uploadsThisWeek)}
              </div>

              <div className="text-sm text-gray-400">
                uploads this week
              </div>

            </div>

            <div className="px-5 py-4 rounded-2xl bg-white/5 border border-white/10">

              <div className="text-2xl font-semibold text-white">
                {formatNumber(stats.uploadsToday)}
              </div>

              <div className="text-sm text-gray-400">
                new today
              </div>

            </div>

          </div>

        </div>

      </section>

      {/* RECENT ACTIVITY */}
      <section className="max-w-6xl mx-auto px-6 pb-24">

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">

          <div>

            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-1">
              Recent store activity
            </h2>

            <p className="text-gray-400">
              Fresh updates from the last 7 days
            </p>

          </div>

          <Link
            href="/stores"
            className="text-violet-400 hover:text-violet-300 transition text-sm"
          >
            Browse all stores →
          </Link>

        </div>

        {loading ? (

          <div className="text-gray-400">
            Loading recent activity...
          </div>

        ) : recentBatches.length === 0 ? (

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">

            <div className="text-5xl mb-4">
              📸
            </div>

            <h3 className="text-xl font-semibold text-white mb-2">
              No fresh uploads yet
            </h3>

            <p className="text-gray-500 mb-5">
              Be the first person to post a shelf update this week.
            </p>

            <Link
              href="/upload"
              className="inline-flex px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition"
            >
              Upload an update
            </Link>

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {recentBatches.map((batch: any) =>
              renderBatchCard(batch)
            )}

          </div>

        )}

        {!loading && earlierBatches.length > 0 && (

          <div className="mt-12">

            <div className="flex items-center justify-between mb-5">

              <div>

                <h3 className="text-xl font-semibold text-white">
                  Earlier updates
                </h3>

                <p className="text-gray-500 text-sm">
                  Older activity is kept here so the main feed stays fresh.
                </p>

              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {earlierBatches.map((batch: any) =>
                renderBatchCard(batch, true)
              )}

            </div>

          </div>

        )}

      </section>

    </main>

  )
}

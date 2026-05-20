'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createUniqueUsername } from '@/lib/createUniqueUsername'
import Navbar from '@/app/components/Navbar'

export default function Home() {

  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')

  // ✅ RECENT UPLOADS
  const [recentUploads, setRecentUploads] = useState<any[]>([])

  // ✅ PROFILE + RECENTS
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

          const { error } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: newUsername,
              is_admin: false
            })

          if (!error) {
            setUsername(newUsername)
          }
        }
      }

      // ✅ LOAD RECENTS
      const { data: uploadsData } = await supabase
        .from('uploads')
        .select('*')
        .eq('status', 'approved')
        .not('photo_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(8)

      setRecentUploads(uploadsData || [])

      setLoading(false)
    }

    init()

  }, [])

  // 🔍 SEARCH
  const handleSearch = () => {

    if (!search.trim()) return

    const encoded = encodeURIComponent(search.trim())

    router.push(`/stores?q=${encoded}`)
  }

  // ⏱ TIME AGO
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
      <div className="max-w-5xl mx-auto text-center px-6 py-24">

        {/* LABEL */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-8">

          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

          Live store activity from real users

        </div>

        {/* TITLE */}
        <h1 className="text-5xl md:text-7xl font-semibold mb-6 leading-tight tracking-tight">

          See what’s actually
          <br />
          in stores near you

        </h1>

        {/* SUBTITLE */}
        <p className="text-gray-400 mb-12 text-xl max-w-2xl mx-auto leading-relaxed">

          Browse real shelf photos, track inventory activity,
          and find items before you waste the trip.

        </p>

        {/* SEARCH */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Walmart Branford, Target Milford, CVS East Haven..."
            className="w-full max-w-2xl px-6 py-5 rounded-2xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder:text-gray-500 backdrop-blur-sm"
          />

          <button
            onClick={handleSearch}
            className="px-8 py-5 rounded-2xl bg-violet-600 text-white font-medium hover:bg-violet-500 transition shadow-xl shadow-violet-900/30"
          >
            Search
          </button>

        </div>

        {/* QUICK STATS */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">

          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10">
            Real shelf photos
          </div>

          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10">
            Live upload activity
          </div>

          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10">
            Community verified
          </div>

        </div>

      </div>

      {/* RECENT UPLOADS */}
      <div className="max-w-6xl mx-auto px-6 pb-24">

        <div className="flex items-center justify-between mb-6">

          <div>

            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-1">
              Recent store photos
            </h2>

            <p className="text-gray-400">
              Latest community uploads
            </p>

          </div>

          <Link
            href="/stores"
            className="text-violet-400 hover:text-violet-300 transition text-sm"
          >
            Browse all →
          </Link>

        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {recentUploads.map((upload, index) => (

            <Link
              key={upload.id || index}
              href={`/stores/${upload.store_id || ''}`}
              className="group"
            >

              <div className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition">

                <div className="aspect-[4/5] overflow-hidden bg-black">

                  <img
                    src={upload.photo_url}
                    alt="Recent upload"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500"
                  />

                </div>

                <div className="p-3">

                  <div className="text-white text-sm font-medium truncate">
                    {upload.find_quality || 'Recent Upload'}
                  </div>

                  <div className="text-gray-500 text-xs mt-1">
                    {timeAgo(upload.created_at)}
                  </div>

                </div>

              </div>

            </Link>

          ))}

        </div>

      </div>

    </main>
  )
}
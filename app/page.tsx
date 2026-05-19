'use client'

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

  // ✅ Profile logic
  useEffect(() => {

    const init = async () => {

      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
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
        setIsAdmin(profile.is_admin || false)
        setLoading(false)

        return
      }

      const newUsername = await createUniqueUsername()

      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: newUsername,
          is_admin: false
        })

      if (error) {
        console.error('PROFILE INSERT ERROR:', error)
      } else {
        setUsername(newUsername)
      }

      setLoading(false)
    }

    init()

  }, [])

  // 🔍 SEARCH
  const handleSearch = () => {

    if (!search) return

    const encoded = encodeURIComponent(search.trim())

    router.push(`/stores?q=${encoded}`)
  }

  // auth functions
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

  const handleLogout = async () => {

    await supabase.auth.signOut()

    window.location.reload()
  }

  return (
    <main className="min-h-screen bg-black text-white">

      <Navbar />

      {/* HERO */}
      <div className="max-w-5xl mx-auto text-center px-6 py-24">

        {/* SMALL LABEL */}
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

    </main>
  )
}
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Navbar() {

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {

    async function loadUser() {

      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setUser(null)
        return
      }

      setUser(session.user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      setProfile(profileData)
    }

    loadUser()

  }, [])

  async function handleLogout() {

    await supabase.auth.signOut()

    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">

      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-8">

          <Link
            href="/"
            className="flex items-center gap-3 group"
          >

            {/* LOGO */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-violet-900/40">
              AW
            </div>

            <div className="text-white font-semibold tracking-tight text-lg group-hover:text-violet-300 transition">
              AisleWatcher
            </div>

          </Link>

          {/* NAV LINKS */}
          <nav className="hidden md:flex items-center gap-6 text-sm">

            <Link
              href="/stores"
              className="text-gray-400 hover:text-white transition"
            >
              Browse Stores
            </Link>

            {user && (
              <>
                <Link
                  href="/my-stores"
                  className="text-gray-400 hover:text-white transition"
                >
                  My Stores
                </Link>

                <Link
                  href="/my-uploads"
                  className="text-gray-400 hover:text-white transition"
                >
                  My Uploads
                </Link>
              </>
            )}

          </nav>

        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">

          {user ? (
            <>

              {/* ADMIN */}
              {profile?.is_admin && (
                <Link
                  href="/admin/uploads"
                  className="hidden md:flex items-center px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20 transition text-sm"
                >
                  Moderation
                </Link>
              )}

              {/* USER CARD */}
              <Link
                href="/my-uploads"
                className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >

                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                  {(profile?.username || 'U')[0]?.toUpperCase()}
                </div>

                <div className="leading-tight">

                  <div className="text-sm text-white font-medium">
                    {profile?.username || 'User'}
                  </div>

                  <div className="text-xs text-violet-300">
                    {(profile?.points || 0)} pts
                  </div>

                </div>

              </Link>

              {/* MOBILE USERNAME */}
              <div className="hidden sm:block lg:hidden text-sm text-gray-400">
                {profile?.username || 'User'}
              </div>

              {/* LOGOUT */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm transition"
              >
                Logout
              </button>

            </>
          ) : (
            <>

              <Link
                href="/login"
                className="text-sm text-gray-300 hover:text-white transition px-2"
              >
                Sign In
              </Link>

              <Link
                href="/signup"
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition shadow-lg shadow-violet-900/30"
              >
                Sign Up
              </Link>

            </>
          )}

        </div>

      </div>

    </header>
  )
}
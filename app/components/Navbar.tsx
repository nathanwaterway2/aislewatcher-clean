'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Navbar() {

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  // ✅ MOBILE MENU
  const [mobileOpen, setMobileOpen] = useState(false)

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

    <>
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* LEFT */}
          <div className="flex items-center gap-4">

            {/* MOBILE MENU BUTTON */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white"
            >

              <div className="space-y-1">

                <div className="w-4 h-0.5 bg-white rounded-full" />
                <div className="w-4 h-0.5 bg-white rounded-full" />
                <div className="w-4 h-0.5 bg-white rounded-full" />

              </div>

            </button>

            {/* LOGO */}
            <Link
              href="/"
              className="flex items-center gap-3 group"
            >

              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-violet-900/40">
                AW
              </div>

              <div className="text-white font-semibold tracking-tight text-lg group-hover:text-violet-300 transition">

                AisleWatcher

              </div>

            </Link>

            {/* DESKTOP NAV */}
            <nav className="hidden md:flex items-center gap-6 text-sm ml-6">

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

          {/* RIGHT */}
          <div className="flex items-center gap-2">

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

                {/* DESKTOP PROFILE */}
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

                {/* MOBILE USER */}
                <div className="lg:hidden text-xs text-gray-400 px-2 truncate max-w-[90px]">

                  {profile?.username || 'User'}

                </div>

                {/* LOGOUT */}
                <button
                  onClick={handleLogout}
                  className="px-3 sm:px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm transition"
                >
                  Logout
                </button>

              </>

            ) : (

              <>

                <Link
                  href="/login"
                  className="hidden sm:block text-sm text-gray-300 hover:text-white transition px-2"
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

      {/* MOBILE MENU */}
      {mobileOpen && (

        <div className="md:hidden border-b border-white/10 bg-zinc-950 px-4 py-4">

          <div className="flex flex-col gap-2">

            <Link
              href="/stores"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
            >
              Browse Stores
            </Link>

            {user && (
              <>
                <Link
                  href="/my-stores"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
                >
                  My Stores
                </Link>

                <Link
                  href="/my-uploads"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
                >
                  My Uploads
                </Link>

                {profile?.is_admin && (

                  <Link
                    href="/admin/uploads"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300"
                  >
                    Moderation
                  </Link>

                )}

                <button
                  onClick={handleLogout}
                  className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-left"
                >
                  Logout
                </button>
              </>
            )}

          </div>

        </div>

      )}

    </>
  )
}
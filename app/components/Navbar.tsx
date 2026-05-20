'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Navbar() {

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const [mobileOpen, setMobileOpen] = useState(false)

  const [points, setPoints] = useState(0)

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

      const { data: batchesData } = await supabase
        .from('upload_batches')
        .select('id')
        .eq('user_id', session.user.id)

      const batchIds = (batchesData || []).map(
        (b: any) => Number(b.id)
      )

      if (batchIds.length === 0) {
        setPoints(0)
        return
      }

      const { data: uploadsData } = await supabase
        .from('uploads')
        .select('id')
        .in('batch_id', batchIds)
        .eq('status', 'approved')

      const approvedCount = uploadsData?.length || 0

      setPoints(approvedCount * 10)
    }

    loadUser()

  }, [])

  async function handleLogout() {

    await supabase.auth.signOut()

    window.location.href = '/'
  }

  return (

    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* LEFT SIDE */}
          <div className="flex items-center gap-4">

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

            {/* MAIN NAV */}
            <nav className="hidden md:flex items-center gap-7 text-sm ml-6">

              <Link
                href="/stores"
                className="text-gray-400 hover:text-white transition"
              >
                Browse Stores
              </Link>

              <Link
                href="/upload"
                className="text-violet-300 hover:text-white transition"
              >
                Upload
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

            {/* ADMIN BUTTON */}
            {profile?.is_admin && (

              <Link
                href="/admin/uploads"
                className="hidden md:flex items-center px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20 transition text-sm font-medium"
              >
                Moderation
              </Link>

            )}

            {user ? (

              <>

                {/* USER PILL */}
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

                      {points} pts

                    </div>

                  </div>

                </Link>

                {/* LOGOUT */}
                <button
                  onClick={handleLogout}
                  className="hidden md:block px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm transition"
                >
                  Logout
                </button>

              </>

            ) : (

              <div className="hidden md:flex items-center gap-2">

                <Link
                  href="/login"
                  className="text-sm text-gray-300 hover:text-white transition px-2"
                >
                  Sign In
                </Link>

				<Link
				  href="/login?mode=signup"
				  onClick={() => setMobileOpen(false)}
				  className="px-4 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white transition"
				>
				  Sign Up
				</Link>

              </div>

            )}

            {/* MOBILE MENU */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-11 h-11 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition"
            >

              {mobileOpen ? '✕' : '☰'}

            </button>

          </div>

        </div>

      </header>

      {/* MOBILE MENU */}
      {mobileOpen && (

        <div className="md:hidden border-b border-white/10 bg-black/95 backdrop-blur-xl">

          <div className="px-4 py-4 flex flex-col gap-2">

            <Link
              href="/stores"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
            >
              Browse Stores
            </Link>

            <Link
              href="/upload"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 transition"
            >
              Upload
            </Link>

            {user && (
              <>
                <Link
                  href="/my-stores"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
                >
                  My Stores
                </Link>

                <Link
                  href="/my-uploads"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
                >
                  My Uploads
                </Link>

                {profile?.is_admin && (

                  <Link
                    href="/admin/uploads"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20 transition"
                  >
                    Moderation
                  </Link>

                )}

                <div className="mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10">

                  <div className="text-white font-medium mb-1">

                    {profile?.username || 'User'}

                  </div>

                  <div className="text-violet-300 text-sm">

                    {points} pts

                  </div>

                </div>

                <button
                  onClick={handleLogout}
                  className="mt-2 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition text-left"
                >
                  Logout
                </button>

              </>
            )}

            {!user && (

              <div className="flex flex-col gap-2 pt-2">

                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
                >
                  Sign In
                </Link>

                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white transition"
                >
                  Sign Up
                </Link>

              </div>

            )}

          </div>

        </div>

      )}

    </>
  )
}

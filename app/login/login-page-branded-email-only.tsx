'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createUniqueUsername } from '@/lib/createUniqueUsername'

export default function LoginPage() {

  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  const cleanEmail = email.trim().toLowerCase()

  async function ensureProfile(userId: string) {

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile) return

    const username = await createUniqueUsername()

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username,
        is_admin: false,
        points: 0,
      })

    if (profileError) {
      throw profileError
    }
  }

  const handleAuth = async () => {

    if (!cleanEmail || !password) {
      alert('Please enter your email and password.')
      return
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {

      if (isSignup) {

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        })

        if (error) {
          alert(error.message)
          setLoading(false)
          return
        }

        if (data.user) {
          await ensureProfile(data.user.id)
        }

        alert('Account created! You are ready to start tracking stores.')

      } else {

        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })

        if (error) {
          alert(error.message)
          setLoading(false)
          return
        }

        if (data.user) {
          await ensureProfile(data.user.id)
        }

      }

      setLoading(false)

      router.push('/stores')
      router.refresh()

    } catch (error: any) {

      console.error('AUTH ERROR:', error)
      alert(error?.message || 'Something went wrong. Please try again.')
      setLoading(false)

    }
  }

  const handleForgotPassword = async () => {

    if (!cleanEmail) {
      alert('Enter your email first, then click Forgot password.')
      return
    }

    setResetLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/login`,
    })

    setResetLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    alert('Password reset email sent. Check your inbox.')
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">

      <div className="w-full max-w-md">

        <div className="text-center mb-8">

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-3 group"
          >

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-violet-900/40">
              AW
            </div>

            <div className="text-2xl font-bold tracking-tight group-hover:text-violet-300 transition">
              AisleWatcher
            </div>

          </Link>

          <p className="text-gray-400 mt-4 leading-relaxed">
            Join early, earn points, save your stores, and compete for real collector prizes.
          </p>

        </div>

        <div className="bg-gray-900/90 rounded-3xl p-6 border border-gray-800 shadow-2xl shadow-black/40">

          <div className="grid grid-cols-2 gap-2 mb-6 rounded-2xl bg-black/60 border border-white/10 p-1">

            <button
              type="button"
              onClick={() => setIsSignup(false)}
              className={`py-3 rounded-xl text-sm font-semibold transition ${
                !isSignup
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => setIsSignup(true)}
              className={`py-3 rounded-xl text-sm font-semibold transition ${
                isSignup
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>

          </div>

          <h1 className="text-3xl font-bold mb-2">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>

          <p className="text-gray-400 mb-6">
            {isSignup
              ? 'Your username will be created automatically so you can start uploading fast.'
              : 'Log in to see saved stores, points, and your upload history.'}
          </p>

          <label className="block text-sm text-gray-300 mb-2">
            Email
          </label>

          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full mb-4 p-3 rounded-xl bg-black border border-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <div className="flex items-center justify-between mb-2">

            <label className="block text-sm text-gray-300">
              Password
            </label>

            {!isSignup && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-xs text-violet-300 hover:text-violet-200 transition disabled:opacity-50"
              >
                {resetLoading ? 'Sending...' : 'Forgot password?'}
              </button>
            )}

          </div>

          <input
            type="password"
            placeholder={isSignup ? 'Create a password' : 'Enter your password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            className="w-full mb-6 p-3 rounded-xl bg-black border border-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <button
            type="button"
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition text-white font-semibold py-3 rounded-xl shadow-lg shadow-violet-900/30"
          >
            {loading
              ? 'Working...'
              : isSignup
                ? 'Create Account'
                : 'Login'}
          </button>

          <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4">

            <div className="text-sm font-semibold text-white mb-1">
              Why make an account?
            </div>

            <p className="text-sm text-gray-400 leading-relaxed">
              Accounts connect your uploads to points, saved stores, moderation checks, and prize eligibility.
            </p>

          </div>

        </div>

      </div>

    </main>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createUniqueUsername } from '@/lib/createUniqueUsername'

export default function LoginPage() {

  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  const handleAuth = async () => {

    setLoading(true)

    if (isSignup) {

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        alert(error.message)
        setLoading(false)
        return
      }

      if (data.user) {

        const username = await createUniqueUsername()

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            is_admin: false,
            points: 0,
          })

        if (profileError) {
          alert(profileError.message)
          setLoading(false)
          return
        }
      }

      alert('Account created!')

    } else {

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        alert(error.message)
        setLoading(false)
        return
      }

      alert('Logged in!')
    }

    setLoading(false)

    router.push('/stores')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">

      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-6 border border-gray-800">

        <h1 className="text-3xl font-bold mb-2">
          {isSignup ? 'Create Account' : 'Login'}
        </h1>

        <p className="text-gray-400 mb-6">
          {isSignup
            ? 'Create your AisleWatcher account'
            : 'Login to your account'}
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-3 rounded-lg bg-black border border-gray-700"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 p-3 rounded-lg bg-black border border-gray-700"
        />

        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 transition text-white font-semibold py-3 rounded-lg"
        >
          {loading
            ? 'Loading...'
            : isSignup
              ? 'Create Account'
              : 'Login'}
        </button>

        <button
          onClick={() => setIsSignup(!isSignup)}
          className="mt-4 text-sm text-gray-400 hover:text-white w-full"
        >
          {isSignup
            ? 'Already have an account? Login'
            : 'Need an account? Sign up'}
        </button>

      </div>

    </main>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SaveStoreButton({
  storeId,
}: {
  storeId: string
}) {

  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const checkSaved = async () => {

      // FIX:
      // use getSession instead of getUser
      // avoids Supabase auth lock conflicts

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user

      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('saved_stores')
        .select('*')
        .eq('user_id', user.id)
        .eq('store_id', Number(storeId))
        .limit(1)

      if (data && data.length > 0) {
        setSaved(true)
      }

      setLoading(false)
    }

    checkSaved()

  }, [storeId])

  const toggleSave = async () => {

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user

    if (!user) {
      alert('You must be logged in.')
      return
    }

    if (saved) {

      const { error } = await supabase
        .from('saved_stores')
        .delete()
        .eq('user_id', user.id)
        .eq('store_id', Number(storeId))

      if (error) {
        console.error(error)
        return
      }

      setSaved(false)

    } else {

      const { error } = await supabase
        .from('saved_stores')
        .insert({
          user_id: user.id,
          store_id: Number(storeId),
        })

      if (error) {
        console.error(error)
        alert(error.message)
        return
      }

      setSaved(true)
    }
  }

  if (loading) {
    return (
      <button className="bg-gray-700 px-4 py-2 rounded-lg opacity-50">
        Loading...
      </button>
    )
  }

  return (
    <button
      onClick={toggleSave}
      className={`px-4 py-2 rounded-lg font-medium transition ${
        saved
          ? 'bg-yellow-400 text-black'
          : 'bg-white text-black'
      }`}
    >
      {saved ? '★ Saved' : '☆ Save Store'}
    </button>
  )
}
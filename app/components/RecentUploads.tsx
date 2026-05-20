'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Upload = {
  id: string
  image_url: string
  created_at: string
  caption: string | null
  stores?: {
    city: string
    st: string
  }
}

export default function RecentUploads() {

  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const loadUploads = async () => {

      const { data, error } = await supabase
        .from('uploads')
        .select(`
          id,
          image_url,
          created_at,
          caption,
          stores (
            city,
            st
          )
        `)
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(8)

      if (error) {
        console.error(error)
      } else {
        setUploads(data || [])
      }

      setLoading(false)
    }

    loadUploads()

  }, [])

  if (loading) {
    return (
      <div className="text-gray-500">
        Loading uploads...
      </div>
    )
  }

  return (

    <>
      <div className="flex items-center justify-between mb-6">

        <div>

          <h2 className="text-2xl font-semibold mb-1">
            Latest Store Activity
          </h2>

          <p className="text-gray-500 text-sm">
            Recent community uploads and shelf updates
          </p>

        </div>

        <Link
          href="/stores"
          className="text-violet-400 hover:text-violet-300 text-sm"
        >
          Browse all →
        </Link>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {uploads.map((upload) => (

          <div
            key={upload.id}
            className="rounded-2xl overflow-hidden border border-white/10 bg-white/5"
          >

            <div className="aspect-square overflow-hidden">

              <img
                src={upload.image_url}
                alt=""
                className="w-full h-full object-cover"
              />

            </div>

            <div className="p-3">

              <div className="font-medium text-sm mb-1">
                Recent Upload
              </div>

              <div className="text-xs text-gray-500">

                {upload.stores?.city}, {upload.stores?.st}

              </div>

            </div>

          </div>

        ))}

      </div>
    </>
  )
}
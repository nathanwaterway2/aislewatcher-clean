'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/app/components/Navbar'
import { getStoreColor } from '@/app/lib/storeStyles'

export default function MyUploadsPage() {

  const [loading, setLoading] = useState(true)

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const [batches, setBatches] = useState<any[]>([])

  useEffect(() => {

    async function loadData() {

      setLoading(true)

      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setLoading(false)
        return
      }

      const currentUser = session.user

      setUser(currentUser)

      // PROFILE
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      setProfile(profileData)

      // BATCHES
      const { data: batchesData } = await supabase
        .from('upload_batches')
        .select('*')
        .eq('user_id', currentUser.id)

      const batchRows = batchesData || []

      const batchIds = batchRows.map((b) => Number(b.id))

      if (batchIds.length === 0) {
        setBatches([])
        setLoading(false)
        return
      }

      // UPLOADS
      const { data: uploadsData } = await supabase
        .from('uploads')
        .select('*')
        .in('batch_id', batchIds)
        .order('created_at', { ascending: false })

      const uploadsList = uploadsData || []

      // STORES
      const storeIds = [
        ...new Set(
          batchRows
            .map((b) => Number(b.store_id))
            .filter(Boolean)
        ),
      ]

      let stores: any[] = []

      if (storeIds.length > 0) {

        const { data: storeData } = await supabase
          .from('stores')
          .select('*')
          .in('id', storeIds)

        stores = storeData || []
      }

      // MERGED UPLOADS
      const merged = uploadsList.map((upload) => {

        const batch = batchRows.find(
          (b) => Number(b.id) === Number(upload.batch_id)
        )

        const store = stores.find(
          (s) => Number(s.id) === Number(batch?.store_id)
        )

        return {
          ...upload,
          batch,
          store,
        }
      })

      // GROUP INTO BATCHES
      const groupedMap = new Map()

      merged.forEach((upload) => {

        const batchId = Number(upload.batch_id)

        if (!batchId) return

        if (!groupedMap.has(batchId)) {

          groupedMap.set(batchId, {
            id: batchId,
            batch: upload.batch,
            store: upload.store,
            uploads: [],
            created_at: upload.batch?.created_at || upload.created_at,
          })
        }

        groupedMap.get(batchId).uploads.push(upload)

      })

      const groupedBatches = Array.from(groupedMap.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )

      setBatches(groupedBatches)

      setLoading(false)
    }

    loadData()

  }, [])

  function timeAgo(dateString: string) {

    const then = new Date(dateString).getTime()
    const now = Date.now()

    const diff = now - then

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`

    return `${days}d ago`
  }

  function getStatusColor(status: string) {

    if (status === 'approved') {
      return 'bg-green-900/40 text-green-300'
    }

    if (status === 'rejected') {
      return 'bg-red-900/40 text-red-300'
    }

    return 'bg-yellow-900/40 text-yellow-300'
  }

  // COUNTS
  const allUploads = batches.flatMap((b) => b.uploads)

  const approvedCount = allUploads.filter(
    (u) => u.status === 'approved'
  ).length

  const rejectedCount = allUploads.filter(
    (u) => u.status === 'rejected'
  ).length

  const pendingCount = allUploads.filter(
    (u) => u.status === 'pending'
  ).length

  const totalPoints = approvedCount * 10

  const approvalRate =
    allUploads.length > 0
      ? Math.round((approvedCount / allUploads.length) * 100)
      : 0

  return (

    <main className="min-h-screen bg-black text-white">

      <Navbar />

      <div className="p-6">

        <div className="max-w-7xl mx-auto">

          {/* HEADER */}
          <div className="mb-10">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

              <div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-5">

                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />

                  Contributor Dashboard

                </div>

                <h1 className="text-5xl font-bold tracking-tight mb-3">

                  My Uploads

                </h1>

                <p className="text-gray-400 text-lg">

                  Track your uploads, points, approvals,
                  and contribution history.

                </p>

              </div>

              {/* USER CARD */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 min-w-[280px]">

                <div className="text-sm text-gray-500 mb-2">
                  Username
                </div>

                <div className="text-2xl font-semibold mb-5">
                  {profile?.username || 'User'}
                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div>
                    <div className="text-3xl font-bold text-violet-400">
                      {totalPoints}
                    </div>

                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Points
                    </div>
                  </div>

                  <div>
                    <div className="text-3xl font-bold text-green-400">
                      {approvalRate}%
                    </div>

                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Approval Rate
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

              <div className="text-3xl font-bold">
                {batches.length}
              </div>

              <div className="text-gray-500 text-sm mt-1">
                Total Submissions
              </div>

            </div>

            <div className="bg-green-900/20 border border-green-900/40 rounded-2xl p-5">

              <div className="text-3xl font-bold text-green-400">
                {approvedCount}
              </div>

              <div className="text-green-300 text-sm mt-1">
                Approved
              </div>

            </div>

            <div className="bg-yellow-900/20 border border-yellow-900/40 rounded-2xl p-5">

              <div className="text-3xl font-bold text-yellow-400">
                {pendingCount}
              </div>

              <div className="text-yellow-300 text-sm mt-1">
                Pending
              </div>

            </div>

            <div className="bg-red-900/20 border border-red-900/40 rounded-2xl p-5">

              <div className="text-3xl font-bold text-red-400">
                {rejectedCount}
              </div>

              <div className="text-red-300 text-sm mt-1">
                Rejected
              </div>

            </div>

          </div>

          {/* CONTENT */}
          {loading ? (

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-gray-400">
              Loading uploads...
            </div>

          ) : batches.length === 0 ? (

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">

              <div className="text-2xl font-semibold mb-3">
                No uploads yet
              </div>

              <p className="text-gray-500 mb-6">
                Start contributing shelf photos to earn points.
              </p>

              <Link
                href="/stores"
                className="inline-flex px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 transition font-medium"
              >
                Browse Stores
              </Link>

            </div>

          ) : (

            <div className="space-y-6">

              {batches.map((batchGroup) => {

                const firstUpload = batchGroup.uploads[0]

                return (

                  <div
                    key={batchGroup.id}
                    className="bg-[#071225] border border-white/10 rounded-3xl overflow-hidden"
                  >

                    <div className="p-6">

                      {/* TOP */}
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">

                        <div>

                          <div className={`font-semibold text-xl ${getStoreColor(batchGroup.store?.store || '').text}`}>

                            {batchGroup.store?.store || 'Unknown Store'}

                          </div>

                          <div className="text-gray-300 mt-1">

                            {batchGroup.store?.address || 'No address'}

                          </div>

                          <div className="text-sm text-gray-500 mt-1">

                            {batchGroup.store?.city || 'Unknown'}
                            {batchGroup.store?.st ? `, ${batchGroup.store.st}` : ''}

                          </div>

                        </div>

                        <div className="flex flex-wrap gap-3">

                          <div className={`inline-flex px-4 py-2 rounded-full text-sm ${getStoreColor(batchGroup.store?.store || '').badge}`}>

                            {batchGroup.batch?.category || 'Unknown'}

                          </div>

                          <div className={`inline-flex px-4 py-2 rounded-full text-sm ${getStatusColor(firstUpload?.status)}`}>

                            {firstUpload?.status}

                          </div>

                        </div>

                      </div>

                      {/* PHOTOS */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">

                        {batchGroup.uploads.map((upload: any) => (

                          <div
                            key={upload.id}
                            className="relative"
                          >

                            <img
                              src={upload.photo_url}
                              alt="Upload"
                              className="w-full h-52 object-cover rounded-2xl border border-white/10"
                            />

                            <div className="absolute top-3 right-3">

                              <div className={`px-3 py-1 rounded-full text-xs ${getStatusColor(upload.status)}`}>

                                {upload.status}

                              </div>

                            </div>

                          </div>

                        ))}

                      </div>

                      {/* FOOTER */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 border-t border-white/10">

                        <div className="text-sm text-gray-400">

                          Uploaded {timeAgo(batchGroup.created_at)} •
                          {' '}
                          {batchGroup.uploads.length} photo
                          {batchGroup.uploads.length === 1 ? '' : 's'}

                        </div>

                        <div className="text-2xl font-bold text-violet-400">

                          +{batchGroup.uploads.filter((u: any) => u.status === 'approved').length * 10}

                        </div>

                      </div>

                    </div>

                  </div>

                )

              })}

            </div>

          )}

        </div>

      </div>

    </main>

  )
}
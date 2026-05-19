import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UploadForm from '@/app/components/UploadForm'
import { UPLOAD_CATEGORIES } from '@/app/lib/uploadOptions'

export default async function UploadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('id', Number(id))
    .single()

  if (!store) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-red-400">
            Store not found.
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/stores/${store.id}`}
          className="text-blue-400 hover:underline"
        >
          Back to Store
        </Link>

        <div className="mt-6 bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="text-sm uppercase tracking-wide text-gray-400 mb-2">
            {store.store}
          </div>

          <h1 className="text-3xl font-bold mb-2">
            {store.address}
          </h1>

          <div className="text-gray-400 mb-8">
            {store.city}, {store.st} {store.postal}
          </div>

          <UploadForm
            storeId={store.id}
            categories={UPLOAD_CATEGORIES}
          />
        </div>
      </div>
    </main>
  )
}

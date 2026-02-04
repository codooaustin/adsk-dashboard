import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full flex flex-col items-center text-center space-y-6">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-slate-700 shrink-0">
          <Image
            src="/Avatar1.jpeg"
            alt=""
            width={96}
            height={96}
            className="object-cover w-full h-full"
            priority
          />
        </div>
        <h1 className="text-3xl font-bold text-white">Data-driven decision making</h1>
        <p className="text-slate-400 text-base leading-relaxed">
          Analyze and present technology adoption data across multiple customer accounts.
          View dashboards, upload datasets, and create presentation-ready charts.
        </p>
        {user ? (
          <Link
            href="/accounts"
            className="inline-flex items-center justify-center py-2.5 px-6 rounded-lg bg-hello-yellow text-black font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Accounts
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center py-2.5 px-6 rounded-lg bg-hello-yellow text-black font-semibold hover:opacity-90 transition-opacity"
          >
            Log in
          </Link>
        )}
      </div>
    </div>
  )
}

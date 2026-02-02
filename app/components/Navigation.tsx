import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/"
              className="flex items-center px-2 py-2 text-white hover:text-hello-yellow transition-colors"
            >
              Account Management
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/accounts"
              className="px-3 py-2 text-white hover:text-hello-yellow transition-colors"
            >
              Accounts
            </Link>
            <Link
              href="/quota-attainment/upload"
              className="px-3 py-2 text-white hover:text-hello-yellow transition-colors"
            >
              Quota Attainment
            </Link>
            <Link
              href="/admin/products"
              className="px-3 py-2 text-white hover:text-hello-yellow transition-colors"
            >
              Products
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AisleWatcher',
  description:
    'Browse real store activity, shelf photos, and community uploads from nearby stores.',
  keywords: [
    'Hot Wheels',
    'store tracker',
    'inventory tracker',
    'store activity',
    'community uploads',
    'AisleWatcher',
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {

  return (

    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >

      <body className="min-h-full bg-black text-white flex flex-col">

        {children}
		<Analytics />

      </body>

    </html>

  )
}


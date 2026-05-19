'use client'

import { useCallback, useEffect, useState } from 'react'

export type BrowserLocationStatus =
  | 'checking'
  | 'requesting'
  | 'ready'
  | 'denied'
  | 'unavailable'

export type BrowserCoords = {
  lat: number
  long: number
  accuracyM?: number | null
  capturedAt?: string | null
}

const STORAGE_KEY = 'aislewatcher.browserLocation'

function readStoredLocation() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const lat = Number(parsed.lat)
    const long = Number(parsed.long)
    const accuracyM =
      parsed.accuracyM === null || parsed.accuracyM === undefined
        ? null
        : Number(parsed.accuracyM)

    if (!Number.isFinite(lat) || !Number.isFinite(long)) {
      return null
    }

    return {
      accuracyM: Number.isFinite(accuracyM) ? accuracyM : null,
      capturedAt: parsed.capturedAt || parsed.savedAt || null,
      lat,
      long,
    }
  } catch {
    return null
  }
}

function saveStoredLocation(coords: BrowserCoords) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...coords,
      savedAt: new Date().toISOString(),
    })
  )
}

export function getCurrentBrowserLocation() {
  return new Promise<BrowserCoords | null>((resolve) => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation
    ) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          accuracyM: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
          lat: position.coords.latitude,
          long: position.coords.longitude,
        }

        saveStoredLocation(nextCoords)
        resolve(nextCoords)
      },
      () => {
        resolve(readStoredLocation())
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5 * 60 * 1000,
        timeout: 10 * 1000,
      }
    )
  })
}

export function getDistanceMiles(
  userCoords: BrowserCoords | null,
  store: { lat?: number | string | null; long?: number | string | null }
) {
  if (!userCoords || !store.lat || !store.long) return null

  const storeLat = Number(store.lat)
  const storeLong = Number(store.long)

  if (!Number.isFinite(storeLat) || !Number.isFinite(storeLong)) {
    return null
  }

  const radiusMiles = 3958.8
  const lat1 = userCoords.lat * Math.PI / 180
  const lat2 = storeLat * Math.PI / 180
  const dLat = (storeLat - userCoords.lat) * Math.PI / 180
  const dLon = (storeLong - userCoords.long) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return radiusMiles * c
}

export function getLocationBounds(coords: BrowserCoords, radiusMiles: number) {
  const latDelta = radiusMiles / 69
  const lonDelta =
    radiusMiles / (Math.cos(coords.lat * Math.PI / 180) * 69 || 69)

  return {
    minLat: coords.lat - latDelta,
    maxLat: coords.lat + latDelta,
    minLong: coords.long - lonDelta,
    maxLong: coords.long + lonDelta,
  }
}

export function useBrowserLocation() {
  const [initialLocation] = useState(() => {
    const stored = readStoredLocation()

    return {
      coords: stored,
      status: stored ? 'ready' : 'checking',
    } as {
      coords: BrowserCoords | null
      status: BrowserLocationStatus
    }
  })

  const [coords, setCoords] = useState<BrowserCoords | null>(
    initialLocation.coords
  )
  const [status, setStatus] =
    useState<BrowserLocationStatus>(initialLocation.status)

  const requestLocation = useCallback(() => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation
    ) {
      setStatus('unavailable')
      return
    }

    setStatus('requesting')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          accuracyM: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
          lat: position.coords.latitude,
          long: position.coords.longitude,
        }

        setCoords(nextCoords)
        setStatus('ready')
        saveStoredLocation(nextCoords)
      },
      () => {
        setStatus('denied')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5 * 60 * 1000,
        timeout: 10 * 1000,
      }
    )
  }, [])

  useEffect(() => {
    if (coords) {
      return
    }

    const timeoutId = window.setTimeout(requestLocation, 0)

    return () => window.clearTimeout(timeoutId)
  }, [coords, requestLocation])

  return {
    coords,
    requestLocation,
    status,
  }
}

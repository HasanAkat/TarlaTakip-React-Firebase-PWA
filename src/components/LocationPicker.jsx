import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png"
import iconUrl from "leaflet/dist/images/marker-icon.png"
import shadowUrl from "leaflet/dist/images/marker-shadow.png"

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

function parseCoordinates(latitude, longitude) {
  if (
    latitude === null ||
    latitude === undefined ||
    latitude === "" ||
    longitude === null ||
    longitude === undefined ||
    longitude === ""
  ) {
    return null
  }
  const lat = typeof latitude === "number" ? latitude : Number(latitude)
  const lng = typeof longitude === "number" ? longitude : Number(longitude)
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null
  }
  return { lat, lng }
}

const DEFAULT_CENTER = { lat: 39.0, lng: 35.0 }

const MARKER_ICON = L.divIcon({
  className: "location-picker-marker",
  html: '<span class="location-picker__marker"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

export default function LocationPicker({ latitude, longitude, onChange, className = "" }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const changeRef = useRef(onChange)

  useEffect(() => {
    changeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initialCoords = parseCoordinates(latitude, longitude)
    const initial = initialCoords || DEFAULT_CENTER
    const zoom = initialCoords ? 13 : 5

    const map = L.map(containerRef.current).setView(initial, zoom)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map)

    const marker = L.marker(initial, {
      draggable: true,
      icon: MARKER_ICON,
    }).addTo(map)

    const notifyChange = (lat, lng) => {
      changeRef.current?.(Number(lat.toFixed(6)), Number(lng.toFixed(6)))
    }

    const handleMapClick = (event) => {
      const { lat, lng } = event.latlng
      marker.setLatLng(event.latlng)
      notifyChange(lat, lng)
    }

    const handleMarkerDragEnd = (event) => {
      const { lat, lng } = event.target.getLatLng()
      marker.setLatLng(event.target.getLatLng())
      notifyChange(lat, lng)
    }

    map.on("click", handleMapClick)
    marker.on("dragend", handleMarkerDragEnd)

    mapRef.current = map
    markerRef.current = marker

    setTimeout(() => {
      map.invalidateSize()
    }, 0)

    return () => {
      map.off("click", handleMapClick)
      marker.off("dragend", handleMarkerDragEnd)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [latitude, longitude])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    const coords = parseCoordinates(latitude, longitude)
    if (!coords) return

    const current = markerRef.current.getLatLng()
    if (Math.abs(current.lat - coords.lat) < 1e-6 && Math.abs(current.lng - coords.lng) < 1e-6) {
      return
    }

    markerRef.current.setLatLng(coords)
    mapRef.current.setView(coords, Math.max(mapRef.current.getZoom(), 13))
  }, [latitude, longitude])

  const classes = ['location-picker']
  if (className) classes.push(className)
  return <div ref={containerRef} className={classes.join(' ')} />
}

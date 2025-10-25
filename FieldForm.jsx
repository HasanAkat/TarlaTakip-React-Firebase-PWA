import { Suspense, lazy, useRef, useState } from "react"
import { addField } from "../services/fieldService"
import "../styles/fields.css"
const LocationPicker = lazy(() => import("./LocationPicker"))

async function geocodeAddress(address) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
  )
  if (!response.ok) {
    throw new Error("Konum bulunamadi")
  }
  const data = await response.json()
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Konum bulunamadi")
  }
  const { lat, lon } = data[0]
  return { lat: Number(lat), lng: Number(lon) }
}

async function reverseGeocode(lat, lng) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=0`
  )
  if (!response.ok) {
    throw new Error("Adres bulunamadi")
  }
  const data = await response.json()
  if (!data || !data.display_name) {
    throw new Error("Adres bulunamadi")
  }
  return data.display_name
}

export default function FieldForm({ farmerId, onAdded }) {
  const [type, setType] = useState("")
  const [address, setAddress] = useState("")
  const [location, setLocation] = useState(null)
  const [error, setError] = useState("")
  const [locating, setLocating] = useState(false)
  const reverseLookupIdRef = useRef(0)

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedType = type.trim()
    const trimmedAddress = address.trim()

    if (!trimmedType) {
      setError("Alan turu zorunludur.")
      return
    }

    await addField(farmerId, {
      type: trimmedType,
      address: trimmedAddress,
      location,
    })

    setType("")
    setAddress("")
    setLocation(null)
    setError("")
    setLocating(false)
    onAdded?.()
  }

  async function handleLocateAddress() {
    if (!address.trim()) {
      setError("Adres giriniz.")
      return
    }
    try {
      setLocating(true)
      setError("")
      const coords = await geocodeAddress(address)
      setLocation({
        lat: Number(coords.lat.toFixed(6)),
        lng: Number(coords.lng.toFixed(6)),
      })
    } catch (e) {
      setError(e.message || "Konum bulunamadi")
    } finally {
      setLocating(false)
    }
  }

  async function handleMapLocationChange(lat, lng) {
    setLocation({ lat, lng })
    setError("")
    try {
      reverseLookupIdRef.current += 1
      const lookupId = reverseLookupIdRef.current
      const resolvedAddress = await reverseGeocode(lat, lng)
      if (reverseLookupIdRef.current === lookupId) {
        setAddress(resolvedAddress)
      }
    } catch (e) {
      console.error("reverseGeocode error:", e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="field-form">
      <div className="field-form__row">
        <input
          placeholder="Tur (orn. uzum, zeytin)"
          value={type}
          onChange={(event) => {
            setType(event.target.value)
            setError("")
          }}
        />
        <input
          placeholder="Adres"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
        <button type="button" onClick={handleLocateAddress} disabled={locating} className="btn btn--secondary">
          {locating ? "Konum araniyor..." : "Adrese git"}
        </button>
      </div>
      <Suspense fallback={<div className="field-form__map field-form__map-loading">Harita yukleniyor...</div>}>
        <LocationPicker
          latitude={location?.lat}
          longitude={location?.lng}
          onChange={handleMapLocationChange}
          className="location-picker--compact field-form__map"
        />
      </Suspense>
      {error && <div className="field-form__error">{error}</div>}
      <button type="submit" className="btn btn--primary">
        Ekle
      </button>
    </form>
  )
}

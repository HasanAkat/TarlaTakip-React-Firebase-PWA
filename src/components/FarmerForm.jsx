import { useState } from "react"
import { addFarmer } from "../services/farmerService"
import { isNameValid, isPhoneValid, PHONE_INPUT_PATTERN } from "../utils/validation"
import "../styles/farmers.css"

export default function FarmerForm({ onAdded }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()

    if (!isNameValid(trimmedName)) {
      setError("Lütfen geçerli bir ad soyad girin.")
      return
    }

    if (!trimmedPhone) {
      setError("Telefon numarası zorunludur.")
      return
    }

    if (!isPhoneValid(trimmedPhone)) {
      setError("Telefon numarası geçersiz. Sadece rakam, boşluk, +, () ve - kullanabilirsiniz.")
      return
    }

    await addFarmer(trimmedName, trimmedPhone)
    setName("")
    setPhone("")
    setError("")
    onAdded?.()
  }

  return (
    <form onSubmit={handleSubmit} className="farmer-form">
      <input
        placeholder="Ad Soyad"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          if (error) setError("")
        }}
        autoComplete="name"
        required
      />
      <input
        placeholder="Telefon"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value)
          if (error) setError("")
        }}
        pattern={PHONE_INPUT_PATTERN}
        inputMode="tel"
        autoComplete="tel"
        required
      />
      {error && <div className="farmers__error text-small">{error}</div>}
      <button className="btn btn--primary" type="submit">
        Ekle
      </button>
    </form>
  )
}

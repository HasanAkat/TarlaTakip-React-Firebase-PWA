import { useState } from "react"
import { addRecommendation } from "../services/recommendationService"
import {
  DEFAULT_RECOMMENDATION_KIND,
  DEFAULT_RECOMMENDATION_SUBTYPE,
  RECOMMENDATION_KIND_OPTIONS,
  getSubtypeOptions,
} from "../constants/recommendations"
import "../styles/recommendations.css"

export default function RecommendationForm({ onAdded }) {
  const [name, setName] = useState("")
  const [kind, setKind] = useState(DEFAULT_RECOMMENDATION_KIND)
  const [subKind, setSubKind] = useState(DEFAULT_RECOMMENDATION_SUBTYPE)

  const subtypeOptions = getSubtypeOptions(kind)
  const hasSubtypes = subtypeOptions.length > 0

  function handleKindChange(event) {
    const nextKind = event.target.value
    setKind(nextKind)
    const nextOptions = getSubtypeOptions(nextKind)
    setSubKind(nextOptions[0] ?? "")
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    const options = getSubtypeOptions(kind)
    const normalizedSubKind = options.length > 0 ? subKind || options[0] : null

    await addRecommendation(trimmedName, kind, normalizedSubKind ?? null)

    setName("")
    setKind(DEFAULT_RECOMMENDATION_KIND)
    setSubKind(DEFAULT_RECOMMENDATION_SUBTYPE)
    onAdded?.()
  }

  return (
    <form onSubmit={handleSubmit} className="recommendation-form">
      <input
        placeholder="Öneri adı (örn. NPK 20-20-20)"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <select value={kind} onChange={handleKindChange}>
        {RECOMMENDATION_KIND_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hasSubtypes && (
        <select value={subKind} onChange={(event) => setSubKind(event.target.value)}>
          {subtypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
      <button type="submit" className="btn btn--primary">
        Ekle
      </button>
    </form>
  )
}

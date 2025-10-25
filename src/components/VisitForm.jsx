import { useEffect, useMemo, useState } from "react"
import { addVisit, updateVisit } from "../services/visitService"
import { listRecommendations } from "../services/recommendationService"
import "../styles/visits.css"

function toDateTimeLocalInput(value) {
  if (!value) return ""

  let dateValue = null
  if (value instanceof Date) {
    dateValue = value
  } else if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      dateValue = parsed
    }
  } else if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      dateValue = value.toDate()
    } else if ("seconds" in value) {
      dateValue = new Date(value.seconds * 1000)
    }
  }

  if (!dateValue || Number.isNaN(dateValue.getTime())) {
    return ""
  }

  const offset = dateValue.getTimezoneOffset()
  const local = new Date(dateValue.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export default function VisitForm({
  farmerId,
  fieldId,
  onAdded,
  mode = "create",
  initialVisit = null,
  onSaved,
  onCancel,
}) {
  const [dateISO, setDateISO] = useState(() =>
    mode === "edit" && initialVisit ? toDateTimeLocalInput(initialVisit.date) : ""
  )
  const [note, setNote] = useState(() => (mode === "edit" && initialVisit ? initialVisit.note || "" : ""))
  const [allRecs, setAllRecs] = useState([])
  const [selected, setSelected] = useState(() => {
    if (mode === "edit" && initialVisit?.recommendationIds) {
      return initialVisit.recommendationIds.reduce((acc, id) => {
        acc[id] = true
        return acc
      }, {})
    }
    return {}
  })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    ;(async () => {
      const list = await listRecommendations()
      setAllRecs(list)
    })()
  }, [])

  useEffect(() => {
    if (!pickerOpen) {
      setSearchTerm("")
    }
  }, [pickerOpen])

  useEffect(() => {
    if (mode !== "edit" || !initialVisit) return
    setDateISO(toDateTimeLocalInput(initialVisit.date))
    setNote(initialVisit.note || "")
    setSelected(
      (initialVisit.recommendationIds || []).reduce((acc, id) => {
        acc[id] = true
        return acc
      }, {})
    )
    setPickerOpen(false)
    setFormError("")
  }, [mode, initialVisit])

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([key]) => key),
    [selected]
  )

  const selectedRecommendations = useMemo(
    () => allRecs.filter((rec) => selectedIds.includes(rec.id)),
    [allRecs, selectedIds]
  )

  const filteredRecs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return allRecs
    return allRecs.filter((rec) => {
      const haystack = [rec.name, rec.kind, rec.subKind].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(query)
    })
  }, [allRecs, searchTerm])

  function toggle(id) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function handleOptionKeyDown(event, id) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      toggle(id)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const ids = selectedIds
    const targetFarmerId = initialVisit?.farmerId || farmerId
    const targetFieldId = initialVisit?.fieldId || fieldId

    if (!targetFarmerId || !targetFieldId) {
      setFormError("Lütfen önce çiftçi ve alan seçin.")
      return
    }

    setFormError("")
    setSubmitting(true)
    try {
      if (mode === "edit") {
        if (!initialVisit?.id) {
          throw new Error("Düzenlenecek ziyaret bulunamadı.")
        }
        await updateVisit(targetFarmerId, targetFieldId, initialVisit.id, {
          dateISO,
          note,
          recommendationIds: ids,
        })
        setPickerOpen(false)
        onSaved?.()
      } else {
        await addVisit(targetFarmerId, targetFieldId, { dateISO, note, recommendationIds: ids })
        setDateISO("")
        setNote("")
        setSelected({})
        setPickerOpen(false)
        onAdded?.()
        onSaved?.()
      }
    } catch (error) {
      console.error("Visit form submit failed", error)
      setFormError(error?.message || (mode === "edit" ? "Ziyaret güncellenemedi." : "Ziyaret eklenemedi."))
    } finally {
      setSubmitting(false)
    }
  }

  const selectedSummaryText = selectedRecommendations.map((rec) => rec.name).join(", ")
  const summaryFallback = selectedIds.length > 0 ? `${selectedIds.length} seçili` : "Seçilmedi"
  const selectedSummary = selectedSummaryText || summaryFallback

  return (
    <form onSubmit={handleSubmit} className="visit-form">
      <input
        type="datetime-local"
        value={dateISO}
        onChange={(event) => setDateISO(event.target.value)}
        required
      />
      <textarea placeholder="Not" value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
      <div className="visit-form__picker">
        <div className="visit-form__picker-label">Öneriler</div>
        <button
          type="button"
          onClick={() => setPickerOpen((prev) => !prev)}
          className="visit-form__picker-toggle"
        >
          <span className="visit-form__picker-summary">{selectedSummary}</span>
          <span className="visit-form__picker-count">
            {selectedIds.length > 0 ? `${selectedIds.length} seçili` : "Seç"}
          </span>
        </button>

        {pickerOpen && (
          <div className="visit-form__panel">
            <div className="visit-form__panel-search">
              <input
                autoFocus
                type="search"
                placeholder="Öneri ara..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="visit-form__search-input"
              />
            </div>
            <div className="visit-form__panel-list">
              {allRecs.length === 0 ? (
                <div className="visit-form__option-empty">Öneri yok. Önce Öneri Kataloğu'ndan ekleyin.</div>
              ) : filteredRecs.length === 0 ? (
                <div className="visit-form__option-empty">Eşleşen öneri yok.</div>
              ) : (
                filteredRecs.map((rec) => {
                  const active = !!selected[rec.id]
                  const displayKind = [rec.kind, rec.subKind].filter(Boolean).join(" / ") || "other"
                  return (
                    <div
                      key={rec.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggle(rec.id)}
                      onKeyDown={(event) => handleOptionKeyDown(event, rec.id)}
                      className={`visit-form__option${active ? " visit-form__option--active" : ""}`}
                    >
                      <div>
                        <div className="visit-form__option-title">{rec.name}</div>
                        <div className="visit-form__option-kind">{displayKind}</div>
                      </div>
                      {active && <span className="visit-form__picker-count">Seçili</span>}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
      {formError && <div className="visit-form__error">{formError}</div>}
      <div className="visit-form__actions">
        {mode === "edit" && onCancel && (
          <button type="button" onClick={onCancel} className="btn btn--secondary" disabled={submitting}>
            İptal
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? (mode === "edit" ? "Kaydediliyor..." : "Ekleniyor...") : mode === "edit" ? "Kaydet" : "Ekle"}
        </button>
      </div>
    </form>
  )
}

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  listRecommendations,
  removeRecommendation,
  updateRecommendation,
} from "../services/recommendationService"
import RecommendationForm from "../components/RecommendationForm"
import {
  DEFAULT_RECOMMENDATION_KIND,
  DEFAULT_RECOMMENDATION_SUBTYPE,
  RECOMMENDATION_KIND_OPTIONS,
  getSubtypeOptions,
} from "../constants/recommendations"
import "../styles/recommendations.css"

function getSubtypeOptionsIncludingCurrent(kind, currentValue) {
  const options = getSubtypeOptions(kind)
  if (currentValue && !options.includes(currentValue)) {
    return [...options, currentValue]
  }
  return options
}

export default function RecommendationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({
    name: "",
    kind: DEFAULT_RECOMMENDATION_KIND,
    subKind: DEFAULT_RECOMMENDATION_SUBTYPE,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [kindFilter, setKindFilter] = useState("all")
  const [subKindFilter, setSubKindFilter] = useState("all")

  async function load() {
    setLoading(true)
    const list = await listRecommendations()
    setItems(list)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  const toggleExpand = (id) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id
      if (prev === id && editingId === id) {
        setEditingId(null)
      }
      return next
    })
  }

  const kindOptions = useMemo(() => {
    const uniqueKinds = Array.from(new Set(items.map((it) => it.kind).filter(Boolean)))
    uniqueKinds.sort((a, b) => a.localeCompare(b))
    return uniqueKinds
  }, [items])

  const subKindOptions = useMemo(() => {
    if (kindFilter === "all") return []
    const uniqueSubKinds = Array.from(
      new Set(items.filter((it) => it.kind === kindFilter && it.subKind).map((it) => it.subKind))
    )
    uniqueSubKinds.sort((a, b) => a.localeCompare(b))
    return uniqueSubKinds
  }, [items, kindFilter])

  const filteredItems = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase()
    return items.filter((it) => {
      const matchesKind = kindFilter === "all" || it.kind === kindFilter
      if (!matchesKind) return false
      const matchesSubKind = subKindFilter === "all" || it.subKind === subKindFilter
      if (!matchesSubKind) return false
      if (!normalizedTerm) return true
      const haystack = [it.name, it.subKind, it.kind].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(normalizedTerm)
    })
  }, [items, searchTerm, kindFilter, subKindFilter])

  const handleKindChange = (event) => {
    const nextKind = event.target.value
    setKindFilter(nextKind)
    setSubKindFilter("all")
  }

  const editSubtypeOptions = getSubtypeOptionsIncludingCurrent(editValues.kind, editValues.subKind)
  const editHasSubtypes = editSubtypeOptions.length > 0

  const handleEditStart = (event, item) => {
    event.stopPropagation()
    const baseKind = item.kind || DEFAULT_RECOMMENDATION_KIND
    const options = getSubtypeOptions(baseKind)
    const fallbackSubKind = options.length > 0 ? item.subKind ?? options[0] : item.subKind ?? ""
    setExpandedId(item.id)
    setEditingId(item.id)
    setEditValues({
      name: item.name || "",
      kind: baseKind,
      subKind: fallbackSubKind,
    })
  }

  const handleEditCancel = (event) => {
    if (event) event.stopPropagation()
    setEditingId(null)
    setEditValues({
      name: "",
      kind: DEFAULT_RECOMMENDATION_KIND,
      subKind: DEFAULT_RECOMMENDATION_SUBTYPE,
    })
  }

  const handleEditKindChange = (event) => {
    const nextKind = event.target.value
    const nextOptions = getSubtypeOptionsIncludingCurrent(nextKind, editValues.subKind)
    setEditValues((prev) => ({
      ...prev,
      kind: nextKind,
      subKind: nextOptions[0] ?? "",
    }))
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!editingId) return
    const trimmed = editValues.name
    if (!trimmed) return

    setUpdatingId(editingId)
    await updateRecommendation(editingId, {
      name: trimmed,
      kind: editValues.kind,
      subKind: editHasSubtypes ? editValues.subKind || null : null,
    })
    setUpdatingId(null)
    setEditingId(null)
    load()
  }

  const handleDelete = async (id) => {
    setBusyId(id)
    await removeRecommendation(id)
    setBusyId(null)
    if (expandedId === id) {
      setExpandedId(null)
      setEditingId(null)
    }
    load()
  }

  if (loading) return <div className="app-loading">Yükleniyor...</div>

  return (
    <div className="recommendations">
      <div className="recommendations__toolbar">
        <button type="button" onClick={handleBack} className="btn recommendations__back">
          &larr; Geri dön
        </button>
      </div>

      <div className="stack-sm">
        <h1>Öneri Kataloğu</h1>
        <p className="recommendations__intro">Ziyaretlerde çoklu seçim yapacağınız liste.</p>
      </div>

      <RecommendationForm onAdded={load} />

      {items.length === 0 ? (
        <div className="recommendations__empty">Henüz öneri yok.</div>
      ) : (
        <>
          <div className="recommendations__filter-bar">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Önerilerde ara..."
              className="recommendations__filter-input"
            />
            <select value={kindFilter} onChange={handleKindChange} className="recommendations__filter-select">
              <option value="all">Tum turler</option>
              {kindOptions.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
            {kindFilter !== "all" && subKindOptions.length > 0 && (
              <select
                value={subKindFilter}
                onChange={(event) => setSubKindFilter(event.target.value)}
                className="recommendations__filter-select"
              >
                <option value="all">Tum alt turler</option>
                {subKindOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="mt-md">Filtreye uyan öneri bulunamadı.</div>
          ) : (
            <div className="recommendations__list">
              {filteredItems.map((it) => {
                const expanded = expandedId === it.id
                const isBusy = busyId === it.id
                const isUpdating = updatingId === it.id
                const isEditing = editingId === it.id

                return (
                  <div
                    key={it.id}
                    onClick={() => toggleExpand(it.id)}
                    className={`recommendations__item ${expanded ? "recommendations__item--expanded" : ""}`}
                  >
                    <div className="recommendations__item-header">
                      <div className="recommendations__item-title">
                        <span className="recommendations__item-name">{it.name || "İsimsiz öneri"}</span>
                        <div className="recommendations__item-tags">
                          {it.kind && <span className="recommendations__chip">{it.kind}</span>}
                          {it.subKind && <span className="recommendations__chip">{it.subKind}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`recommendations__toggle ${expanded ? "recommendations__toggle--expanded" : ""}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleExpand(it.id)
                        }}
                      >
                        &gt;
                      </button>
                    </div>

                    {expanded && (
                      <div className="stack-md">
                        <div className="recommendations__actions">
                          <button
                            type="button"
                            onClick={(event) => handleEditStart(event, it)}
                            disabled={isBusy || isUpdating || isEditing}
                            className={`btn ${isEditing ? "btn--primary" : "btn--outline"}`}
                          >
                            {isEditing ? "Düzenleniyor" : "Düzenle"}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleDelete(it.id)
                            }}
                            disabled={isBusy || isUpdating}
                            className="btn btn--danger"
                          >
                            {isBusy ? "Siliniyor..." : "Sil"}
                          </button>
                        </div>

                        {isEditing && (
                          <form
                            onSubmit={handleEditSubmit}
                            onClick={(event) => event.stopPropagation()}
                            className="recommendations__edit"
                          >
                            <div className="recommendations__edit-row">
                              <input
                                value={editValues.name}
                                onChange={(event) =>
                                  setEditValues((prev) => ({ ...prev, name: event.target.value }))
                                }
                                placeholder="Öneri adı"
                              />
                              <select value={editValues.kind} onChange={handleEditKindChange}>
                                {RECOMMENDATION_KIND_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              {editHasSubtypes && (
                                <select
                                  value={editValues.subKind}
                                  onChange={(event) =>
                                    setEditValues((prev) => ({
                                      ...prev,
                                      subKind: event.target.value,
                                    }))
                                  }
                                >
                                  {editSubtypeOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <div className="recommendations__actions">
                              <button type="submit" disabled={isUpdating} className="btn btn--primary">
                                {isUpdating ? "Kaydediliyor..." : "Kaydet"}
                              </button>
                              <button
                                type="button"
                                onClick={handleEditCancel}
                                disabled={isUpdating}
                                className="btn btn--secondary"
                              >
                                İptal
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

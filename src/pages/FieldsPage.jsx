import { Suspense, lazy, useCallback, useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { listFieldsByFarmer, removeField, updateField } from "../services/fieldService"
import { getFarmerById } from "../services/farmerService"
import FieldForm from "../components/FieldForm"
import "../styles/fields.css"
const LocationPicker = lazy(() => import("../components/LocationPicker"))

export default function FieldsPage() {
  const { farmerId } = useParams()
  const navigate = useNavigate()
  const [farmer, setFarmer] = useState(null)
  const [fields, setFields] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editType, setEditType] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [editLocation, setEditLocation] = useState(null)
  const [editBusy, setEditBusy] = useState(false)
  const [editErr, setEditErr] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)

  const resetEditState = () => {
    setEditingId(null)
    setEditType("")
    setEditAddress("")
    setEditLocation(null)
    setEditBusy(false)
    setEditErr("")
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setErr("")
    try {
      const farmerDoc = await getFarmerById(farmerId)
      if (!farmerDoc) {
        navigate("/farmers", { replace: true })
        return
      }
      setFarmer(farmerDoc)
      const list = await listFieldsByFarmer(farmerId)
      setFields(list)
    } catch (e) {
      setErr(e.code === "permission-denied" ? "Yetkiniz yok (allowlist / rules)." : e.message || "Yükleme hatası")
    } finally {
      setLoading(false)
    }
  }, [farmerId, navigate])

  const handleFieldAdded = useCallback(() => {
    setShowAddForm(false)
    load()
  }, [load])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (expandedId && !fields.some((field) => field.id === expandedId)) {
      setExpandedId(null)
    }
  }, [expandedId, fields])

  useEffect(() => {
    if (editingId && !fields.some((field) => field.id === editingId)) {
      resetEditState()
    }
  }, [editingId, fields])

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleStartEdit = (event, field) => {
    event.stopPropagation()
    setEditingId(field.id)
    setEditType(field.type || "")
    setEditAddress(field.address || "")
    setEditLocation(field.location ? { ...field.location } : null)
    setEditErr("")
  }

  const handleCancelEdit = (event) => {
    if (event) {
      event.stopPropagation()
    }
    resetEditState()
  }

  const handleDelete = async (event, field) => {
    event.stopPropagation()
    setBusyId(field.id)
    try {
      if (!confirm(`"${field.type}" alani silinsin mi?`)) return
      await removeField(farmerId, field.id)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const handleSaveEdit = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!editingId) return
    const trimmedType = editType.trim()
    const trimmedAddress = editAddress.trim()
    if (!trimmedType) {
      setEditErr("Alan türü zorunludur.")
      return
    }
    setEditBusy(true)
    setEditErr("")
    try {
      await updateField(farmerId, editingId, {
        type: trimmedType,
        address: trimmedAddress,
        location: editLocation,
      })
      resetEditState()
      load()
    } catch (e) {
      setEditErr(e?.message || "Güncelleme başarısız.")
    } finally {
      setEditBusy(false)
    }
  }

  if (loading) return <div className="app-loading">Alanlar yükleniyor...</div>

  if (err) {
    return (
      <div className="card fields__error">
        <div>{err}</div>
        <div className="text-small muted fields__error-hint">
          Kontrol: allowlist icinde UID var mi? Kurallar yayinda mi? addField ownerUid gonderiyor mu?
        </div>
      </div>
    )
  }

  return (
    <div className="fields">
      <div className="fields__toolbar">
        <button type="button" onClick={handleBack} className="btn fields__back">
          &larr; Geri dön
        </button>
      </div>

      <div className="fields__header">
        <h1>Alanlar - {farmer?.name || "Bilinmeyen çiftçi"}</h1>
        {farmer?.phone && <span className="muted text-small">Telefon: {farmer.phone}</span>}
      </div>

      <div className="fields__actions">
        <span className="muted text-small">Toplam {fields.length} alan</span>
        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className={`btn fields__toggle-add ${showAddForm ? "fields__toggle-add--active" : ""}`}
        >
          {showAddForm ? "Formu kapat" : "Yeni alan ekle"}
        </button>
      </div>

      {showAddForm && (
        <div className="fields__form-wrapper">
          <FieldForm farmerId={farmerId} onAdded={handleFieldAdded} />
        </div>
      )}

      {fields.length === 0 ? (
        <div className="fields__empty">Henüz alan yok.</div>
      ) : (
        <div className="fields__list">
          {fields.map((field) => {
            const expanded = expandedId === field.id
            const isEditing = editingId === field.id
            return (
              <div
                key={field.id}
                onClick={() => toggleExpand(field.id)}
                className={`fields__card ${expanded ? "fields__card--expanded" : ""}`}
              >
                <div className="fields__card-header">
                  <div className="fields__card-info">
                    <span className="fields__card-type">{field.type || "Isimsiz alan"}</span>
                    <span className="fields__card-meta">{field.address || "Adres belirtilmemis"}</span>
                  </div>
                  <button
                    type="button"
                    className={`fields__toggle ${expanded ? "fields__toggle--expanded" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleExpand(field.id)
                    }}
                  >
                    &gt;
                  </button>
                </div>

                {expanded && (
                  <div className="fields__details">
                    <div className="fields__details-grid">
                      <div>
                        <strong>Alan türü:</strong> {field.type || "-"}
                      </div>
                      <div>
                        <strong>Adres:</strong> {field.address || "-"}
                      </div>
                      {field.location?.lat != null && field.location?.lng != null ? (
                        <div>
                          <strong>Konum:</strong>{" "}
                          <button
                            type="button"
                            className="btn btn--outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              const url =
                                "https://www.google.com/maps?q=" + field.location.lat + "," + field.location.lng
                              window.open(url, "_blank", "noopener,noreferrer")
                            }}
                          >
                            Haritada göster
                          </button>
                        </div>
                      ) : (
                        <div>
                          <strong>Konum:</strong> belirlenmemiş
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <form
                        onSubmit={handleSaveEdit}
                        className="fields__editor"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="fields__editor-title">Alanı düzenle</div>
                        <input
                          value={editType}
                          onChange={(event) => setEditType(event.target.value)}
                          placeholder="Alan türü"
                          required
                        />
                        <input
                          value={editAddress}
                          onChange={(event) => setEditAddress(event.target.value)}
                          placeholder="Adres"
                        />
                        <Suspense
                          fallback={<div className="field-form__map field-form__map-loading">Konum yükleniyor...</div>}
                        >
                          <LocationPicker
                            latitude={editLocation?.lat}
                            longitude={editLocation?.lng}
                            onChange={(lat, lng) => {
                              setEditLocation({ lat, lng })
                              setEditErr("")
                            }}
                            className="location-picker--compact"
                          />
                        </Suspense>
                        {editErr && <div className="fields__editor-error">{editErr}</div>}
                        <div className="fields__details-actions">
                          <button type="submit" disabled={editBusy} className="btn btn--primary">
                            {editBusy ? "Kaydediliyor..." : "Kaydet"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={editBusy}
                            className="btn btn--secondary"
                          >
                            Vazgeç
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="fields__details-actions">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            navigate(`/farmers/${farmerId}/fields/${field.id}/visits?farmerId=${farmerId}&fieldId=${field.id}`)
                          }}
                          className="btn btn--primary"
                        >
                          Ziyaretlere git
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleStartEdit(event, field)}
                          className="btn btn--outline"
                        >
                          Alanı düzenle
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleDelete(event, field)}
                          disabled={busyId === field.id}
                          className="btn btn--danger"
                        >
                          {busyId === field.id ? "Siliniyor..." : "Sil"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

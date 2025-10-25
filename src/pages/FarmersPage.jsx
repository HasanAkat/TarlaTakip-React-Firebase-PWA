import { useCallback, useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { useNavigate } from "react-router-dom"
import { auth } from "../firebase"

import FarmerForm from "../components/FarmerForm"
import { listFarmersOnce, removeFarmer, updateFarmer } from "../services/farmerService"
import { hasAnyField } from "../services/fieldService"
import { isNameValid, isPhoneValid, PHONE_INPUT_PATTERN } from "../utils/validation"
import "../styles/farmers.css"

const LABEL_MAP = {
  id: "Kimlik",
  name: "İsim Soyisim",
  phone: "Telefon",
  ownerUid: "Sahip UID",
  createdAt: "Oluşturma Tarihi",
}

const HIDDEN_KEYS = ["id", "ownerUid"]

function formatKey(key) {
  if (LABEL_MAP[key]) return LABEL_MAP[key]
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase())
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") {
    return { text: "-", multiline: false }
  }
  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      return { text: value.toDate().toLocaleString(), multiline: false }
    }
    if ("seconds" in value && typeof value.seconds === "number") {
      return { text: new Date(value.seconds * 1000).toLocaleString(), multiline: false }
    }
    try {
      const json = JSON.stringify(value, null, 2)
      return { text: json, multiline: true }
    } catch {
      return { text: String(value), multiline: false }
    }
  }
  return { text: String(value), multiline: false }
}

function getDetailEntries(farmer) {
  const priority = ["name", "phone", "createdAt"]
  const keys = Object.keys(farmer || {}).filter((key) => !HIDDEN_KEYS.includes(key))
  const ordered = [
    ...priority.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !priority.includes(key)),
  ]
  return ordered.map((key) => ({ key, label: formatKey(key), value: formatValue(farmer?.[key]) }))
}

export default function FarmersPage() {
  const navigate = useNavigate()
  const [uid, setUid] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [farmers, setFarmers] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editBusy, setEditBusy] = useState(false)
  const [editErr, setEditErr] = useState("")

  useEffect(() => {
    const off = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid || null)
    })
    return () => off()
  }, [])

  const loadFarmers = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    setErr("")
    try {
      const data = await listFarmersOnce()
      setFarmers(data)
    } catch (e) {
      setErr(
        e.code === "permission-denied"
          ? "Hesabınız yetkili değil. Lütfen yöneticinize bildiriniz."
          : e.message || "Beklenmedik bir hata oluştu."
      )
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    if (uid) loadFarmers()
  }, [uid, loadFarmers])

  useEffect(() => {
    if (expandedId && !farmers.some((f) => f.id === expandedId)) {
      setExpandedId(null)
    }
    if (editingId && !farmers.some((f) => f.id === editingId)) {
      setEditingId(null)
      setEditName("")
      setEditPhone("")
      setEditErr("")
    }
  }, [expandedId, editingId, farmers])

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  const handleStartEdit = (farmer) => {
    setEditingId(farmer.id)
    setEditName(farmer.name || "")
    setEditPhone(farmer.phone || "")
    setEditErr("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditPhone("")
    setEditErr("")
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editingId) return
    const trimmedName = editName.trim()
    const trimmedPhone = editPhone.trim()

    if (!isNameValid(trimmedName)) {
      setEditErr("Lütfen geçerli bir ad soyad girin.")
      return
    }

    if (!trimmedPhone) {
      setEditErr("Telefon numarası zorunludur.")
      return
    }

    if (!isPhoneValid(trimmedPhone)) {
      setEditErr("Telefon numarası geçersiz. Sadece rakam, boşluk, +, () ve - kullanabilirsiniz.")
      return
    }

    setEditBusy(true)
    setEditErr("")
    try {
      await updateFarmer(editingId, { name: trimmedName, phone: trimmedPhone })
      await loadFarmers()
      handleCancelEdit()
    } catch (error) {
      setEditErr(error?.message || "Güncelleme başarısız.")
    } finally {
      setEditBusy(false)
    }
  }
  async function handleDelete(farmer) {
    setBusyId(farmer.id)
    try {
      const hasFields = await hasAnyField(farmer.id)
      if (hasFields) {
        alert("Önce bu çiftçiye ait alanları silin. (Alt koleksiyonlar otomatik silinmez.)")
        return
      }
      if (!confirm(`"${farmer.name}" kaydini silmek istiyor musunuz?`)) return
      await removeFarmer(farmer.id)
      await loadFarmers()
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="app-loading">Yükleniyor...</div>
  if (err) return <div className="card farmers__error">{err}</div>

  return (
    <div className="farmers">
      <div className="farmers__toolbar">
        <button type="button" onClick={handleBack} className="btn farmers__back">
          &larr; Geri dön
        </button>
      </div>

      <div className="stack-md">
        <h1>Çiftçiler</h1>
        <FarmerForm onAdded={loadFarmers} />
      </div>

      {farmers.length === 0 ? (
        <div className="farmers__empty">Henüz kayıt yok. Yukarıdan yeni çiftçi ekleyebilirsiniz.</div>
      ) : (
        <div className="farmers__list">
          {farmers.map((farmer) => {
            const expanded = expandedId === farmer.id
            const isEditing = editingId === farmer.id
            const detailEntries = expanded ? getDetailEntries(farmer) : []
            return (
              <div
                key={farmer.id}
                onClick={() => toggleExpand(farmer.id)}
                className={`farmers__card ${expanded ? "farmers__card--expanded" : ""}`}
              >
                <div className="farmers__card-header">
                  <div className="farmers__card-title">
                    <span className="farmers__card-name">{farmer.name || "İsim bilinmiyor"}</span>
                    <span className="farmers__card-phone">{farmer.phone || "Telefon bilgisi yok"}</span>
                  </div>
                  <button
                    type="button"
                    className={`farmers__toggle ${expanded ? "farmers__toggle--expanded" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleExpand(farmer.id)
                    }}
                  >
                    &gt;
                  </button>
                </div>

                {expanded && (
                  <div className="farmers__details">
                    <div className="farmers__detail-grid">
                      {detailEntries.map(({ key, label, value }) => (
                        <div key={key}>
                          <strong>{label}:</strong>{" "}
                          {value.multiline ? (
                            <pre className="farmers__detail-pre">{value.text}</pre>
                          ) : (
                            <span className="farmers__detail-value">{value.text}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {isEditing ? (
                      <form
                        onSubmit={handleSaveEdit}
                        className="farmers__editor"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="farmers__editor-title">Çiftçi bilgilerini düzenle</div>
                        <input
                          value={editName}
                          onChange={(event) => {
                            setEditName(event.target.value)
                            if (editErr) setEditErr("")
                          }}
                          placeholder="İsim Soyisim"
                          autoComplete="name"
                          required
                        />
                        <input
                          value={editPhone}
                          onChange={(event) => {
                            setEditPhone(event.target.value)
                            if (editErr) setEditErr("")
                          }}
                          placeholder="Telefon"
                          autoComplete="tel"
                          pattern={PHONE_INPUT_PATTERN}
                          inputMode="tel"
                          required
                        />
                        <div className="farmers__editor-actions">
                          <button type="submit" disabled={editBusy} className="btn btn--primary">
                            {editBusy ? "Kaydediliyor..." : "Kaydet"}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleCancelEdit()
                            }}
                            disabled={editBusy}
                            className="btn btn--secondary"
                          >
                            Vazgeç
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="farmers__actions">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleStartEdit(farmer)
                          }}
                          className="btn btn--outline"
                        >
                          Çiftçi bilgilerini düzenle
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            navigate(`/farmers/${farmer.id}/fields`)
                          }}
                          className="btn btn--primary"
                        >
                          Alanlara git
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDelete(farmer)
                          }}
                          disabled={busyId === farmer.id}
                          className="btn btn--danger"
                        >
                          {busyId === farmer.id ? "Siliniyor..." : "Sil"}
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


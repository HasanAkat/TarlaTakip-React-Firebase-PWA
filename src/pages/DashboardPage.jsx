import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getFarmerById, listFarmersOnce } from "../services/farmerService"
import { getFieldById, listFieldsByFarmer } from "../services/fieldService"
import { listRecentVisits, listVisitsByField } from "../services/visitService"
import "../styles/dashboard.css"

const sections = [
  {
    title: "Çiftçiler",
    body: "Yeni çiftçi ekleyin, iletişim bilgilerini güncelleyin ve alanlara geçin.",
    to: "/farmers",
    cta: "Çiftçi listesine git",
  },
  {
    title: "Öneri Kataloğu",
    body: "Önerilerde bulunduğunuz zirai ilaç ve gübreleri düzenleyin.",
    to: "/recommendations",
    cta: "Kataloğu düzenle",
  },
  {
    title: "Ziyaretler",
    body: "Yetkili olduğunuz tüm ziyaretleri görüntüleyin.",
    to: "/visits",
    cta: "Ziyaretleri aç",
  },
]

function fmtDate(d) {
  if (!d) return "-"
  if (typeof d === "object") {
    if (typeof d.toDate === "function") return d.toDate().toLocaleString()
    if ("seconds" in d) return new Date(d.seconds * 1000).toLocaleString()
  }
  if (typeof d === "string") {
    const t = new Date(d)
    return Number.isNaN(t.getTime()) ? d : t.toLocaleString()
  }
  return String(d)
}

function toMillis(d) {
  if (!d) return 0
  if (typeof d === "object") {
    if (typeof d.toMillis === "function") return d.toMillis()
    if ("seconds" in d) return d.seconds * 1000
  }
  if (typeof d === "string" || typeof d === "number") {
    const t = new Date(d)
    return Number.isNaN(t.getTime()) ? 0 : t.getTime()
  }
  return 0
}

function fieldKey(farmerId, fieldId) {
  return `${farmerId}::${fieldId}`
}

const RECENT_LIMIT = 10

export default function DashboardPage() {
  const [recentVisits, setRecentVisits] = useState([])
  const [farmerMap, setFarmerMap] = useState({})
  const [fieldMap, setFieldMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadRecent = useCallback(async () => {
    setLoading(true)
    setError("")

    const buildLegacyData = async () => {
      const farmers = await listFarmersOnce()
      const farmerDict = {}
      const fieldDict = {}
      const aggregated = []

      for (const farmer of farmers) {
        farmerDict[farmer.id] = farmer
        const fields = await listFieldsByFarmer(farmer.id)
        fields.forEach((field) => {
          fieldDict[fieldKey(farmer.id, field.id)] = field
        })

        for (const field of fields) {
          if (aggregated.length >= RECENT_LIMIT * 2) break
          const visits = await listVisitsByField(farmer.id, field.id)
          visits.forEach((visit) => {
            aggregated.push({
              ...visit,
              farmerId: farmer.id,
              fieldId: field.id,
            })
          })
          if (aggregated.length >= RECENT_LIMIT * 2) break
        }

        if (aggregated.length >= RECENT_LIMIT * 2) break
      }

      return { visits: aggregated, farmerDict, fieldDict }
    }

    try {
      let visits = []
      let farmerDict = {}
      let fieldDict = {}

      try {
        visits = await listRecentVisits(RECENT_LIMIT * 2)

        const farmerIds = Array.from(new Set(visits.map((visit) => visit.farmerId).filter(Boolean)))
        const farmerEntries = await Promise.all(
          farmerIds.map(async (farmerId) => {
            try {
              const farmer = await getFarmerById(farmerId)
              return farmer ? [farmerId, farmer] : null
            } catch (err) {
              console.error('getFarmerById failed', farmerId, err)
              return null
            }
          })
        )
        farmerEntries.forEach((entry) => {
          if (entry) {
            const [farmerId, farmer] = entry
            farmerDict[farmerId] = farmer
          }
        })

        const fieldKeys = Array.from(
          new Set(
            visits
              .filter((visit) => visit.farmerId && visit.fieldId)
              .map((visit) => fieldKey(visit.farmerId, visit.fieldId))
          )
        )
        const fieldEntries = await Promise.all(
          fieldKeys.map(async (key) => {
            const [farmerId, fieldId] = key.split('::')
            try {
              const field = await getFieldById(farmerId, fieldId)
              return field ? [key, field] : null
            } catch (err) {
              console.error('getFieldById failed', { farmerId, fieldId }, err)
              return null
            }
          })
        )
        fieldEntries.forEach((entry) => {
          if (entry) {
            const [key, field] = entry
            fieldDict[key] = field
          }
        })
      } catch (fastErr) {
        if (fastErr?.code !== 'permission-denied') {
          throw fastErr
        }
        console.warn('listRecentVisits fell back to legacy aggregation due to permissions')
        const legacy = await buildLegacyData()
        visits = legacy.visits
        farmerDict = legacy.farmerDict
        fieldDict = legacy.fieldDict
      }

      const sorted = [...visits].sort((a, b) => toMillis(b.date) - toMillis(a.date))

      setFarmerMap(farmerDict)
      setFieldMap(fieldDict)
      setRecentVisits(sorted.slice(0, RECENT_LIMIT))
    } catch (e) {
      console.error('loadRecent failed', e)
      setError(e?.message || "Ziyaretler alınmadı.")
      setFarmerMap({})
      setFieldMap({})
      setRecentVisits([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  return (
    <div className="dashboard">
      <div>
        <h1>TarlaTakip Paneli</h1>
        <p className="dashboard__intro">
          Devam etmek için bir modül seçin.
        </p>
      </div>

      <div className="dashboard__shortcut-grid">
        {sections.map((section) => (
          <Link key={section.title} to={section.to} className="dashboard__shortcut">
            <h2 className="dashboard__shortcut-title">{section.title}</h2>
            <p className="dashboard__shortcut-text">{section.body}</p>
            <span className="dashboard__shortcut-cta">{section.cta} -&gt;</span>
          </Link>
        ))}
      </div>

      <section className="dashboard__recent">
        <div className="dashboard__recent-header">
          <div className="dashboard__recent-info">
            <h2 className="section-title">Son 10 Ziyaret</h2>
          </div>
          <button onClick={loadRecent} disabled={loading} className="btn btn--outline dashboard__refresh">
            {loading ? "Yükleniyor..." : "Yenile"}
          </button>
        </div>

        {error && <div className="dashboard__error">{error}</div>}

        {loading && recentVisits.length === 0 ? (
          <div className="dashboard__loading">Ziyaretler alınıyor...</div>
        ) : recentVisits.length === 0 ? (
          <div className="dashboard__empty">Henüz ziyaret kaydı bulunmuyor.</div>
        ) : (
          <div className="dashboard__table-wrapper">
            <table className="dashboard__table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Çiftçi</th>
                  <th>Alan</th>
                  <th>Not</th>
                  <th>Öneriler</th>
                </tr>
              </thead>
              <tbody>
                {recentVisits.map((visit) => {
                  const farmer = visit.farmerId ? farmerMap[visit.farmerId] : undefined
                  const field =
                    visit.farmerId && visit.fieldId ? fieldMap[fieldKey(visit.farmerId, visit.fieldId)] : undefined
                  const recCount = Array.isArray(visit.recommendationIds) ? visit.recommendationIds.length : 0
                  return (
                    <tr key={`${visit.farmerId || "_"}-${visit.fieldId || "_"}-${visit.id}`}>
                      <td>{fmtDate(visit.date)}</td>
                      <td>
                        {farmer?.name || visit.farmerId || "-"}
                        {farmer?.phone && <span className="text-xs muted">{farmer.phone}</span>}
                      </td>
                      <td>
                        {field?.type || visit.fieldId || "-"}
                        {field?.address && <span className="text-xs muted">{field.address}</span>}
                      </td>
                      <td>
                        <span className="dashboard__note">{visit.note || "-"}</span>
                      </td>
                      <td>{recCount === 0 ? "-" : `${recCount} adet`}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

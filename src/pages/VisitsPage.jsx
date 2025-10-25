import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { listFarmersOnce } from "../services/farmerService";
import { listFieldsByFarmer } from "../services/fieldService";
import { listVisitsByField, removeVisit } from "../services/visitService";
import { listRecommendations } from "../services/recommendationService";
const VisitForm = lazy(() => import("../components/VisitForm"));
import "../styles/visits.css";
function formatDate(value) {
  if (!value) return "-";
  if (typeof value === "object") {
    if (typeof value.toDate === "function") return value.toDate().toLocaleString();
    if ("seconds" in value) return new Date(value.seconds * 1000).toLocaleString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }
  return String(value);
}
function toMillis(value) {
  if (!value) return 0;
  if (typeof value === "object") {
    if (typeof value.toMillis === "function") return value.toMillis();
    if ("seconds" in value) return value.seconds * 1000;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
  return 0;
}
function normalizeText(value) {
  if (!value) return "";
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
const PAGE_SIZE = 5;
export default function VisitsPage() {
  const navigate = useNavigate();
  const { farmerId: routeFarmerId, fieldId: routeFieldId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [visits, setVisits] = useState([]);
  const [farmerMap, setFarmerMap] = useState({});
  const [fieldMap, setFieldMap] = useState({});
  const [fieldsByFarmer, setFieldsByFarmer] = useState({});
  const [recommendationMap, setRecommendationMap] = useState({});
  const initialFarmerFilter = searchParams.get("farmerId") || routeFarmerId || "";
  const initialFieldFilter = searchParams.get("fieldId") || routeFieldId || "";
  const initialSearch = searchParams.get("q") || "";
  const [farmerFilter, setFarmerFilter] = useState(initialFarmerFilter);
  const [fieldFilter, setFieldFilter] = useState(initialFieldFilter);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFarmerId, setAddFarmerId] = useState(initialFarmerFilter);
  const [addFieldId, setAddFieldId] = useState(initialFieldFilter);
  const [editingVisitId, setEditingVisitId] = useState("");
  const [pendingVisitId, setPendingVisitId] = useState("");
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);
  useEffect(() => {
    if (routeFarmerId || routeFieldId) {
      const params = new URLSearchParams(searchParams);
      if (routeFarmerId && params.get("farmerId") !== routeFarmerId) {
        params.set("farmerId", routeFarmerId);
      }
      if (routeFieldId && params.get("fieldId") !== routeFieldId) {
        params.set("fieldId", routeFieldId);
      }
      const query = params.toString();
      navigate(`/visits${query ? `?${query}` : ''}`, { replace: true });
    }
  }, [routeFarmerId, routeFieldId, searchParams, navigate]);
  const syncSearchParams = useCallback(
    (nextFarmer, nextField, nextSearch) => {
      const next = new URLSearchParams();
      if (nextFarmer) next.set("farmerId", nextFarmer);
      if (nextField) next.set("fieldId", nextField);
      if (nextSearch) next.set("q", nextSearch);
      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );
  useEffect(() => {
    const currentFarmerParam = searchParams.get("farmerId");
    const currentFieldParam = searchParams.get("fieldId");
    const currentSearchParam = searchParams.get("q") || "";
    setFarmerFilter(currentFarmerParam || "");
    setFieldFilter(currentFieldParam || "");
    setSearchTerm(currentSearchParam);
    setAddFarmerId(currentFarmerParam || "");
    setAddFieldId(currentFieldParam || "");
  }, [searchParams]);
  useEffect(() => {
    const currentFarmerParam = searchParams.get("farmerId");
    const currentFieldParam = searchParams.get("fieldId");
    const currentSearchParam = searchParams.get("q") || "";
    if (routeFarmerId && currentFarmerParam !== routeFarmerId) {
      syncSearchParams(routeFarmerId, routeFieldId || currentFieldParam || "", currentSearchParam);
    }
    if (routeFieldId && currentFieldParam !== routeFieldId) {
      syncSearchParams(routeFarmerId || currentFarmerParam || "", routeFieldId, currentSearchParam);
    }
  }, [routeFarmerId, routeFieldId, searchParams, syncSearchParams]);
  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const allFarmers = await listFarmersOnce();
      const farmerDict = {};
      allFarmers.forEach((farmer) => {
        farmerDict[farmer.id] = farmer;
      });
      const targetFarmers = farmerFilter
        ? allFarmers.filter((farmer) => farmer.id === farmerFilter)
        : allFarmers;
      const recommendationList = await listRecommendations();
      const recommendationDict = {};
      recommendationList.forEach((rec) => {
        recommendationDict[rec.id] = rec.name;
      });
      const groupedFields = {};
      const fieldDict = {};
      const fieldPairs = [];
      if (targetFarmers.length === 0) {
        setFarmerMap(farmerDict);
        setFieldMap(fieldDict);
        setFieldsByFarmer(groupedFields);
        setRecommendationMap(recommendationDict);
        setVisits([]);
        setPageIndex(0);
        setEditingVisitId("");
        return;
      }
      await Promise.all(
        targetFarmers.map(async (farmer) => {
          const fields = await listFieldsByFarmer(farmer.id);
          groupedFields[farmer.id] = fields;
          fields.forEach((field) => {
            fieldDict[`${farmer.id}::${field.id}`] = field;
            const shouldIncludeFarmer = !farmerFilter || farmer.id === farmerFilter;
            const shouldIncludeField = !fieldFilter || field.id === fieldFilter;
            if (shouldIncludeFarmer && shouldIncludeField) {
              fieldPairs.push({ farmerId: farmer.id, field });
            }
          });
        })
      );
      if (fieldFilter && !fieldPairs.length) {
        setFarmerMap(farmerDict);
        setFieldMap(fieldDict);
        setFieldsByFarmer(groupedFields);
        setRecommendationMap(recommendationDict);
        setVisits([]);
        setPageIndex(0);
        setEditingVisitId("");
        return;
      }
      const visitsArrays = await Promise.all(
        fieldPairs.map(({ farmerId, field }) => listVisitsByField(farmerId, field.id))
      );
      const aggregated = [];
      visitsArrays.forEach((list, index) => {
        const { farmerId, field } = fieldPairs[index];
        list.forEach((visit) => {
          aggregated.push({
            ...visit,
            farmerId,
            fieldId: field.id,
          });
        });
      });
      aggregated.sort((a, b) => toMillis(b.date) - toMillis(a.date));
      setFarmerMap(farmerDict);
      setFieldMap(fieldDict);
      setFieldsByFarmer(groupedFields);
      setRecommendationMap(recommendationDict);
      setVisits(aggregated);
      setPageIndex(0);
      setEditingVisitId("");
    } catch (e) {
      setError(e?.message || "Ziyaretler yüklenirken bir hata oluştu.");
      setRecommendationMap({});
      setEditingVisitId("");
    } finally {
      setLoading(false);
    }
  }, [farmerFilter, fieldFilter]);
  useEffect(() => {
    loadVisits();
  }, [loadVisits]);
  useEffect(() => {
    if (!farmerFilter || !fieldFilter) return;
    const availableFields = fieldsByFarmer[farmerFilter];
    if (availableFields === undefined) return;
    if (!availableFields.some((field) => field.id === fieldFilter)) {
      setFieldFilter("");
      setAddFieldId("");
      syncSearchParams(farmerFilter, "", searchTerm);
    }
  }, [farmerFilter, fieldFilter, fieldsByFarmer, syncSearchParams, searchTerm]);
  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm, farmerFilter, fieldFilter, dateFrom, dateTo]);
  useEffect(() => {
    if (!showAddForm || !addFarmerId || Object.prototype.hasOwnProperty.call(fieldsByFarmer, addFarmerId)) {
      return;
    }
    (async () => {
      try {
        const fields = await listFieldsByFarmer(addFarmerId);
        setFieldsByFarmer((prev) => ({ ...prev, [addFarmerId]: fields }));
      } catch (e) {
        console.error("Alanlar yüklenirken hata", e);
      }
    })();
  }, [showAddForm, addFarmerId, fieldsByFarmer]);
  const farmerOptions = useMemo(() => {
    return Object.values(farmerMap).map((farmer) => ({ id: farmer.id, name: farmer.name || farmer.id }));
  }, [farmerMap]);
  const fieldOptions = useMemo(() => {
    if (!farmerFilter) return [];
    return (fieldsByFarmer[farmerFilter] || []).map((field) => ({ id: field.id, label: field.type || field.id }));
  }, [fieldsByFarmer, farmerFilter]);
  const fromMillisFilter = useMemo(() => {
    if (!dateFrom) return null;
    const parsed = new Date(`${dateFrom}T00:00:00.000`);
    const value = parsed.getTime();
    return Number.isNaN(value) ? null : value;
  }, [dateFrom]);
  const toMillisFilter = useMemo(() => {
    if (!dateTo) return null;
    const parsed = new Date(`${dateTo}T23:59:59.999`);
    const value = parsed.getTime();
    return Number.isNaN(value) ? null : value;
  }, [dateTo]);
  const filteredVisits = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm.trim());
    return visits.filter((visit) => {
      if (farmerFilter && visit.farmerId !== farmerFilter) return false;
      if (fieldFilter && visit.fieldId !== fieldFilter) return false;
      const visitTime = toMillis(visit.date);
      if (fromMillisFilter !== null && visitTime < fromMillisFilter) return false;
      if (toMillisFilter !== null && visitTime > toMillisFilter) return false;
      if (!normalizedSearch) return true;
      const farmer = farmerMap[visit.farmerId];
      const field = fieldMap[`${visit.farmerId}::${visit.fieldId}`];
      const recommendationNames = Array.isArray(visit.recommendationIds)
        ? visit.recommendationIds.map((id) => recommendationMap[id] || id)
        : [];
      const haystack = [
        visit.note,
        farmer?.name,
        farmer?.phone,
        field?.type,
        field?.address,
        ...recommendationNames,
      ]
        .filter(Boolean)
        .map(normalizeText)
        .join(' ');
      return haystack.includes(normalizedSearch);
    });
  }, [visits, searchTerm, farmerFilter, fieldFilter, farmerMap, fieldMap, recommendationMap, fromMillisFilter, toMillisFilter]);
  const pageVisits = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return filteredVisits.slice(start, start + PAGE_SIZE);
  }, [filteredVisits, pageIndex]);
  const hasNextPage = useMemo(() => (pageIndex + 1) * PAGE_SIZE < filteredVisits.length, [filteredVisits, pageIndex]);
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    syncSearchParams(farmerFilter, fieldFilter, value);
  };
  const handleFarmerFilterChange = (event) => {
    const value = event.target.value;
    setFarmerFilter(value);
    const nextField = '';
    setFieldFilter(nextField);
    syncSearchParams(value, nextField, searchTerm);
    setAddFarmerId(value);
    setAddFieldId(nextField);
  };
  const handleFieldFilterChange = (event) => {
    const value = event.target.value;
    setFieldFilter(value);
    syncSearchParams(farmerFilter, value, searchTerm);
    setAddFieldId(value);
  };
  const handleDateFromChange = (event) => {
    const value = event.target.value;
    setDateFrom(value);
    if (dateTo && value && value > dateTo) {
      setDateTo(value);
    }
  };
  const handleDateToChange = (event) => {
    const value = event.target.value;
    setDateTo(value);
    if (dateFrom && value && value < dateFrom) {
      setDateFrom(value);
    }
  };
  const handleExportCsv = useCallback(() => {
    if (pageVisits.length === 0) return;
    if (typeof window === "undefined") return;
    const headers = ["Tarih", "Çiftçi", "Telefon", "Alan", "Adres", "Not", "Öneriler"];
    const rows = pageVisits.map((visit) => {
      const farmer = farmerMap[visit.farmerId];
      const field = fieldMap[`${visit.farmerId}::${visit.fieldId}`];
      const recommendationNames = Array.isArray(visit.recommendationIds)
        ? visit.recommendationIds.map((id) => recommendationMap[id] || id)
        : [];
      return [
        formatDate(visit.date),
        farmer?.name || visit.farmerId || "",
        farmer?.phone || "",
        field?.type || visit.fieldId || "",
        field?.address || "",
        visit.note || "",
        recommendationNames.join(", "),
      ];
    });
    const csvLines = [headers, ...rows].map((line) =>
      line
        .map((cell) => {
          const value = cell == null ? "" : String(cell);
          return `"${value.replace(/"/g, '""')}"`
        })
        .join(",")
    );
    const csvContent = csvLines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = url;
    link.download = `ziyaretler-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [pageVisits, farmerMap, fieldMap, recommendationMap]);
  const handlePrev = () => {
    setPageIndex((prev) => Math.max(prev - 1, 0));
  };
  const handleNext = () => {
    if ((pageIndex + 1) * PAGE_SIZE < filteredVisits.length) {
      setPageIndex((prev) => prev + 1);
    }
  };
  const handleVisitAdded = () => {
    setShowAddForm(false);
    loadVisits();
  };
  const handleEditClick = (visit) => {
    setError("");
    setEditingVisitId((prev) => (prev === visit.id ? "" : visit.id));
  };
  const handleEditCancel = () => {
    setEditingVisitId("");
  };
  const handleVisitSaved = async () => {
    setEditingVisitId("");
    await loadVisits();
  };
  const handleDeleteVisit = async (visit) => {
    if (!window.confirm("Bu ziyareti silmek istediğinize emin misiniz?")) {
      return;
    }
    setPendingVisitId(visit.id);
    setError("");
    try {
      await removeVisit(visit.farmerId, visit.fieldId, visit.id);
      setEditingVisitId((prev) => (prev === visit.id ? "" : prev));
      await loadVisits();
    } catch (e) {
      console.error("visit delete failed", e);
      setError(e?.message || "Ziyaret silinemedi.");
    } finally {
      setPendingVisitId("");
    }
  };
  const addableFields = addFarmerId ? fieldsByFarmer[addFarmerId] || [] : [];
  return (
    <div className="visits">
      <div className="visits__toolbar">
        <button type="button" onClick={handleBack} className="btn visits__back">
          &larr; Geri dön
        </button>
      </div>
      <h1>Ziyaretler</h1>
      <div className="visits__filter-bar">
        <input
          type="search"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Ziyaretlerde ara..."
          className="visits__filter-input"
        />
        <select value={farmerFilter} onChange={handleFarmerFilterChange} className="visits__filter-select">
          <option value="">Tüm çiftçiler</option>
          {farmerOptions.map((farmer) => (
            <option key={farmer.id} value={farmer.id}>
              {farmer.name}
            </option>
          ))}
        </select>
        <select
          value={fieldFilter}
          onChange={handleFieldFilterChange}
          disabled={!farmerFilter}
          className="visits__filter-select"
        >
          <option value="">Tum alanlar</option>
          {fieldOptions.map((field) => (
            <option key={field.id} value={field.id}>
              {field.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={handleDateFromChange}
          className="visits__filter-select"
          aria-label="Başlangıç tarihi"
        />
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={handleDateToChange}
          className="visits__filter-select"
          aria-label="Bitiş tarihi"
        />
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={pageVisits.length === 0}
          className="btn btn--secondary"
        >
          Rapor Al
        </button>
        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className={`btn ${showAddForm ? "btn--primary" : "btn--outline"}`}
        >
          {showAddForm ? "Formu kapat" : "Yeni ziyaret ekle"}
        </button>
      </div>
      {showAddForm && (
        <div className="visits__add-card">
          <div className="visit-form__picker-label">Yeni ziyaret ekle</div>
          <div className="flex-wrap">
            <select
              value={addFarmerId}
              onChange={(event) => {
                const value = event.target.value
                setAddFarmerId(value)
                setAddFieldId("")
              }}
              className="visits__filter-select"
            >
              <option value="">Çiftçi seçin</option>
              {farmerOptions.map((farmer) => (
                <option key={farmer.id} value={farmer.id}>
                  {farmer.name}
                </option>
              ))}
            </select>
            <select
              value={addFieldId}
              onChange={(event) => setAddFieldId(event.target.value)}
              disabled={!addFarmerId}
              className="visits__filter-select"
            >
              <option value="">Alan seçin</option>
              {addableFields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.type || field.id}
                </option>
              ))}
            </select>
          </div>
          {addFarmerId && addFieldId ? (
            <Suspense fallback={<div className="visits__loading">Form yükleniyor...</div>}>
              <VisitForm farmerId={addFarmerId} fieldId={addFieldId} onAdded={handleVisitAdded} />
            </Suspense>
          ) : (
            <div className="visits__hint">Ziyaret eklemek için önce çiftçi ve alan seçmelisiniz.</div>
          )}
        </div>
      )}
      {error && <div className="visits__error mb-sm">{error}</div>}
      {loading ? (
        <div className="visits__loading">Yükleniyor...</div>
      ) : filteredVisits.length === 0 ? (
        <div className="visits__empty">Henüz ziyaret kaydı yok.</div>
      ) : (
        <div>
          <ul className="visits__list">
            {pageVisits.map((visit) => {
              const farmer = farmerMap[visit.farmerId]
              const field = fieldMap[`${visit.farmerId}::${visit.fieldId}`]
              const recommendationNames = Array.isArray(visit.recommendationIds)
                ? visit.recommendationIds.map((id) => recommendationMap[id] || id)
                : []
              const isEditing = editingVisitId === visit.id
              const isPending = pendingVisitId === visit.id
              return (
                <li key={`${visit.farmerId}-${visit.fieldId}-${visit.id}`} className="visits__item">
                  <div className="visits__date text-small">{formatDate(visit.date)}</div>
                  <div>
                    <strong>Çiftçi:</strong> {farmer?.name || visit.farmerId}
                    {farmer?.phone && <span className="muted text-small"> ({farmer.phone})</span>}
                  </div>
                  <div>
                    <strong>Alan:</strong> {field?.type || visit.fieldId}
                    {field?.address && <span className="muted text-small"> - {field.address}</span>}
                  </div>
                  <div>
                    <strong>Not:</strong> {visit.note || "-"}
                  </div>
                  {recommendationNames.length > 0 && (
                    <div className="muted">
                      <strong>Öneriler:</strong> {recommendationNames.join(", ")}
                    </div>
                  )}
                  <div className="visits__item-actions">
                    <button
                      type="button"
                      onClick={() => navigate(`/farmers/${visit.farmerId}/fields/${visit.fieldId}/visits`)}
                      className="btn btn--outline"
                      disabled={isPending}
                    >
                      Tarla ziyaretlerini göster
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditClick(visit)}
                      className="btn btn--secondary"
                      disabled={isPending}
                    >
                      {isEditing ? "Düzenlemeyi kapat" : "Düzenle"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVisit(visit)}
                      className="btn btn--danger"
                      disabled={isPending}
                    >
                      {isPending ? "Siliniyor..." : "Sil"}
                    </button>
                  </div>
                  {isEditing && (
                    <div className="visit-edit">
                      <Suspense fallback={<div className="visits__loading">Form yükleniyor...</div>}>
                        <VisitForm
                          key={visit.id}
                          farmerId={visit.farmerId}
                          fieldId={visit.fieldId}
                          initialVisit={visit}
                          mode="edit"
                          onSaved={handleVisitSaved}
                          onCancel={handleEditCancel}
                        />
                      </Suspense>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="visits__pagination">
            <button onClick={handlePrev} disabled={pageIndex === 0} className="btn btn--secondary">
              Önceki
            </button>
            <span>Sayfa {pageIndex + 1}</span>
            <button onClick={handleNext} disabled={!hasNextPage} className="btn btn--primary">
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

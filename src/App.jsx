import { Suspense, lazy, useEffect, useState } from "react"
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"

import AuthForm from "./components/AuthForm"
import InstallPromptModal from "./components/InstallPromptModal"
import useInstallPrompt from "./hooks/useInstallPrompt"
import { logOut } from "./services/authService"

import "./styles/app.css"
import "./styles/auth.css"
import "./styles/modal.css"

const DashboardPage = lazy(() => import("./pages/DashboardPage"))
const FarmersPage = lazy(() => import("./pages/FarmersPage"))
const FieldsPage = lazy(() => import("./pages/FieldsPage"))
const VisitsPage = lazy(() => import("./pages/VisitsPage"))
const RecommendationsPage = lazy(() => import("./pages/RecommendationsPage"))

const DEFAULT_META_DESCRIPTION =
  "TarlaTakip ile tarlalarınızı, ziyaretlerinizi ve saha notlarınızı kolayca yönetin."

function AppShell({ user }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand">
          TarlaTakip
        </Link>
        <div className="app-header-meta">
          <span className="app-header-user">{user?.email}</span>
          <button type="button" onClick={() => logOut()} className="btn app-header__logout">
            Çıkış
          </button>
        </div>
      </header>

      <Suspense fallback={<div className="app-loading">Yükleniyor...</div>}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/farmers" element={<FarmersPage />} />
          <Route path="/visits" element={<VisitsPage />} />
          <Route path="/farmers/:farmerId/fields" element={<FieldsPage />} />
          <Route path="/farmers/:farmerId/fields/:fieldId/visits" element={<VisitsPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [installDismissed, setInstallDismissed] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const { canInstall, promptInstall } = useInstallPrompt()

  useEffect(() => {
    if (typeof document === 'undefined') return
    const description = DEFAULT_META_DESCRIPTION
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    if (!meta.getAttribute('content')) {
      meta.setAttribute('content', description)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null)
      setReady(true)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const flag = window.localStorage?.getItem("installPromptDismissed") === "true"
    setInstallDismissed(flag)
  }, [])

  useEffect(() => {
    if (canInstall && !installDismissed) {
      setShowInstallPrompt(true)
    } else if (!canInstall) {
      setShowInstallPrompt(false)
    }
  }, [canInstall, installDismissed])

  if (!ready) return <div className="app-loading">Yükleniyor...</div>

  const handleInstall = async () => {
    const result = await promptInstall()
    if (result?.outcome === "accepted") {
      if (typeof window !== "undefined") {
        window.localStorage?.removeItem("installPromptDismissed")
      }
      setInstallDismissed(false)
      setShowInstallPrompt(false)
      return
    }
    if (typeof window !== "undefined") {
      window.localStorage?.setItem("installPromptDismissed", "true")
    }
    setInstallDismissed(true)
    setShowInstallPrompt(false)
  }

  const handleDismissInstall = () => {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem("installPromptDismissed", "true")
    }
    setInstallDismissed(true)
    setShowInstallPrompt(false)
  }

  if (!user) {
    return (
      <>
        <div className="app-login-shell">
          <h1 className="app-login-title">TarlaTakip</h1>
          <p className="app-login-description">Lütfen yetkili hesabınızla giriş yapın.</p>
          <AuthForm />
        </div>
        <InstallPromptModal
          open={showInstallPrompt && canInstall}
          onInstall={handleInstall}
          onDismiss={handleDismissInstall}
        />
      </>
    )
  }

  return (
    <BrowserRouter>
      <AppShell user={user} />
    </BrowserRouter>
  )
}

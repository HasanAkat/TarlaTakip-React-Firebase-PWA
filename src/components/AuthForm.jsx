import { useState } from "react"
import { signIn } from "../services/authService"
import "../styles/auth.css"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setErr("")
    setBusy(true)
    try {
      await signIn(email, password)
      // onAuthStateChanged App.jsx içinde kullanıcıyı içeri alacak
    } catch (e) {
      setErr(e.message || "Giriş başarısız")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <input placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Şifre" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn btn--primary" disabled={busy} type="submit">
        {busy ? "Bekleyin..." : "Giriş"}
      </button>
      {err && <div className="auth-error">{err}</div>}
    </form>
  )
}

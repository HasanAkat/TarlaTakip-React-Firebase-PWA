import React from "react"
import "../styles/modal.css"

export default function InstallPromptModal({ open, onInstall, onDismiss }) {
  if (!open) return null

  return (
    <div className="install-modal-backdrop">
      <div role="dialog" aria-modal="true" className="install-modal">
        <div className="install-modal__heading">
          <h2 className="install-modal__title">Uygulamayı yükle</h2>
          <p className="install-modal__description">
            TarlaTakip'i ana ekrana kaydederek çevrimdışı destekli, tam ekran deneyimi kullanın.
          </p>
        </div>
        <div className="install-modal__actions">
          <button type="button" onClick={onInstall} className="btn btn--primary">
            Uygulamayı yükle
          </button>
          <button type="button" onClick={onDismiss} className="btn btn--secondary">
            Web'de devam et
          </button>
        </div>
      </div>
    </div>
  )
}

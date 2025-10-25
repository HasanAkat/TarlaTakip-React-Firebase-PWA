import { useCallback, useEffect, useState } from "react";

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia) {
    try {
      return window.matchMedia("(display-mode: standalone)").matches;
    } catch {
      return false;
    }
  }
  return window.navigator?.standalone === true;
}

export default function useInstallPrompt() {
  const [event, setEvent] = useState(null);
  const [standalone, setStandalone] = useState(() => isStandaloneDisplay());

  useEffect(() => {
    const handleDisplayModeChange = () => {
      setStandalone(isStandaloneDisplay());
    };

    const mediaQuery = window.matchMedia ? window.matchMedia("(display-mode: standalone)") : null;
    mediaQuery?.addEventListener?.("change", handleDisplayModeChange);
    mediaQuery?.addListener?.(handleDisplayModeChange);
    window.addEventListener("appinstalled", handleDisplayModeChange);

    return () => {
      mediaQuery?.removeEventListener?.("change", handleDisplayModeChange);
      mediaQuery?.removeListener?.(handleDisplayModeChange);
      window.removeEventListener("appinstalled", handleDisplayModeChange);
    };
  }, []);

  useEffect(() => {
    const handler = (promptEvent) => {
      promptEvent.preventDefault();
      setEvent(promptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!event) return null;
    event.prompt();
    const choice = await event.userChoice.catch(() => null);
    setEvent(null);
    return choice;
  }, [event]);

  return {
    canInstall: !!event && !standalone,
    promptInstall,
    dismiss: () => setEvent(null),
  };
}

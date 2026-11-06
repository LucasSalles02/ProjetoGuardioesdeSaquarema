import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function useContentAnchor(ready) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready || !hash) return;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(id);
      if (element) { element.scrollIntoView({ block: "start", behavior: "instant" }); element.focus({ preventScroll: true }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, ready]);
}

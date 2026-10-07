"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapStyle } from "@/lib/map-style";
import { useIsDark } from "@/components/brand";
import type { MapLocation } from "@/server/services/locations";

interface Props {
  locations: MapLocation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  padding: { top: number; left: number; right: number; bottom: number };
}

type Pinned = MapLocation & { lat: number; lng: number };

export function ControlMap({ locations, selectedId, onSelect, padding }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const fitted = useRef(false);
  const themeRef = useRef<"light" | "dark" | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState("");
  const dark = useIsDark();

  const pinned = locations.filter((l): l is Pinned => l.lat != null && l.lng != null);

  useEffect(() => {
    let cancelled = false;
    let map: MlMap | null = null;
    const pins = markers.current;
    import("maplibre-gl")
      .then((ml) => {
        if (cancelled || !container.current) return;
        const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
        themeRef.current = theme;
        map = new ml.Map({
          container: container.current,
          style: mapStyle(theme),
          center: [78.5, 18.5],
          zoom: 4.6,
          attributionControl: false,
        });
        map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new ml.AttributionControl({ compact: true }), "bottom-right");
        map.on("load", () => !cancelled && setReady(true));
        map.on("error", (e) => {
          if (String(e.error?.message ?? "").includes("WebGL")) setFailed("This browser can't draw the map (WebGL unavailable).");
        });
        map.on("click", () => onSelect(null));
        mapRef.current = map;
      })
      .catch(() => setFailed("The map failed to load."));
    return () => {
      cancelled = true;
      for (const { marker } of pins.values()) marker.remove();
      pins.clear();
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const theme = dark ? "dark" : "light";
    if (!map || !ready || themeRef.current === theme) return;
    themeRef.current = theme;
    map.setStyle(mapStyle(theme));
  }, [dark, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let alive = true;
    import("maplibre-gl").then((ml) => {
      if (!alive) return;
      for (const { marker } of markers.current.values()) marker.remove();
      markers.current.clear();
      for (const loc of pinned) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = `site-pin site-pin-${loc.type === "WAREHOUSE" ? "wh" : "site"}`;
        el.setAttribute("aria-label", `${loc.type === "WAREHOUSE" ? "Warehouse" : "Site"}: ${loc.name}`);
        const head = document.createElement("span");
        head.className = "site-pin-head";
        head.textContent = loc.type === "WAREHOUSE" ? "WH" : loc.code.replace(/^SITE-0*/, "S");
        const lab = document.createElement("span");
        lab.className = "site-pin-lab";
        lab.textContent = loc.name;
        el.append(head, lab);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(loc.id);
        });
        const marker = new ml.Marker({ element: el, anchor: "bottom" }).setLngLat([loc.lng, loc.lat]).addTo(map);
        markers.current.set(loc.id, { marker, el });
      }
      if (!fitted.current && pinned.length) {
        fitted.current = true;
        const b = new ml.LngLatBounds();
        for (const l of pinned) b.extend([l.lng, l.lat]);
        map.fitBounds(b, { padding, maxZoom: 12.5, duration: 0 });
      }
      for (const [id, { el }] of markers.current) el.classList.toggle("is-on", id === selectedId);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, locations]);

  useEffect(() => {
    for (const [id, { el }] of markers.current) el.classList.toggle("is-on", id === selectedId);
    const map = mapRef.current;
    const sel = pinned.find((l) => l.id === selectedId);
    if (map && sel) map.flyTo({ center: [sel.lng, sel.lat], zoom: Math.max(map.getZoom(), 11.5), speed: 0.9, padding });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" />
      {!ready && !failed && <div className="absolute inset-0 bg-paper-200/50 animate-pulse" />}
      {failed && (
        <div className="absolute inset-0 grid place-items-center px-6 text-center text-[13px] text-ink-600">{failed}</div>
      )}
    </div>
  );
}

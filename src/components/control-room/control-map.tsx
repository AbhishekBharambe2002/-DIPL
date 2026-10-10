"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TILE_ATTRIBUTION, TILE_URL } from "@/lib/map-style";
import type { MapLocation } from "@/server/services/locations";

interface Props {
  locations: MapLocation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  padding: { top: number; left: number; right: number; bottom: number };
}

type Pinned = MapLocation & { lat: number; lng: number };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function pinIcon(loc: Pinned, on: boolean) {
  const kind = loc.type === "WAREHOUSE" ? "wh" : "site";
  const head = loc.type === "WAREHOUSE" ? "WH" : loc.code.replace(/^SITE-0*/, "S");
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<span class="site-pin site-pin-${kind}${on ? " is-on" : ""}" style="transform:translate(-50%,-100%)"><span class="site-pin-head">${escapeHtml(head)}</span><span class="site-pin-lab">${escapeHtml(loc.name)}</span></span>`,
  });
}

export function ControlMap({ locations, selectedId, onSelect, padding }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, { marker: L.Marker; loc: Pinned }>());
  const fitted = useRef(false);
  const onSelectRef = useRef(onSelect);
  const paddingRef = useRef(padding);

  useEffect(() => {
    onSelectRef.current = onSelect;
    paddingRef.current = padding;
  });

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { zoomControl: false, attributionControl: false }).setView([18.5, 76.5], 5);
    L.control.zoom({ position: "topright" }).addTo(map);
    L.control.attribution({ position: "bottomright", prefix: false }).addAttribution(TILE_ATTRIBUTION).addTo(map);
    L.tileLayer(TILE_URL, { maxZoom: 19, className: "map-tiles" }).addTo(map);
    map.on("click", () => onSelectRef.current(null));
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markers.current.clear();

    const pinned = locations.filter((l): l is Pinned => l.lat != null && l.lng != null);
    for (const loc of pinned) {
      const marker = L.marker([loc.lat, loc.lng], {
        icon: pinIcon(loc, loc.id === selectedId),
        keyboard: true,
        title: loc.name,
        riseOnHover: true,
      });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current(loc.id);
      });
      marker.addTo(layer);
      markers.current.set(loc.id, { marker, loc });
    }

    if (!fitted.current && pinned.length) {
      fitted.current = true;
      const p = paddingRef.current;
      map.fitBounds(L.latLngBounds(pinned.map((l) => [l.lat, l.lng] as [number, number])), {
        paddingTopLeft: [p.left, p.top],
        paddingBottomRight: [p.right, p.bottom],
        maxZoom: 12,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  useEffect(() => {
    const map = mapRef.current;
    for (const [id, { marker, loc }] of markers.current) {
      marker.setIcon(pinIcon(loc, id === selectedId));
      marker.setZIndexOffset(id === selectedId ? 1000 : 0);
    }
    const sel = selectedId ? markers.current.get(selectedId) : undefined;
    if (!map || !sel) return;
    const zoom = Math.max(map.getZoom(), 12);
    const p = paddingRef.current;
    // Centre the pin in the area left uncovered by the overlay panels.
    const offset = L.point((p.right - p.left) / 2, (p.bottom - p.top) / 2);
    const target = map.unproject(map.project([sel.loc.lat, sel.loc.lng], zoom).add(offset), zoom);
    map.flyTo(target, zoom, { duration: 0.8 });
  }, [selectedId]);

  return <div ref={container} className="absolute inset-0 z-0 bg-paper-200" />;
}

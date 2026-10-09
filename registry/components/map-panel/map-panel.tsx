import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "@notsho/theme";
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
// MapLibre v6 finds its worker relative to its own module, which Vite's
// pre-bundling breaks. Hand it a Vite-built worker (bundled with its shared chunk) instead.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useEffect, useRef } from "react";
import { tokenColor } from "../../lib/token-color";
import styles from "./map-panel.module.css";
import { useMotionTokens } from "../../lib/motion-tokens";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub?: string;
}

const geojson = (pts: MapPoint[]): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features: pts.map((p) => ({
    type: "Feature",
    properties: { id: p.id, label: p.label, sub: p.sub ?? "" },
    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
  })),
});

maplibregl.setWorkerUrl(workerUrl);

const STYLE = { light: "https://tiles.openfreemap.org/styles/positron", dark: "https://tiles.openfreemap.org/styles/dark" };

/**
 * Clustered pins on an OpenFreeMap basemap (no API key). Colors come from
 * Notsho tokens and follow the theme; selecting a pin calls `onSelect`, and a
 * selected id from elsewhere (a table row) is highlighted and brought into view.
 */
export function MapPanel({
  points,
  selectedId,
  onSelect,
  fitKey,
}: {
  points: MapPoint[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Change it (e.g. to the serialized filters) to refit the map to `points`. */
  fitKey: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const latest = useRef({ points, selectedId, onSelect });
  latest.current = { points, selectedId, onSelect };
  const { resolvedScheme, theme } = useTheme();
  const m = useMotionTokens();
  const scheme = resolvedScheme === "dark" ? "dark" : "light";

  // Build layers on every style load (initial + light/dark switch).
  const addLayers = (mp: MLMap) => {
    const accent = tokenColor("color-accent", 1, el.current ?? undefined);
    const ring = tokenColor("color-surface", 1, el.current ?? undefined);
    const onAccent = tokenColor("color-on-accent", 1, el.current ?? undefined);
    const ink = tokenColor("color-text", 1, el.current ?? undefined);
    mp.addSource("pts", { type: "geojson", data: geojson(latest.current.points), cluster: true, clusterMaxZoom: 14, clusterRadius: 44 });
    mp.addLayer({
      id: "clusters",
      type: "circle",
      source: "pts",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": accent,
        "circle-opacity": 0.9,
        "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 23, 200, 28],
        "circle-stroke-width": 2,
        "circle-stroke-color": ring,
      },
    });
    mp.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "pts",
      filter: ["has", "point_count"],
      layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12, "text-font": ["Noto Sans Bold"] },
      paint: { "text-color": onAccent },
    });
    mp.addLayer({
      id: "points",
      type: "circle",
      source: "pts",
      filter: ["!", ["has", "point_count"]],
      paint: { "circle-color": accent, "circle-radius": 5, "circle-stroke-width": 2, "circle-stroke-color": ring },
    });
    mp.addLayer({
      id: "selected",
      type: "circle",
      source: "pts",
      filter: ["==", ["get", "id"], latest.current.selectedId ?? ""],
      paint: { "circle-color": accent, "circle-radius": 9, "circle-stroke-width": 3, "circle-stroke-color": ink },
    });
    ready.current = true;
  };

  // Create once.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the map lives for the component's lifetime; later changes are applied by the effects below
  useEffect(() => {
    if (!el.current) return;
    const mp = new maplibregl.Map({
      container: el.current,
      style: STYLE[scheme],
      center: [-95, 38],
      zoom: 3,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    mp.touchZoomRotate.disableRotation();
    mp.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current = mp;

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: styles.mapPopup });
    const showPopup = (f: maplibregl.MapGeoJSONFeature) => {
      const node = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = String(f.properties.label);
      node.append(title);
      if (f.properties.sub) {
        const sub = document.createElement("span");
        sub.textContent = String(f.properties.sub);
        node.append(sub);
      }
      popup
        .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
        .setDOMContent(node)
        .addTo(mp);
    };

    mp.on("style.load", () => addLayers(mp));
    mp.on("click", "clusters", async (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const zoom = await (mp.getSource("pts") as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id);
      mp.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
    });
    mp.on("click", "points", (e) => {
      const id = e.features?.[0]?.properties.id;
      if (id) latest.current.onSelect(String(id));
    });
    for (const layer of ["clusters", "points"]) {
      mp.on("mouseenter", layer, () => (mp.getCanvas().style.cursor = "pointer"));
      mp.on("mouseleave", layer, () => {
        mp.getCanvas().style.cursor = "";
        popup.remove();
      });
    }
    mp.on("mousemove", "points", (e) => e.features?.[0] && showPopup(e.features[0]));

    const ro = new ResizeObserver(() => mp.resize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      popup.remove();
      mp.remove();
      map.current = null;
      ready.current = false;
    };
  }, []);

  // Light/dark basemap, and re-read token colors when the theme changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: theme changes rewrite the CSS variables the layers read
  useEffect(() => {
    const mp = map.current;
    if (!mp) return;
    ready.current = false;
    mp.setStyle(STYLE[scheme], { diff: false });
  }, [scheme, theme]);

  // New data.
  useEffect(() => {
    const src = map.current?.getSource("pts") as GeoJSONSource | undefined;
    src?.setData(geojson(points));
  }, [points]);

  // Refit when the filters change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: refit only when the caller says the set changed
  useEffect(() => {
    const mp = map.current;
    if (!mp || !points.length) return;
    const fit = () => {
      const b = new maplibregl.LngLatBounds();
      for (const p of points) b.extend([p.lng, p.lat]);
      mp.fitBounds(b, { padding: 56, maxZoom: 13, duration: m.slow * 1000 * 2 });
    };
    if (mp.loaded()) fit();
    else mp.once("load", fit);
  }, [fitKey, points.length > 0]);

  // Selection: highlight it, zoom past clustering so the pin is visible, and keep it clear of the
  // detail sheet (right side on desktop, bottom on phones).
  useEffect(() => {
    const mp = map.current;
    if (!mp || !ready.current) return;
    if (mp.getLayer("selected")) mp.setFilter("selected", ["==", ["get", "id"], selectedId ?? ""]);
    const p = points.find((x) => x.id === selectedId);
    if (!p) return;
    // How much of the map the detail sheet covers: a 40rem panel from the right, or the lower half on phones.
    const rect = mp.getContainer().getBoundingClientRect();
    const phone = window.matchMedia("(max-width: 48rem)").matches;
    const sheet = Math.min(40 * 16, window.innerWidth - 32);
    const covered = phone ? rect.height * 0.55 : Math.max(0, rect.right - (window.innerWidth - sheet));
    const padding = phone ? { bottom: covered } : { right: Math.min(covered, rect.width * 0.7) };
    mp.easeTo({ center: [p.lng, p.lat], zoom: Math.max(mp.getZoom(), 15), padding, duration: m.slow * 1000 * 2 });
  }, [selectedId, points, m.slow]);

  return <div ref={el} className={styles.map} />;
}

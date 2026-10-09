/**
 * Camera barcode scanner. Uses the browser's BarcodeDetector where it exists
 * (Chrome, Android) and a ZXing WASM fallback elsewhere (iOS Safari), served
 * from your own bundle so scanning never calls a CDN. Needs Vite (or another
 * bundler that understands `?url`). The camera needs a secure context.
 */
import { BarcodeDetector as Ponyfill, prepareZXingModule } from "barcode-detector/ponyfill";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import { EmptyState } from "../empty-state";
import styles from "./barcode-scanner.module.css";

prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) } });

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"] as const;

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };

async function makeDetector(): Promise<Detector> {
  const Native = (globalThis as { BarcodeDetector?: typeof Ponyfill }).BarcodeDetector;
  if (Native) {
    const supported = await Native.getSupportedFormats().catch(() => [] as string[]);
    const formats = FORMATS.filter((f) => supported.includes(f));
    if (formats.length) return new Native({ formats: [...formats] });
  }
  return new Ponyfill({ formats: [...FORMATS] });
}

const CameraIcon = (p: ComponentProps<"svg">) => (
  <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden {...p}>
    <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h1.25L6 2.5h4L11.25 4h1.25A1.5 1.5 0 0 1 14 5.5v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z" />
    <circle cx="8" cy="8.5" r="2.5" />
  </svg>
);

/** Live camera view that calls `onDetect` once with the first code it reads. */
export function BarcodeScanner({
  onDetect,
  insecureHint = "The camera needs a secure connection (HTTPS or localhost).",
}: {
  onDetect: (code: string) => void;
  /** Shown when the page isn't a secure context — say how to reach it over HTTPS. */
  insecureHint?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);
  const cb = useRef(onDetect);
  cb.current = onDetect;
  const hint = useRef(insecureHint);
  hint.current = insecureHint;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(hint.current);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      } catch (e) {
        setError(
          (e as Error).name === "NotAllowedError" ? "Camera access was blocked. Allow it in the browser's site settings." : String(e),
        );
        return;
      }
      if (cancelled || !video.current) return;
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      const detector = await makeDetector();
      const tick = async () => {
        if (cancelled || done.current || !video.current) return;
        if (video.current.readyState >= 2) {
          const found = await detector.detect(video.current).catch(() => []);
          const code = found[0]?.rawValue;
          if (code) {
            done.current = true;
            navigator.vibrate?.(30);
            cb.current(code);
            return;
          }
        }
        timer = setTimeout(tick, 200);
      };
      tick();
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      for (const t of stream?.getTracks() ?? []) t.stop();
    };
  }, []);

  if (error) return <EmptyState size="sm" icon={<CameraIcon />} title="Can't use the camera" description={error} />;
  return (
    <div className={styles.scanner}>
      <video ref={video} className={styles.scannerVideo} playsInline muted />
      <div className={styles.scannerFrame} aria-hidden />
    </div>
  );
}

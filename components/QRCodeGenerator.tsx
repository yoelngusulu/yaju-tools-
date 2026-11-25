"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { recordToolActivity } from "@/lib/tools/activity";
import Link from "next/link";
import { ArrowLeft, Download, QrCode } from "lucide-react";

type ContentType = "website" | "text" | "email" | "phone" | "wifi";
type WifiSecurity = "WPA" | "WEP" | "nopass";
type Output = { key: string; png: string; svg: string; error?: string };

function encodeContent(type: ContentType, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter content to create a QR code.");
  if (type === "website") {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let url: URL;
    try { url = new URL(normalized); } catch { throw new Error("Enter a valid website address."); }
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) throw new Error("Enter a valid website address.");
    return url.toString();
  }
  if (type === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) throw new Error("Enter a valid email address.");
    return `mailto:${trimmed}`;
  }
  if (type === "phone") {
    if (!/^\+?[\d().\s-]{5,}$/.test(trimmed) || trimmed.replace(/\D/g, "").length < 5) throw new Error("Enter a valid telephone number.");
    return `tel:${trimmed.replace(/[().\s-]/g, "")}`;
  }
  return trimmed;
}

function encodeWifi(ssid: string, password: string, security: WifiSecurity, hidden: boolean): string {
  const networkName = ssid;
  if (!networkName.trim()) throw new Error("Enter the Wi-Fi network name (SSID).");
  if (new TextEncoder().encode(networkName).length > 32) throw new Error("Wi-Fi network names must be 32 bytes or fewer.");
  if (security === "WPA" && !(password.length >= 8 && password.length <= 63) && !/^[\da-fA-F]{64}$/.test(password)) {
    throw new Error("WPA passwords must be 8–63 characters, or a 64-character hexadecimal key.");
  }
  if (security === "WEP" && !([5, 13].includes(password.length) || ([10, 26].includes(password.length) && /^[\da-fA-F]+$/.test(password)))) {
    throw new Error("WEP passwords must be 5 or 13 characters, or a 10 or 26-character hexadecimal key.");
  }
  const escape = (text: string) => text.replace(/[\\;,:\"]/g, "\\$&");
  const passwordPart = security === "nopass" ? "" : `P:${escape(password)};`;
  return `WIFI:T:${security};S:${escape(networkName)};${passwordPart}H:${hidden ? "true" : "false"};;`;
}

export default function QRCodeGenerator() {
  const [type, setType] = useState<ContentType>("website");
  const [value, setValue] = useState("");
  const [ssid, setSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiSecurity, setWifiSecurity] = useState<WifiSecurity>("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);
  const [size, setSize] = useState(512);
  const [foreground, setForeground] = useState("#111827");
  const [background, setBackground] = useState("#ffffff");
  const [logo, setLogo] = useState("");
  const [logoError, setLogoError] = useState("");
  const [result, setResult] = useState<Output | null>(null);
  const payload = useMemo(() => {
    try {
      return { data: type === "wifi" ? encodeWifi(ssid, wifiPassword, wifiSecurity, wifiHidden) : encodeContent(type, value), error: "" };
    } catch (reason) {
      const hasInput = type === "wifi" ? Boolean(ssid.trim()) : Boolean(value.trim());
      return { data: "", error: hasInput ? (reason as Error).message : "" };
    }
  }, [type, value, ssid, wifiPassword, wifiSecurity, wifiHidden]);
  const requestKey = JSON.stringify([payload.data, size, foreground, background, logo]);
  const output = result?.key === requestKey && !result.error ? result : null;
  const loading = Boolean(payload.data) && result?.key !== requestKey;
  const error = payload.error || (result?.key === requestKey ? result.error || "" : "");

  useEffect(() => {
    let active = true;
    if (!payload.data) return;
    const options = { width: size, margin: 4, errorCorrectionLevel: (logo ? "H" : "M") as "H" | "M", color: { dark: foreground, light: background } };
    Promise.all([QRCode.toDataURL(payload.data, options), QRCode.toString(payload.data, { ...options, type: "svg" })])
      .then(async ([qrPng, baseSvg]) => {
        let png = qrPng;
        let svg = baseSvg;
        if (logo) {
          const logoSize = Math.round(size * 0.2);
          const padding = Math.round(size * 0.025);
          const logoImage = new Image();
          logoImage.src = logo;
          await new Promise<void>((resolve, reject) => {
            logoImage.onload = () => resolve();
            logoImage.onerror = () => reject(new Error("Could not read this logo image."));
          });
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Could not prepare the QR image.");
          const qrImage = new Image();
          qrImage.src = qrPng;
          await new Promise<void>((resolve, reject) => {
            qrImage.onload = () => resolve();
            qrImage.onerror = () => reject(new Error("Could not prepare the QR image."));
          });
          context.drawImage(qrImage, 0, 0, size, size);
          const x = (size - logoSize) / 2;
          const y = (size - logoSize) / 2;
          const plate = logoSize + padding * 2;
          context.fillStyle = background;
          context.fillRect(x - padding, y - padding, plate, plate);
          context.drawImage(logoImage, x, y, logoSize, logoSize);
          png = canvas.toDataURL("image/png");
          const viewBox = baseSvg.match(/viewBox="([^"]+)"/i)?.[1];
          const dimensions = viewBox?.split(/[ ,]+/).map(Number);
          const svgSize = dimensions?.[2] || size;
          const svgLogo = svgSize * 0.2;
          const svgPadding = svgSize * 0.025;
          const svgX = (svgSize - svgLogo) / 2;
          const svgY = (svgSize - svgLogo) / 2;
          const logoOverlay = `<rect x="${svgX - svgPadding}" y="${svgY - svgPadding}" width="${svgLogo + svgPadding * 2}" height="${svgLogo + svgPadding * 2}" fill="${background}"/><image href="${logo}" x="${svgX}" y="${svgY}" width="${svgLogo}" height="${svgLogo}" preserveAspectRatio="xMidYMid meet"/>`;
          svg = baseSvg.replace("</svg>", `${logoOverlay}</svg>`);
        }
        if (active) setResult({ key: requestKey, png, svg });
      })
      .catch(() => { if (active) setResult({ key: requestKey, png: "", svg: "", error: "This content is too long to fit in a QR code. Try a shorter value." }); });
    return () => { active = false; };
  }, [payload.data, requestKey, size, foreground, background, logo]);

  const download = (format: "png" | "svg") => {
    if (!output) return;
    const blob = format === "png"
      ? null
      : new Blob([output.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = format === "png" ? output.png : URL.createObjectURL(blob!);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `yaju-qr-code-${size}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    if (format === "svg") URL.revokeObjectURL(url);
    void recordToolActivity("qr-code-generator", { operation: "download", fileType: format }).catch((error) => console.error("Unable to record QR activity:", error));
  };

  const label = { website: "Website URL", text: "Plain text", email: "Email address", phone: "Telephone number" }[type as Exclude<ContentType, "wifi">];
  const placeholder = { website: "https://example.com", text: "Type your message", email: "name@example.com", phone: "+255 7XX XXX XXX" }[type as Exclude<ContentType, "wifi">];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/tools/pdf" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"><ArrowLeft size={16} />Back to YAJU Documents</Link>
        <header className="mb-8">
          <div className="flex items-center gap-3 text-blue-600"><QrCode size={28} /><p className="text-sm font-bold uppercase tracking-wide">YAJU Documents</p></div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">QR Code Generator</h1>
          <p className="mt-3 max-w-2xl text-gray-600">Create and download a scannable QR code for a website, text, email, phone number or Wi-Fi network.</p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7" aria-label="QR code settings">
            <div>
              <label htmlFor="qr-type" className="mb-2 block text-sm font-semibold text-gray-800">Content type</label>
              <select id="qr-type" value={type} onChange={(event) => setType(event.target.value as ContentType)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="website">Website URL</option><option value="text">Plain text</option><option value="email">Email address</option><option value="phone">Telephone number</option><option value="wifi">Wi-Fi network</option>
              </select>
            </div>
            {type === "wifi" ? <>
              <div>
                <label htmlFor="wifi-ssid" className="mb-2 block text-sm font-semibold text-gray-800">Wi-Fi network name (SSID)</label>
                <input id="wifi-ssid" type="text" value={ssid} onChange={(event) => setSsid(event.target.value)} placeholder="Enter the network name" maxLength={32} autoComplete="off" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label htmlFor="wifi-security" className="mb-2 block text-sm font-semibold text-gray-800">Security type</label>
                <select id="wifi-security" value={wifiSecurity} onChange={(event) => setWifiSecurity(event.target.value as WifiSecurity)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="WPA">WPA / WPA2 / WPA3</option><option value="WEP">WEP</option><option value="nopass">Open network (no password)</option>
                </select>
              </div>
              {wifiSecurity !== "nopass" && <div>
                <label htmlFor="wifi-password" className="mb-2 block text-sm font-semibold text-gray-800">Wi-Fi password</label>
                <input id="wifi-password" type="password" value={wifiPassword} onChange={(event) => setWifiPassword(event.target.value)} placeholder="Enter the network password" maxLength={64} autoComplete="new-password" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>}
              <label className="flex items-center gap-3 text-sm text-gray-700"><input type="checkbox" checked={wifiHidden} onChange={(event) => setWifiHidden(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />This is a hidden network</label>
              <p className="text-xs text-gray-500">Wi-Fi details are encoded in the QR code so a compatible phone can join the network.</p>
            </> : <div>
              <label htmlFor="qr-content" className="mb-2 block text-sm font-semibold text-gray-800">{label}</label>
              <textarea id="qr-content" value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} rows={4} maxLength={2500} className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              <p className="mt-1 text-right text-xs text-gray-500">{value.length}/2500</p>
            </div>}
            <div>
              <label htmlFor="qr-size" className="mb-2 block text-sm font-semibold text-gray-800">Output size</label>
              <select id="qr-size" value={size} onChange={(event) => setSize(Number(event.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                {[256, 512, 1024].map((option) => <option key={option} value={option}>{option} × {option} px</option>)}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-800">Foreground color <input aria-label="Foreground color" type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent" /></label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-800">Background color <input aria-label="Background color" type="color" value={background} onChange={(event) => setBackground(event.target.value)} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent" /></label>
            </div>
            <div>
              <label htmlFor="qr-logo" className="mb-2 block text-sm font-semibold text-gray-800">Logo (optional)</label>
              <div className="flex flex-wrap items-center gap-3">
                <input id="qr-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                  const file = event.target.files?.[0];
                  setLogoError("");
                  if (!file) return;
                  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setLogoError("Choose a PNG, JPG or WebP image."); event.target.value = ""; return; }
                  if (file.size > 2 * 1024 * 1024) { setLogoError("Logo must be 2 MB or smaller."); event.target.value = ""; return; }
                  const reader = new FileReader();
                  reader.onload = () => setLogo(typeof reader.result === "string" ? reader.result : "");
                  reader.onerror = () => setLogoError("Could not read this logo image.");
                  reader.readAsDataURL(file);
                }} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />
                {logo && <button type="button" onClick={() => { setLogo(""); const input = document.getElementById("qr-logo") as HTMLInputElement | null; if (input) input.value = ""; }} className="text-sm font-medium text-blue-700 underline">Remove logo</button>}
              </div>
              <p className="mt-1 text-xs text-gray-500">PNG, JPG or WebP, up to 2 MB. The logo is added in the center; keep it small for reliable scanning.</p>
              {logoError && <p className="mt-1 text-sm text-red-700" role="alert">{logoError}</p>}
            </div>
            <p className="text-xs leading-5 text-gray-500">A four-module quiet zone is included around each code. Keep strong contrast for reliable scanning.</p>
          </section>
          <section className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7" aria-label="QR code preview">
            <h2 className="self-start text-lg font-bold text-gray-950">Preview</h2>
            <div className="my-6 flex aspect-square w-full max-w-[340px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5">
              {output ? (
                // The generated data URL is already a finished image and does not need Next's image optimization.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={output.png} alt="Generated QR code preview" className="h-full w-full object-contain" />
              ) : <div className="text-center text-gray-500"><QrCode className="mx-auto mb-3 text-gray-400" size={48} /><p className="text-sm">{loading ? "Generating QR code…" : "Your QR code will appear here"}</p></div>}
            </div>
            <div className="min-h-6 text-center text-sm" aria-live="polite">{error && <p className="text-red-700">{error}</p>}{loading && output && <p className="text-gray-500">Updating preview…</p>}</div>
            <div className="mt-auto grid w-full gap-3 sm:grid-cols-2">
              <button type="button" disabled={!output || loading} onClick={() => download("png")} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"><Download size={17} />Download PNG</button>
              <button type="button" disabled={!output || loading} onClick={() => download("svg")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"><Download size={17} />Download SVG</button>
            </div>
            <p className="mt-3 text-xs text-gray-500">Files are generated in your browser. Content is not uploaded.</p>
          </section>
        </div>
      </div>
    </main>
  );
}


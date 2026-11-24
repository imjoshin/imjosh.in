"use client";

export function PrintButton() {
  return <button type="button" className="pill px-5 py-3 text-[15px]" onClick={() => window.print()}>Save as PDF</button>;
}

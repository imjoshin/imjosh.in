"use client";

import { trackEvent } from "@/lib/analytics";

export function PrintButton() {
  return <button type="button" className="pill px-5 py-3 text-[15px]" onClick={() => { trackEvent("resume_print"); window.print(); }}>Save as PDF</button>;
}

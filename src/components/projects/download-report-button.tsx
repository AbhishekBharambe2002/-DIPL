"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DownloadReportButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function download(format: "pdf" | "excel") {
    // The endpoint sends Content-Disposition: attachment, so a plain anchor click
    // downloads the file without navigating away from this page.
    const a = document.createElement("a");
    a.href = `/api/projects/${projectId}/report/${format}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setOpen(false);
  }

  return (
    <div className="relative" ref={boxRef}>
      <Button variant="secondary" onClick={() => setOpen((o) => !o)}>
        <Download className="h-4 w-4" /> Download <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 card shadow-lift divide-y divide-paper-200 overflow-hidden">
          <button
            type="button"
            onClick={() => download("pdf")}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink-800 hover:bg-paper-100"
          >
            <FileText className="h-4 w-4 text-ink-400 shrink-0" /> Download as PDF
          </button>
          <button
            type="button"
            onClick={() => download("excel")}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink-800 hover:bg-paper-100"
          >
            <FileSpreadsheet className="h-4 w-4 text-ink-400 shrink-0" /> Download as Excel
          </button>
        </div>
      )}
    </div>
  );
}

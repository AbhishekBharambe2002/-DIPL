"use client";

import { FileBox } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Records"
        title="Documents"
        description="Drawings, certificates and paperwork linked to projects and sites."
      />
      <EmptyState
        icon={FileBox}
        title="Document management coming soon"
        description="Upload and manage project documents, drawings, certificates, and reports."
      />
    </div>
  );
}

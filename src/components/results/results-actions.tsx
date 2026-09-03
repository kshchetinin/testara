"use client";

import { useSearchParams } from "next/navigation";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResultsActions() {
  const searchParams = useSearchParams();

  return (
    <div className="no-print flex gap-2">
      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Печать
      </Button>
      <Button variant="outline" onClick={() => window.open(`/api/results/export?${searchParams.toString()}`, "_blank")}>
        <Download className="h-4 w-4" />
        Экспорт CSV
      </Button>
    </div>
  );
}

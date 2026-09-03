"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Option {
  id: string;
  name: string;
}

export function ResultsFilterBar({ groups, tests }: { groups: Option[]; tests: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) updateParam("search", search);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по студенту" className="pl-9" />
      </div>

      <Select className="w-auto min-w-40" value={searchParams.get("groupId") ?? ""} onChange={(e) => updateParam("groupId", e.target.value)}>
        <option value="">Все группы</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </Select>

      <Select className="w-auto min-w-48" value={searchParams.get("testId") ?? ""} onChange={(e) => updateParam("testId", e.target.value)}>
        <option value="">Все тесты</option>
        {tests.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>

      <Input type="date" className="w-auto" value={searchParams.get("dateFrom") ?? ""} onChange={(e) => updateParam("dateFrom", e.target.value)} />
      <span className="text-sm text-muted-foreground">—</span>
      <Input type="date" className="w-auto" value={searchParams.get("dateTo") ?? ""} onChange={(e) => updateParam("dateTo", e.target.value)} />
    </div>
  );
}

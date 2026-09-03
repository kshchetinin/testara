"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Option {
  id: string;
  name: string;
}

export function AssignmentsFilterBar({ groups, topics }: { groups: Option[]; topics: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={searchParams.get("onlyMine") === "1"} onChange={(e) => updateParam("onlyMine", e.target.checked ? "1" : "")} />
        Только мои назначения
      </label>

      <Select className="w-auto min-w-40" value={searchParams.get("status") ?? ""} onChange={(e) => updateParam("status", e.target.value)}>
        <option value="">Все статусы</option>
        <option value="ACTIVE">Активные</option>
        <option value="CLOSED">Закрытые</option>
      </Select>

      <Select className="w-auto min-w-40" value={searchParams.get("groupId") ?? ""} onChange={(e) => updateParam("groupId", e.target.value)}>
        <option value="">Все группы</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </Select>

      {topics.length > 0 && (
        <Select className="w-auto min-w-40" value={searchParams.get("topic") ?? ""} onChange={(e) => updateParam("topic", e.target.value)}>
          <option value="">Все темы</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}

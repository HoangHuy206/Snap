"use client";

import { useSearchParams } from "next/navigation";
import { MagicTreeStudio } from "@/components/MagicTreeStudio";
import { decodeMagicPayload } from "@/lib/magic-tree";

export function MagicTreeViewer() {
  const searchParams = useSearchParams();
  const token = searchParams.get("q");
  const decoded = decodeMagicPayload(token);

  return (
    <MagicTreeStudio
      key={token ?? "default"}
      initialConfig={decoded ?? undefined}
      compactViewer
    />
  );
}

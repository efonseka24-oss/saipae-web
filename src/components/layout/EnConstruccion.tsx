import { Construction } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";

export function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <div>
      <PageHeader titulo={titulo} />
      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Construction className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">
          Esta sección todavía no está implementada.
        </p>
      </Card>
    </div>
  );
}

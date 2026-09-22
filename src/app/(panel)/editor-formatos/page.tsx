import { PageHeader } from "@/components/layout/PageHeader";
import { EditorFormatosManager } from "@/components/formatos-editor/EditorFormatosManager";
import { listarPlantillas } from "@/lib/listarPlantillas";

export default async function EditorFormatosPage() {
  const plantillas = listarPlantillas();

  return (
    <div>
      <PageHeader
        titulo="Editor de Formatos"
        descripcion="Carga y reemplaza las plantillas .docx usadas por Generar Formatos, y revisa qué marcadores tiene cada una."
      />
      <EditorFormatosManager plantillasIniciales={plantillas} />
    </div>
  );
}

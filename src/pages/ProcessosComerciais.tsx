// 🔒 LOCKED — Visual oficial do módulo Processos Comerciais (GROW OS).
// Layout 100% definido em /public/processos-comerciais.html (mockup Claude artifact).
// NÃO substituir por componentes React antigos. Para alterações visuais,
// edite somente public/processos-comerciais.html.
export default function ProcessosComerciais() {
  return (
    <div className="relative h-full min-h-full">
      <iframe
        src="/processos-comerciais.html"
        title="Processos Comerciais"
        className="absolute inset-0 w-full h-full border-none"
      />
    </div>
  );
}

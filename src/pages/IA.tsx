// 🔒 LOCKED — Visual oficial do módulo Automação & IA (GROW OS).
// NÃO substituir por componentes React antigos nem alterar a estrutura iframe.
// Qualquer ajuste visual deve ser feito EXCLUSIVAMENTE em public/automacao.html.
// Regressões para a versão anterior são proibidas.
const IA = () => {
  return (
    <div className="h-full w-full min-h-screen bg-background flex flex-col">
      <iframe
        title="Automação & IA"
        src="/automacao.html"
        style={{
          width: "100%",
          minHeight: "calc(100vh - 80px)",
          height: "100%",
          border: "0",
          background: "#070b12",
        }}
      />
    </div>
  );
};

export default IA;

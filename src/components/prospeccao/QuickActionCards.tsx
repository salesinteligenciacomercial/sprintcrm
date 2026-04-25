import { Plus, UserPlus, FileText, Download, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Action {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  accent: string;
  iconBg: string;
}

interface Props {
  onRegister: () => void;
  onInteraction: () => void;
  onScripts: () => void;
  onExport: () => void;
}

/**
 * Cards grandes coloridos como atalhos visuais de ação.
 * Substitui os botões pequenos do header por uma grade óbvia e clicável.
 */
export function QuickActionCards({ onRegister, onInteraction, onScripts, onExport }: Props) {
  const actions: Action[] = [
    {
      key: "register",
      label: "Registrar",
      description: "Adicionar novo registro diário",
      icon: Plus,
      onClick: onRegister,
      accent: "from-primary/15 to-primary/5 hover:from-primary/25 border-primary/30",
      iconBg: "bg-primary text-primary-foreground",
    },
    {
      key: "interaction",
      label: "Interação",
      description: "Logar contato com lead",
      icon: UserPlus,
      onClick: onInteraction,
      accent: "from-cyan-500/15 to-cyan-500/5 hover:from-cyan-500/25 border-cyan-500/30",
      iconBg: "bg-cyan-500 text-white",
    },
    {
      key: "scripts",
      label: "Scripts",
      description: "Biblioteca de roteiros prontos",
      icon: FileText,
      onClick: onScripts,
      accent: "from-purple-500/15 to-purple-500/5 hover:from-purple-500/25 border-purple-500/30",
      iconBg: "bg-purple-500 text-white",
    },
    {
      key: "export",
      label: "Exportar CSV",
      description: "Baixar dados do período",
      icon: Download,
      onClick: onExport,
      accent: "from-emerald-500/15 to-emerald-500/5 hover:from-emerald-500/25 border-emerald-500/30",
      iconBg: "bg-emerald-500 text-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.key}
            onClick={a.onClick}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-4 text-left",
              "bg-gradient-to-br transition-all duration-300",
              "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
              a.accent
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "p-2.5 rounded-lg shadow-sm transition-transform group-hover:scale-110",
                  a.iconBg
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{a.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {a.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

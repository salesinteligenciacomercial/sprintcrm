import { useLeaderboard } from "@/hooks/useLeaderboard";
import { Trophy, Crown, Medal, Award, Flame, Zap } from "lucide-react";
import { ClassAvatar } from "./ClassAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface Props {
  companyId: string | null;
  currentUserId: string | null;
}

interface RowExt {
  user_id: string;
  full_name: string;
  level: number;
  xp_total: number;
  streak_days: number;
  coins: number;
  player_class?: string;
}

export function ArenaTopBar({ companyId, currentUserId }: Props) {
  const { data: rows = [], isLoading } = useLeaderboard(companyId, 50);
  const [classes, setClasses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!companyId || rows.length === 0) return;
    (async () => {
      const ids = rows.map((r) => r.user_id);
      const { data } = await supabase
        .from("prospecting_player_profile")
        .select("user_id, class")
        .in("user_id", ids)
        .eq("company_id", companyId);
      if (data) setClasses(Object.fromEntries(data.map((d: any) => [d.user_id, d.class])));
    })();
  }, [companyId, rows.length]);

  const top3 = rows.slice(0, 3) as RowExt[];
  const myIndex = rows.findIndex((r) => r.user_id === currentUserId);
  const me = myIndex >= 0 ? rows[myIndex] : null;

  if (isLoading) return <div className="h-32 rpg-card rounded-lg animate-pulse" />;
  if (top3.length === 0) return null;

  const PODIUM = [
    { icon: Crown, color: "text-yellow-400", cls: "rpg-podium-1", label: "#1" },
    { icon: Medal, color: "text-slate-300", cls: "rpg-podium-2", label: "#2" },
    { icon: Award, color: "text-amber-600", cls: "rpg-podium-3", label: "#3" },
  ];

  return (
    <div className="rpg-card rpg-hex-bg rounded-lg p-4 relative overflow-hidden rpg-scanline">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="rpg-text-mono uppercase tracking-widest text-sm text-amber-400">Arena Semanal · Top Operadores</h3>
        </div>
        {me && (
          <div className="rpg-text-mono text-xs flex items-center gap-2 px-3 py-1.5 rounded border border-cyan-500/40 bg-cyan-500/5 rpg-glow-cyan">
            <span className="text-muted-foreground">SUA POSIÇÃO</span>
            <span className="rpg-neon-cyan font-bold text-base">#{myIndex + 1}</span>
            <span className="text-muted-foreground">de</span>
            <span className="text-foreground">{rows.length}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {top3.map((r, i) => {
          const P = PODIUM[i];
          const Icon = P.icon;
          const isMe = r.user_id === currentUserId;
          return (
            <div
              key={r.user_id}
              className={`${P.cls} rounded-lg p-3 flex items-center gap-3 relative ${isMe ? "rpg-pulse" : ""}`}
            >
              <Icon className={`absolute top-2 right-2 w-4 h-4 ${P.color}`} />
              <ClassAvatar
                name={r.full_name}
                playerClass={classes[r.user_id]}
                size="lg"
                level={r.level}
                online
              />
              <div className="flex-1 min-w-0 ml-2">
                <div className="flex items-baseline gap-2">
                  <span className={`rpg-text-mono text-xs font-bold ${P.color}`}>{P.label}</span>
                  {isMe && <span className="rpg-text-mono text-[9px] rpg-neon-cyan">[VOCÊ]</span>}
                </div>
                <div className="text-sm font-semibold truncate text-foreground">{r.full_name}</div>
                <div className="flex items-center gap-3 mt-1 rpg-text-mono text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-cyan-400" />{r.xp_total.toLocaleString()}</span>
                  {r.streak_days > 0 && (
                    <span className="flex items-center gap-1 text-orange-400"><Flame className="w-3 h-3" />{r.streak_days}d</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

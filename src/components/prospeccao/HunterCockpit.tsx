import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Flame, Trophy, Zap, Target, TrendingUp, TrendingDown, Crown, Medal, Award, Sparkles, Phone, MessageSquare, CalendarCheck, Repeat, ChevronRight, Coins, Bell, Rocket } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClassAvatar } from "./rpg/ClassAvatar";
import { usePlayerProfile, xpNeededForLevel, getRankByLevel } from "@/hooks/usePlayerProfile";
import { useDailyFocus } from "@/hooks/useDailyFocus";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAchievements, ALL_ACHIEVEMENTS } from "@/hooks/useAchievements";

const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

const LEVEL_TIERS = [
  { min: 1,  name: "Rookie SDR",       icon: "🌱", grad: "from-slate-500 to-slate-700" },
  { min: 5,  name: "Hunter SDR",       icon: "⚡", grad: "from-cyan-500 to-blue-600" },
  { min: 15, name: "Elite Hunter",     icon: "🔥", grad: "from-orange-500 to-red-600" },
  { min: 30, name: "Growth Hunter",    icon: "🚀", grad: "from-purple-500 to-fuchsia-600" },
  { min: 50, name: "Revenue Operator", icon: "👑", grad: "from-amber-400 to-yellow-600" },
  { min: 75, name: "Master Closer",    icon: "💎", grad: "from-emerald-400 to-teal-600" },
];

function tierFor(level: number) {
  let t = LEVEL_TIERS[0];
  for (const x of LEVEL_TIERS) if (level >= x.min) t = x;
  return t;
}

const MISSION_ICON: Record<string, any> = {
  calls: Phone,
  responses: MessageSquare,
  meetings_scheduled: CalendarCheck,
  leads_prospected: Target,
  prospections_fallback: Target,
  opportunities: Sparkles,
  sales_closed: Trophy,
  gross_value: Coins,
};

const MISSION_XP: Record<string, number> = {
  calls: 5,
  responses: 10,
  meetings_scheduled: 40,
  leads_prospected: 5,
  prospections_fallback: 5,
  opportunities: 15,
  sales_closed: 150,
  gross_value: 0,
};

export function HunterCockpit() {
  const { data: profile } = usePlayerProfile();
  const { companyId, userId } = usePlayerProfile();
  const focus = useDailyFocus();
  const { data: leaderboard = [] } = useLeaderboard(companyId, 10);
  const { data: achievements = [] } = useAchievements(userId);

  const tier = profile ? tierFor(profile.level) : LEVEL_TIERS[0];
  const rank = profile ? getRankByLevel(profile.level) : null;
  const needed = profile ? xpNeededForLevel(profile.level) : 100;
  const lvlPct = profile ? Math.min(100, Math.round((profile.xp_current / needed) * 100)) : 0;
  const myEntry = leaderboard.find((l) => l.user_id === userId);
  const myIdx = leaderboard.findIndex((l) => l.user_id === userId);

  const dynamicMessage = useMemo(() => {
    if (!focus.metrics.length) return "Configure suas metas para começar a operação.";
    const top = focus.metrics.find((m) => m.progress_pct < 100);
    if (!top) return "🎯 Você bateu todas as metas do dia. Continue caçando.";
    const gap = top.target - top.current;
    return `Faltam ${gap} ${top.label.toLowerCase()} para bater sua meta.`;
  }, [focus]);

  const alerts = useMemo(() => {
    const a: { tone: "up" | "down" | "info"; text: string }[] = [];
    if (focus.posicao === 1) a.push({ tone: "up", text: "🥇 Você é o #1 da equipe hoje" });
    else if (focus.posicao && focus.proximo_acima) {
      a.push({ tone: "info", text: `⚡ ${focus.xp_para_subir} pts para passar ${focus.proximo_acima.full_name}` });
    }
    if (focus.overall_progress_pct >= 80) a.push({ tone: "up", text: `🚀 Ritmo elite — ${focus.overall_progress_pct}% da meta` });
    else if (focus.overall_progress_pct < 30 && focus.metrics.length > 0)
      a.push({ tone: "down", text: `⚠️ Ritmo abaixo do esperado (${focus.overall_progress_pct}%)` });
    if (profile?.streak_days && profile.streak_days >= 3)
      a.push({ tone: "up", text: `🔥 ${profile.streak_days} dias seguidos em operação` });
    if (focus.perda_estimada_hoje > 0)
      a.push({ tone: "down", text: `💸 Perda estimada hoje: ${money(focus.perda_estimada_hoje)}` });
    return a.slice(0, 4);
  }, [focus, profile]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const recent = achievements.filter((a) => a.unlocked).slice(0, 6);
  const next = achievements.filter((a) => !a.unlocked).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* HERO HEADER — cockpit premium */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background via-background to-primary/5 p-5 md:p-6 shadow-lg">
        <div className={`absolute inset-0 bg-gradient-to-br ${tier.grad} opacity-[0.08] pointer-events-none`} />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-5">
          <div className="relative shrink-0">
            <div className={`absolute -inset-1 rounded-full bg-gradient-to-br ${tier.grad} blur-md opacity-60`} />
            <div className="relative">
              <ClassAvatar name={profile?.title || "Hunter"} playerClass={profile?.class} size="xl" level={profile?.level} online />
            </div>
          </div>

          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r ${tier.grad} shadow-lg`}>
                {tier.icon} {tier.name}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-semibold text-primary">Lv. {profile?.level ?? 1}</span>
              {rank && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${rank.className}`}>
                  {rank.name}
                </span>
              )}
              {profile && profile.streak_days > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-500/15 border border-orange-500/40 text-orange-500 text-xs font-bold">
                  <Flame className="w-3.5 h-3.5" /> {profile.streak_days} dias
                </span>
              )}
            </div>

            <h2 className="mt-1 text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              {profile?.title || "Hunter Iniciante"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{dynamicMessage}</p>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatPill icon={<Zap className="w-3.5 h-3.5" />} label="XP total" value={(profile?.xp_total ?? 0).toLocaleString()} accent="text-cyan-400" />
              <StatPill icon={<Coins className="w-3.5 h-3.5" />} label="Moedas" value={(profile?.coins ?? 0).toLocaleString()} accent="text-amber-400" />
              <StatPill icon={<Trophy className="w-3.5 h-3.5" />} label="Conquistas" value={`${unlockedCount}/${ALL_ACHIEVEMENTS.length}`} accent="text-emerald-400" />
              <StatPill
                icon={<Crown className="w-3.5 h-3.5" />}
                label="Posição"
                value={focus.posicao ? `#${focus.posicao}` : "—"}
                accent={focus.posicao === 1 ? "text-amber-400" : "text-purple-400"}
              />
            </div>

            {/* Barra XP */}
            <div className="mt-4">
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-muted-foreground font-medium uppercase tracking-wide">Progresso do nível</span>
                <span className="text-foreground font-mono font-semibold">
                  {(profile?.xp_current ?? 0).toLocaleString()} / {needed.toLocaleString()} XP
                </span>
              </div>
              <div className="relative h-2.5 bg-muted/40 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${tier.grad} transition-all duration-700 shadow-[0_0_12px_rgba(255,255,255,0.3)]`}
                  style={{ width: `${lvlPct}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
              </div>
            </div>

            {/* Meta global do dia */}
            {focus.metrics.length > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                    <Target className="w-3 h-3" /> Meta do dia
                  </span>
                  <span className="text-primary font-bold">{focus.overall_progress_pct}%</span>
                </div>
                <Progress value={focus.overall_progress_pct} className="h-2" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GRID PRINCIPAL: Missões + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* MISSÕES DO DIA */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Missões do Dia</h3>
                <p className="text-[11px] text-muted-foreground">Cada ação acumula XP — mantenha o ritmo</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {focus.metrics.filter((m) => m.progress_pct >= 100).length}/{focus.metrics.length} completas
            </Badge>
          </div>

          {focus.metrics.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Rocket className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Configure metas comerciais para liberar suas missões.
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link to="/configuracoes/comercial">Configurar metas</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {focus.metrics.map((m) => {
                const Icon = MISSION_ICON[m.metric] || Target;
                const xp = MISSION_XP[m.metric] ?? 10;
                const done = m.progress_pct >= 100;
                return (
                  <div
                    key={m.metric}
                    className={`relative overflow-hidden rounded-xl border p-3.5 transition-all hover:shadow-md ${
                      done
                        ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    {done && (
                      <div className="absolute top-1.5 right-1.5">
                        <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/40 text-[9px] font-bold">
                          <Sparkles className="w-2.5 h-2.5 mr-0.5" /> COMPLETA
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-start gap-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        done ? "bg-emerald-500/20 text-emerald-500" : "bg-primary/10 text-primary"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-foreground">{m.label}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {m.current} / {m.target}
                          {xp > 0 && <span className="ml-1.5 text-cyan-400 font-bold">+{xp} XP</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <div className="relative h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                            done ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-primary to-primary/70"
                          }`}
                          style={{ width: `${m.progress_pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[9px]">
                        <span className="text-muted-foreground">{m.progress_pct}%</span>
                        <span className={done ? "text-emerald-500 font-bold" : "text-muted-foreground"}>
                          {done ? "✓ Concluída" : `Faltam ${Math.max(0, m.target - m.current)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RANKING PÓDIO */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-600/5 flex items-center justify-center border border-amber-500/30">
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Arena Hunter</h3>
                <p className="text-[11px] text-muted-foreground">Ranking ao vivo da equipe</p>
              </div>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">Nenhum hunter no ranking ainda.</div>
          ) : (
            <>
              {/* Pódio top 3 */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[1, 0, 2].map((podiumIdx) => {
                  const r = leaderboard[podiumIdx];
                  if (!r) return <div key={podiumIdx} />;
                  const isMe = r.user_id === userId;
                  const heights = [0, "h-20", "h-16", "h-12"];
                  const colors = ["", "from-amber-400 to-yellow-600", "from-slate-300 to-slate-500", "from-orange-500 to-orange-700"];
                  const realPos = podiumIdx + 1;
                  const Icon = realPos === 1 ? Crown : realPos === 2 ? Medal : Award;
                  return (
                    <div key={r.user_id} className="flex flex-col items-center">
                      <div className={`relative ${isMe ? "ring-2 ring-primary rounded-full" : ""}`}>
                        <ClassAvatar name={r.full_name} size="sm" />
                        <Icon className={`absolute -top-2 -right-1 w-3.5 h-3.5 ${realPos === 1 ? "text-amber-400" : realPos === 2 ? "text-slate-300" : "text-orange-500"}`} />
                      </div>
                      <div className="text-[10px] font-semibold mt-1 text-center truncate max-w-full px-1">{r.full_name.split(" ")[0]}</div>
                      <div className="text-[9px] text-muted-foreground">{r.xp_total.toLocaleString()}</div>
                      <div className={`w-full mt-1 rounded-t ${heights[realPos]} bg-gradient-to-t ${colors[realPos]} flex items-start justify-center pt-1`}>
                        <span className="text-white text-[10px] font-bold">#{realPos}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Lista 4-10 */}
              <div className="space-y-1 border-t border-border pt-2">
                {leaderboard.slice(3, 8).map((r, i) => {
                  const isMe = r.user_id === userId;
                  return (
                    <div key={r.user_id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs ${isMe ? "bg-primary/10 border border-primary/30" : "hover:bg-accent/30"}`}>
                      <span className="w-5 text-[10px] font-mono text-muted-foreground">#{i + 4}</span>
                      <span className="flex-1 truncate font-medium">{r.full_name} {isMe && <span className="text-primary text-[9px]">(você)</span>}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{r.xp_total.toLocaleString()}</span>
                      {r.streak_days > 0 && (
                        <span className="text-orange-500 text-[10px] flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5" />{r.streak_days}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {myIdx >= 8 && myEntry && (
                <div className="mt-2 px-2 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-xs flex items-center gap-2">
                  <span className="w-5 text-[10px] font-mono text-primary">#{myIdx + 1}</span>
                  <span className="flex-1 truncate font-medium">{myEntry.full_name} <span className="text-primary text-[9px]">(você)</span></span>
                  <span className="font-mono text-[10px]">{myEntry.xp_total.toLocaleString()}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CONQUISTAS + ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conquistas */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-fuchsia-600/5 flex items-center justify-center border border-purple-500/30">
                <Award className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Conquistas</h3>
                <p className="text-[11px] text-muted-foreground">{unlockedCount} de {ALL_ACHIEVEMENTS.length} desbloqueadas</p>
              </div>
            </div>
            <Progress value={(unlockedCount / ALL_ACHIEVEMENTS.length) * 100} className="w-24 h-1.5" />
          </div>

          {recent.length > 0 && (
            <>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Desbloqueadas</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                {recent.map((a) => (
                  <div
                    key={a.code}
                    title={`${a.name} — ${a.description}`}
                    className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-1.5 cursor-help transition hover:scale-105 ${
                      a.rarity === "legendary"
                        ? "border-amber-400 bg-gradient-to-br from-amber-400/20 to-yellow-600/10 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                        : a.rarity === "epic"
                        ? "border-purple-400 bg-gradient-to-br from-purple-400/20 to-fuchsia-600/10"
                        : a.rarity === "rare"
                        ? "border-cyan-400 bg-gradient-to-br from-cyan-400/20 to-blue-600/10"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="text-2xl">{a.icon}</div>
                    <div className="text-[8px] font-bold text-center mt-0.5 truncate w-full">{a.name}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {next.length > 0 && (
            <>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Próximas</div>
              <div className="space-y-1.5">
                {next.map((a) => (
                  <div key={a.code} className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-border bg-muted/20">
                    <div className="text-xl opacity-40 grayscale">{a.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-muted-foreground">{a.name}</div>
                      <div className="text-[10px] text-muted-foreground/70 truncate">{a.description}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Central de Alertas */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/5 flex items-center justify-center border border-cyan-500/30">
              <Bell className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Central de Alertas</h3>
              <p className="text-[11px] text-muted-foreground">Sinais inteligentes em tempo real</p>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">Tudo no eixo. Continue caçando.</div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => {
                const Icon = a.tone === "up" ? TrendingUp : a.tone === "down" ? TrendingDown : Zap;
                const cls =
                  a.tone === "up"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                    : a.tone === "down"
                    ? "border-red-500/40 bg-red-500/10 text-red-500"
                    : "border-cyan-500/40 bg-cyan-500/10 text-cyan-400";
                return (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border ${cls}`}>
                    <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span className="text-xs font-medium leading-snug">{a.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* TRILHA DE NÍVEIS */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <Rocket className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Trilha de Carreira Hunter</h3>
            <p className="text-[11px] text-muted-foreground">Evolua de Rookie até Master Closer</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {LEVEL_TIERS.map((t, i) => {
            const reached = (profile?.level ?? 1) >= t.min;
            const current = tier.min === t.min;
            return (
              <div
                key={t.name}
                className={`relative rounded-xl border-2 p-3 text-center transition ${
                  current
                    ? "border-primary shadow-lg ring-2 ring-primary/30"
                    : reached
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border bg-muted/20 opacity-60"
                }`}
              >
                <div className={`text-2xl mb-1 ${!reached && "grayscale opacity-50"}`}>{t.icon}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide">{t.name}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Nível {t.min}+</div>
                {current && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[8px] px-1.5">
                    AQUI
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 backdrop-blur px-3 py-2">
      <div className={`flex items-center gap-1 ${accent}`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="text-lg font-bold text-foreground mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { useAchievements, ALL_ACHIEVEMENTS } from "@/hooks/useAchievements";
import { PlayerHeaderCard } from "@/components/prospeccao/rpg/PlayerHeaderCard";
import { QuestBoard } from "@/components/prospeccao/rpg/QuestBoard";
import { WeeklyLeaderboard } from "@/components/prospeccao/rpg/WeeklyLeaderboard";
import { AchievementsGallery } from "@/components/prospeccao/rpg/AchievementsGallery";
import { RankLadder } from "@/components/prospeccao/rpg/RankLadder";
import { RewardShop } from "@/components/prospeccao/rpg/RewardShop";
import { Card } from "@/components/ui/card";
import { Trophy, Sparkles, Target, Coins, Flame, Award } from "lucide-react";
import { toast } from "sonner";

const RARITY_STYLE: Record<string, string> = {
  common: "border-slate-400/60 bg-slate-500/5",
  rare: "border-blue-400/60 bg-blue-500/5",
  epic: "border-purple-400/60 bg-purple-500/5",
  legendary: "border-amber-400/60 bg-amber-500/5",
};

export default function Gamificacao() {
  const { data: profile, userId, companyId } = usePlayerProfile();
  const { data: achievements = [] } = useAchievements(userId);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRanks, setShowRanks] = useState(false);

  const lastLevel = useRef<number | null>(null);
  const lastXp = useRef<number | null>(null);
  useEffect(() => {
    if (!profile) return;
    if (lastLevel.current !== null && profile.level > lastLevel.current) {
      toast.success(`🎉 Você subiu para o Nível ${profile.level}!`, {
        description: "Continue assim — sua evolução está sendo registrada.",
      });
    }
    if (lastXp.current !== null && profile.xp_total > lastXp.current) {
      const diff = profile.xp_total - lastXp.current;
      if (diff > 0 && diff < 500) {
        toast.success(`+${diff} XP`, { description: "Recompensa registrada." });
      }
    }
    lastLevel.current = profile.level;
    lastXp.current = profile.xp_total;
  }, [profile?.level, profile?.xp_total]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalAchievements = ALL_ACHIEVEMENTS.length;

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="h-7 w-7 text-primary" />
            Gamificação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sua carreira comercial, conquistas, missões e ranking em um só lugar.
          </p>
        </div>
      </header>

      <PlayerHeaderCard
        profile={profile}
        onShowAchievements={() => setShowAchievements(true)}
        onShowRanks={() => setShowRanks(true)}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Target} label="XP Total" value={profile?.xp_total ?? 0} color="text-primary" />
        <StatCard icon={Flame} label="Streak" value={`${profile?.streak_days ?? 0}d`} color="text-orange-500" />
        <StatCard icon={Coins} label="Moedas" value={profile?.coins ?? 0} color="text-amber-500" />
        <StatCard icon={Award} label="Conquistas" value={`${unlockedCount}/${totalAchievements}`} color="text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <SectionTitle icon={Target} title="Missões Ativas" subtitle="Daily, semanais e mensais" />
          <QuestBoard userId={userId} companyId={companyId} />

          <SectionTitle icon={Award} title="Mural de Conquistas" subtitle={`${unlockedCount} de ${totalAchievements} desbloqueadas`} />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {achievements.map((a) => (
              <Card
                key={a.code}
                className={`p-4 border-2 transition-all ${
                  a.unlocked ? RARITY_STYLE[a.rarity] : "border-border opacity-40 grayscale"
                }`}
              >
                <div className="text-3xl mb-2">{a.icon}</div>
                <div className="text-sm font-semibold text-foreground leading-tight">{a.name}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-snug">{a.description}</div>
                <div className="mt-2 text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                  {a.rarity}
                </div>
              </Card>
            ))}
          </div>

          <SectionTitle icon={Coins} title="Loja de Recompensas" subtitle="Troque suas moedas" />
          <RewardShop companyId={companyId} userCoins={profile?.coins ?? 0} />
        </section>

        <aside className="space-y-6">
          <SectionTitle icon={Trophy} title="Ranking da Equipe" subtitle="Top 10 por XP" />
          <WeeklyLeaderboard companyId={companyId} currentUserId={userId} />
        </aside>
      </div>

      <AchievementsGallery open={showAchievements} onOpenChange={setShowAchievements} userId={userId} />
      <RankLadder open={showRanks} onOpenChange={setShowRanks} currentLevel={profile?.level ?? 1} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-muted ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-bold text-foreground">{value}</div>
      </div>
    </Card>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between border-b border-border pb-2">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </div>
  );
}

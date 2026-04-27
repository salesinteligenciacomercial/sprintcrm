import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Calculator, Target, Sparkles } from "lucide-react";
import { ICPBuilder } from "./ICPBuilder";
import { SalesMachineCalculator } from "./SalesMachineCalculator";
import { LeadScorePanel } from "./LeadScorePanel";
import { Badge } from "@/components/ui/badge";

export function ProspectingIntelligencePanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground gap-1">
          <Sparkles className="h-3 w-3" /> Sales Intelligence
        </Badge>
        <span className="text-sm text-muted-foreground">Camada de inteligência embutida na Prospecção</span>
      </div>

      <Tabs defaultValue="leads" className="space-y-3">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="leads" className="gap-1"><Brain className="h-3.5 w-3.5" /> Lead Score</TabsTrigger>
          <TabsTrigger value="icp" className="gap-1"><Target className="h-3.5 w-3.5" /> ICP</TabsTrigger>
          <TabsTrigger value="machine" className="gap-1"><Calculator className="h-3.5 w-3.5" /> Máquina</TabsTrigger>
        </TabsList>
        <TabsContent value="leads"><LeadScorePanel /></TabsContent>
        <TabsContent value="icp"><ICPBuilder /></TabsContent>
        <TabsContent value="machine"><SalesMachineCalculator /></TabsContent>
      </Tabs>
    </div>
  );
}

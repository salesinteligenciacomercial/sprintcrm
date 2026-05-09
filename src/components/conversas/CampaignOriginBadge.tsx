import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Megaphone, Globe, Instagram, MessageCircle } from "lucide-react";

interface Props {
  lead?: {
    campaign_id?: string | null;
    utm_campaign?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    ad_creative_name?: string | null;
    lead_source_type?: string | null;
    source?: string | null;
  } | null;
}

export function CampaignOriginBadge({ lead }: Props) {
  if (!lead) return null;

  const campaignName = lead.utm_campaign || lead.ad_creative_name || lead.campaign_id;
  const sourceType = lead.lead_source_type || lead.utm_source || lead.source;

  if (!campaignName && !sourceType) return null;

  const isCtwa = lead.lead_source_type === "ctwa" || lead.utm_medium === "ctwa";
  const isMeta = (lead.utm_source || "").toLowerCase().includes("facebook") || (lead.utm_source || "").toLowerCase().includes("meta") || isCtwa;
  const isInstagram = (lead.utm_source || "").toLowerCase().includes("instagram");

  const Icon = isInstagram ? Instagram : isCtwa ? MessageCircle : isMeta ? Megaphone : Globe;
  const label = campaignName || sourceType || "Campanha";
  const display = label.length > 28 ? label.slice(0, 28) + "…" : label;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 text-[10px] py-0 px-1.5 h-4 border-primary/40 text-primary flex-shrink-0">
            <Icon className="h-2.5 w-2.5" />
            <span className="truncate max-w-[140px]">{display}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs space-y-1 text-xs">
          <div className="font-semibold">Origem do lead</div>
          {campaignName && <div><span className="text-muted-foreground">Campanha:</span> {campaignName}</div>}
          {lead.ad_creative_name && <div><span className="text-muted-foreground">Anúncio:</span> {lead.ad_creative_name}</div>}
          {lead.utm_source && <div><span className="text-muted-foreground">Fonte:</span> {lead.utm_source}</div>}
          {lead.utm_medium && <div><span className="text-muted-foreground">Meio:</span> {lead.utm_medium}</div>}
          {isCtwa && <div className="text-emerald-500">Click-to-WhatsApp</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

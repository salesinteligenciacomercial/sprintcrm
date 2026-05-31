import React, { useState } from "react";
import { Phone, Target } from "lucide-react";
import { ChannelProspectPanel } from "@/components/prospeccao/channels/ChannelProspectPanel";

const CallCenterPreview = () => {
  const [view, setView] = useState<"call" | "cold">("call");

  return (
    <div className="h-full w-full min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border bg-background">
        <button
          onClick={() => setView("call")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            view === "call"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          <Phone className="w-4 h-4" /> Call Center
        </button>
        <button
          onClick={() => setView("cold")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            view === "cold"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          <Target className="w-4 h-4" /> Cold Call
        </button>
      </div>

      {view === "call" ? (
        <iframe
          title="Call Center Preview"
          src="/call-center.html"
          style={{
            width: "100%",
            minHeight: "calc(100vh - 120px)",
            height: "100%",
            border: "0",
            background: "#0a0c0f",
          }}
        />
      ) : (
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <ChannelProspectPanel channel="coldcall" />
        </div>
      )}
    </div>
  );
};

export default CallCenterPreview;

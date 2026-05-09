import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { useFollowUpFunnel, FollowUpStage } from "@/hooks/useFollowUpFunnel";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PRESET_COLORS = ["#94A3B8", "#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

export function StageManagerDialog({ open, onOpenChange }: Props) {
  const { stages, addStage, updateStage, deleteStage } = useFollowUpFunnel();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#22C55E");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addStage.mutateAsync({ name: newName.trim(), color: newColor });
    setNewName("");
  };

  const handleToggleTerminal = (s: FollowUpStage, val: boolean) => {
    updateStage.mutate({
      id: s.id,
      is_terminal: val,
      terminal_status: val ? (s.terminal_status || "completed") : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar etapas do Funil de Follow-up</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {stages.map((s) => (
            <div key={s.id} className="flex items-center gap-2 p-3 border rounded-md bg-card">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <input
                type="color"
                value={s.color}
                onChange={(e) => updateStage.mutate({ id: s.id, color: e.target.value })}
                className="h-8 w-8 rounded border cursor-pointer"
              />
              <Input
                value={s.name}
                onChange={(e) => updateStage.mutate({ id: s.id, name: e.target.value })}
                className="flex-1"
              />
              <div className="flex items-center gap-2 text-xs">
                <Label htmlFor={`term-${s.id}`} className="whitespace-nowrap">Terminal</Label>
                <Switch
                  id={`term-${s.id}`}
                  checked={s.is_terminal}
                  onCheckedChange={(v) => handleToggleTerminal(s, v)}
                />
              </div>
              {s.is_terminal && (
                <select
                  value={s.terminal_status || "completed"}
                  onChange={(e) => updateStage.mutate({ id: s.id, terminal_status: e.target.value as any })}
                  className="text-xs border rounded px-2 py-1 bg-background"
                >
                  <option value="completed">Ganho</option>
                  <option value="lost">Perdido</option>
                </select>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm(`Excluir etapa "${s.name}"?`)) deleteStage.mutate(s.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 mt-4 space-y-2">
          <Label>Adicionar nova etapa</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-10 w-10 rounded border cursor-pointer"
            />
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da etapa"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={!newName.trim() || addStage.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
          <div className="flex gap-1 flex-wrap pt-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className="h-6 w-6 rounded-full border-2"
                style={{ backgroundColor: c, borderColor: newColor === c ? "hsl(var(--foreground))" : "transparent" }}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

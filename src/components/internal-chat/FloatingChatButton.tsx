import { useState, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChatDrawer } from './ChatDrawer';
import { useInternalChat } from '@/hooks/useInternalChat';

export const FloatingChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { getTotalUnread } = useInternalChat();
  const totalUnread = getTotalUnread();

  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const hasMoved = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    hasMoved.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const deltaX = dragStartRef.current.x - e.clientX;
    const deltaY = dragStartRef.current.y - e.clientY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      hasMoved.current = true;
    }
    const newX = Math.max(0, Math.min(window.innerWidth - 60, dragStartRef.current.posX + deltaX));
    const newY = Math.max(0, Math.min(window.innerHeight - 60, dragStartRef.current.posY + deltaY));
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleClick = useCallback(() => {
    if (!hasMoved.current) {
      setIsOpen(true);
    }
  }, []);

  return (
    <>
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        className={`fixed z-50 h-[56px] w-[56px] rounded-full flex items-center justify-center touch-none select-none ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'}`}
        style={{
          right: `${position.x}px`,
          bottom: `${position.y}px`,
          transition: isDragging ? 'none' : 'transform 0.2s',
          background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C33 100%)',
          boxShadow: '0 4px 14px rgba(255, 107, 0, 0.4)',
        }}
      >
        {/* Grid de 9 pontos estilo Nvoip */}
        <div className="grid grid-cols-3 gap-[5px]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-[5px] w-[5px] rounded-full bg-white/90"
            />
          ))}
        </div>

        {totalUnread > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground"
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
        )}
      </button>

      <ChatDrawer open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};

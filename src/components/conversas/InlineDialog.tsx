import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * InlineDialog — API equivalente ao shadcn/ui Dialog mas SEM portal/overlay.
 * Renderiza o conteúdo inline (como filho na árvore atual), ideal para abrir
 * "popups" dentro de um painel lateral sem extrapolar.
 *
 * Suporta tanto modo controlado (open/onOpenChange) quanto não-controlado
 * (via InlineDialogTrigger asChild).
 */

interface InlineDialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const InlineDialogContext = React.createContext<InlineDialogContextValue | null>(null);

function useInlineDialog() {
  const ctx = React.useContext(InlineDialogContext);
  if (!ctx) throw new Error("InlineDialog subcomponents must be used inside <InlineDialog>");
  return ctx;
}

export interface InlineDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function InlineDialog({ open: openProp, defaultOpen = false, onOpenChange, children }: InlineDialogProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? !!openProp : uncontrolled;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  return (
    <InlineDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </InlineDialogContext.Provider>
  );
}

interface InlineDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const InlineDialogTrigger = React.forwardRef<HTMLButtonElement, InlineDialogTriggerProps>(
  ({ asChild, onClick, children, ...props }, ref) => {
    const { open, setOpen } = useInlineDialog();
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e as any);
      if (!e.defaultPrevented) setOpen(!open);
    };
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        ref,
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          child.props.onClick?.(e);
          if (!e.defaultPrevented) setOpen(!open);
        },
      });
    }
    return (
      <button ref={ref} type="button" onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
InlineDialogTrigger.displayName = "InlineDialogTrigger";

export interface InlineDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showClose?: boolean;
}

export const InlineDialogContent = React.forwardRef<HTMLDivElement, InlineDialogContentProps>(
  ({ className, children, showClose = true, ...props }, ref) => {
    const { open, setOpen } = useInlineDialog();
    if (!open) return null;
    return (
      <div
        ref={ref}
        className={cn(
          "relative mt-2 w-full rounded-lg border border-border bg-muted/30 p-4 shadow-sm",
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 rounded-sm opacity-70 transition-opacity hover:opacity-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
InlineDialogContent.displayName = "InlineDialogContent";

export const InlineDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-3 flex flex-col space-y-1.5 pr-8", className)} {...props} />
);

export const InlineDialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-base font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
InlineDialogTitle.displayName = "InlineDialogTitle";

export const InlineDialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
);
InlineDialogDescription.displayName = "InlineDialogDescription";

export const InlineDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-3 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);

interface InlineDialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const InlineDialogClose = React.forwardRef<HTMLButtonElement, InlineDialogCloseProps>(
  ({ asChild, onClick, children, ...props }, ref) => {
    const { setOpen } = useInlineDialog();
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e as any);
      if (!e.defaultPrevented) setOpen(false);
    };
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        ref,
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          child.props.onClick?.(e);
          if (!e.defaultPrevented) setOpen(false);
        },
      });
    }
    return (
      <button ref={ref} type="button" onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
InlineDialogClose.displayName = "InlineDialogClose";

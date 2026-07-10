import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { registerDropZone, unregisterDropZone, subscribeDragBus } from "../../core/dropZones";
import "./BoardSlot.css";

export interface BoardSlotProps {
  id: string;
  accepts: (uid: string) => boolean;
  children?: ReactNode;
  label?: string;
}

/**
 * 盤面のカードスロット。ドラッグ中のカードが有効な移動先ならわずかに明るくなり(6.2)、
 * 近づくとスロット自体が広がってカードを迎えにいく(3.3)。
 */
export function BoardSlot({ id, accepts, children, label }: BoardSlotProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"idle" | "valid" | "over">("idle");

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const update = () => registerDropZone({ id, rect: el.getBoundingClientRect(), accepts });
    update();
    window.addEventListener("resize", update);
    const unsubscribe = subscribeDragBus((bus) => {
      if (!bus.active) {
        setState("idle");
        return;
      }
      if (bus.overZoneId === id) setState("over");
      else if (bus.validZoneIds.includes(id)) setState("valid");
      else setState("idle");
    });
    return () => {
      window.removeEventListener("resize", update);
      unregisterDropZone(id);
      unsubscribe();
    };
  }, [id, accepts]);

  return (
    <div ref={elRef} className={`board-slot board-slot--${state}`} data-slot-id={id}>
      {children ?? <span className="board-slot__label">{label}</span>}
    </div>
  );
}

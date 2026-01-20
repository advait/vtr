import React from "react";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";

export type ActionTrayProps = {
  ctrlArmed: boolean;
  onCtrlToggle: () => void;
  onSendKey: (key: string) => void;
};

const actionKeys = [
  { label: "Esc", key: "escape" },
  { label: "Tab", key: "tab" },
  { label: "↑", key: "up" },
  { label: "↓", key: "down" },
  { label: "←", key: "left" },
  { label: "→", key: "right" },
  { label: "PgUp", key: "pageup" },
  { label: "PgDn", key: "pagedown" }
];

export function ActionTray({ ctrlArmed, onCtrlToggle, onSendKey }: ActionTrayProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-10 w-12",
          ctrlArmed && "bg-tn-accent text-tn-bg"
        )}
        onClick={onCtrlToggle}
      >
        Ctrl
      </Button>
      {actionKeys.map((action) => (
        <Button
          key={action.key}
          variant="ghost"
          size="sm"
          className="h-10 w-12"
          onClick={() => onSendKey(action.key)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

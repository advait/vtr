import React, { useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

export type InputBarProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function InputBar({ onSend, disabled }: InputBarProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    if (!value.trim()) {
      return;
    }
    onSend(value + "\n");
    setValue("");
  };

  return (
    <div className="flex h-12 items-center gap-2 rounded-lg border border-tn-border bg-tn-panel px-3">
      <Input
        className="h-9 flex-1 bg-transparent px-2 text-sm"
        placeholder="Type a command…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
        disabled={disabled}
      />
      <Button size="sm" onClick={submit} disabled={disabled}>
        Send
      </Button>
    </div>
  );
}

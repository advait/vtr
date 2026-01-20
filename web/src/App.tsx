import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CoordinatorTree, CoordinatorInfo } from "./components/CoordinatorTree";
import { ActionTray } from "./components/ActionTray";
import { InputBar } from "./components/InputBar";
import { Badge } from "./components/ui/Badge";
import { Input } from "./components/ui/Input";
import { ScrollArea } from "./components/ui/ScrollArea";
import { Button } from "./components/ui/Button";
import { fetchSessions } from "./lib/api";
import { applyScreenUpdate, ScreenState } from "./lib/terminal";
import { useVtrStream } from "./lib/ws";
import { SubscribeEvent } from "./lib/proto";
import { TerminalView } from "./components/TerminalView";

const statusLabels: Record<string, { label: string; variant: "default" | "green" | "red" | "yellow" }> = {
  idle: { label: "idle", variant: "default" },
  connecting: { label: "connecting", variant: "yellow" },
  open: { label: "live", variant: "green" },
  reconnecting: { label: "reconnecting", variant: "yellow" },
  error: { label: "error", variant: "red" },
  closed: { label: "closed", variant: "default" }
};

export default function App() {
  const [coordinators, setCoordinators] = useState<CoordinatorInfo[]>([]);
  const [filter, setFilter] = useState("");
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [manualSession, setManualSession] = useState("");
  const [screen, setScreen] = useState<ScreenState | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [ctrlArmed, setCtrlArmed] = useState(false);
  const latestUpdate = useRef<SubscribeEvent | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSize = useRef<{ cols: number; rows: number } | null>(null);

  const { state, setEventHandler, sendText, sendKey, resize } = useVtrStream(activeSession, {
    includeRawOutput: false
  });

  useEffect(() => {
    fetchSessions()
      .then((data) => setCoordinators(data))
      .catch(() => setCoordinators([]));
  }, []);

  useEffect(() => {
    setScreen(null);
    setExitCode(null);
  }, [activeSession]);

  const applyPending = useCallback(() => {
    const pending = latestUpdate.current;
    latestUpdate.current = null;
    rafRef.current = null;
    if (!pending?.screen_update) {
      return;
    }
    setScreen((prev) => applyScreenUpdate(prev, pending.screen_update!));
  }, []);

  useEffect(() => {
    setEventHandler((event) => {
      if (event.screen_update) {
        latestUpdate.current = event;
        if (!rafRef.current) {
          rafRef.current = window.requestAnimationFrame(applyPending);
        }
      }
      if (event.session_exited) {
        setExitCode(event.session_exited.exit_code ?? 0);
      }
    });
  }, [applyPending, setEventHandler]);

  const onResize = useCallback(
    (cols: number, rows: number) => {
      if (!activeSession) {
        return;
      }
      if (!lastSize.current || lastSize.current.cols !== cols || lastSize.current.rows !== rows) {
        lastSize.current = { cols, rows };
        resize(cols, rows);
      }
    },
    [activeSession, resize]
  );

  const onSendKey = useCallback(
    (key: string) => {
      if (ctrlArmed && key.length === 1) {
        sendKey(`ctrl+${key}`);
        setCtrlArmed(false);
        return;
      }
      sendKey(key);
      if (ctrlArmed) {
        setCtrlArmed(false);
      }
    },
    [ctrlArmed, sendKey]
  );

  const onSendText = useCallback(
    (text: string) => {
      if (ctrlArmed && text.length === 1) {
        sendKey(`ctrl+${text.toLowerCase()}`);
        setCtrlArmed(false);
        return;
      }
      sendText(text);
      if (ctrlArmed) {
        setCtrlArmed(false);
      }
    },
    [ctrlArmed, sendKey, sendText]
  );

  const statusBadge = useMemo(() => {
    const status = statusLabels[state.status] || statusLabels.idle;
    return <Badge variant={status.variant}>{status.label}</Badge>;
  }, [state.status]);

  const showExit = exitCode !== null;

  return (
    <div className="min-h-screen bg-tn-bg text-tn-text">
      <header className="sticky top-0 z-10 border-b border-tn-border bg-tn-panel px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight">vtr</span>
            {statusBadge}
            {screen?.waitingForKeyframe && <Badge variant="yellow">resyncing</Badge>}
            {showExit && <Badge variant="red">exited ({exitCode})</Badge>}
            {activeSession && (
              <span className="text-xs text-tn-text-dim">{activeSession}</span>
            )}
          </div>
          <div className="flex-1">
            <Input
              placeholder="Filter coordinators or sessions"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-72px)] flex-col gap-4 px-4 py-4 lg:flex-row">
        <aside className="flex w-full flex-col gap-4 lg:w-80">
          <div className="rounded-lg border border-tn-border bg-tn-panel p-3">
            <div className="mb-2 text-xs text-tn-muted">Attach to a session</div>
            <div className="flex gap-2">
              <Input
                placeholder="coordinator:session"
                value={manualSession}
                onChange={(event) => setManualSession(event.target.value)}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (manualSession.trim()) {
                    setActiveSession(manualSession.trim());
                  }
                }}
              >
                Attach
              </Button>
            </div>
          </div>

          <div className="flex-1 rounded-lg border border-tn-border bg-tn-panel">
            <ScrollArea className="h-full max-h-[420px] lg:max-h-none">
              <div className="px-4 py-3">
                <CoordinatorTree
                  coordinators={coordinators}
                  filter={filter}
                  activeSession={activeSession}
                  onSelect={(session) => {
                    setActiveSession(session);
                    setManualSession(session);
                  }}
                />
              </div>
            </ScrollArea>
          </div>
        </aside>

        <section className="flex min-h-[420px] flex-1 flex-col gap-3">
          <div className="flex-1">
            <TerminalView
              screen={screen}
              status={state.status}
              onResize={onResize}
              onSendKey={onSendKey}
              onSendText={onSendText}
              onPaste={onSendText}
            />
          </div>
          <ActionTray
            ctrlArmed={ctrlArmed}
            onCtrlToggle={() => setCtrlArmed((prev) => !prev)}
            onSendKey={onSendKey}
          />
          <InputBar onSend={onSendText} disabled={state.status !== "open"} />
        </section>
      </main>
    </div>
  );
}

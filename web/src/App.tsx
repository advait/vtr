import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionTray } from "./components/ActionTray";
import {
  type CoordinatorInfo,
  CoordinatorTree,
  type SessionInfo,
} from "./components/CoordinatorTree";
import { InputBar } from "./components/InputBar";
import { TerminalView } from "./components/TerminalView";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";
import { ScrollArea } from "./components/ui/ScrollArea";
import { fetchSessions } from "./lib/api";
import type { SubscribeEvent } from "./lib/proto";
import { applyScreenUpdate, type ScreenState } from "./lib/terminal";
import { applyTheme, getTheme, loadThemeId, storeThemeId, themes } from "./lib/theme";
import { useVtrStream } from "./lib/ws";

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "green" | "red" | "yellow" }
> = {
  idle: { label: "idle", variant: "default" },
  connecting: { label: "connecting", variant: "yellow" },
  open: { label: "live", variant: "green" },
  reconnecting: { label: "reconnecting", variant: "yellow" },
  error: { label: "error", variant: "red" },
  closed: { label: "closed", variant: "default" },
};

const sessionHashKey = "session";

function readSessionHash() {
  if (typeof window === "undefined") {
    return null;
  }
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) {
    return null;
  }
  const params = new URLSearchParams(hash);
  const session = params.get(sessionHashKey);
  if (!session) {
    return null;
  }
  const trimmed = session.trim();
  return trimmed ? trimmed : null;
}

function writeSessionHash(session: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (!session) {
    url.hash = "";
    window.history.replaceState(null, "", url.toString());
    return;
  }
  const params = new URLSearchParams();
  params.set(sessionHashKey, session);
  url.hash = params.toString();
  window.history.replaceState(null, "", url.toString());
}

function findSession(
  coordinators: CoordinatorInfo[],
  name: string,
): { name: string; status: SessionInfo["status"]; exitCode?: number } | null {
  for (const coord of coordinators) {
    for (const session of coord.sessions) {
      const sessionKey = `${coord.name}:${session.name}`;
      if (sessionKey === name) {
        return { name: sessionKey, status: session.status, exitCode: session.exitCode };
      }
    }
  }
  return null;
}

export default function App() {
  const [coordinators, setCoordinators] = useState<CoordinatorInfo[]>([]);
  const [filter, setFilter] = useState("");
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<{
    name: string;
    status: SessionInfo["status"];
    exitCode?: number;
  } | null>(null);
  const [screen, setScreen] = useState<ScreenState | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [ctrlArmed, setCtrlArmed] = useState(false);
  const [hashSession, setHashSession] = useState(() => readSessionHash());
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [themeId, setThemeId] = useState(() => getTheme(loadThemeId()).id);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const latestUpdate = useRef<SubscribeEvent | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSize = useRef<{ cols: number; rows: number } | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const activeTheme = useMemo(() => getTheme(themeId), [themeId]);

  const { state, setEventHandler, sendText, sendKey, resize, close } = useVtrStream(activeSession, {
    includeRawOutput: false,
  });

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [settingsOpen]);

  useEffect(() => {
    applyTheme(activeTheme);
    storeThemeId(activeTheme.id);
  }, [activeTheme]);

  useEffect(() => {
    let active = true;
    let firstLoad = true;
    const refresh = async () => {
      try {
        const data = await fetchSessions();
        if (!active) {
          return;
        }
        setCoordinators(data);
        setSelectedSession((prev) => {
          if (!prev) {
            return prev;
          }
          const match = findSession(data, prev.name);
          return match ? { ...prev, ...match } : prev;
        });
      } catch {
        if (active) {
          setCoordinators([]);
        }
      } finally {
        if (active && firstLoad) {
          firstLoad = false;
          setSessionsLoaded(true);
        }
      }
    };

    refresh();
    const intervalId = window.setInterval(refresh, 3000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!hashSession || selectedSession || !sessionsLoaded) {
      return;
    }
    const match = findSession(coordinators, hashSession);
    if (!match) {
      writeSessionHash(null);
      setHashSession(null);
      return;
    }
    setSelectedSession(match);
    setActiveSession(match.status === "exited" ? null : match.name);
  }, [coordinators, hashSession, selectedSession, sessionsLoaded]);

  useEffect(() => {
    if (selectedSession) {
      writeSessionHash(selectedSession.name);
    }
  }, [selectedSession]);

  useEffect(() => {
    if (!selectedSession) {
      setScreen(null);
      setExitCode(null);
      return;
    }
    setScreen(null);
    setExitCode(null);
  }, [selectedSession]);

  useEffect(() => {
    if (!selectedSession || selectedSession.status !== "exited") {
      setExitCode(null);
      return;
    }
    setExitCode(selectedSession.exitCode ?? 0);
  }, [selectedSession]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => setIsDesktop(media.matches);
    handleChange();
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const applyPending = useCallback(() => {
    const pending = latestUpdate.current;
    latestUpdate.current = null;
    rafRef.current = null;
    const screenUpdate = pending?.screen_update;
    if (!screenUpdate) {
      return;
    }
    setScreen((prev) => applyScreenUpdate(prev, screenUpdate));
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
        const exit = event.session_exited.exit_code ?? 0;
        setExitCode(exit);
        setSelectedSession((prev) => {
          if (!prev || prev.name !== activeSession) {
            return prev;
          }
          return { ...prev, status: "exited", exitCode: exit };
        });
        close();
        setActiveSession(null);
      }
    });
  }, [activeSession, applyPending, close, setEventHandler]);

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
    [activeSession, resize],
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
    [ctrlArmed, sendKey],
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
    [ctrlArmed, sendKey, sendText],
  );

  const statusBadge = useMemo(() => {
    if (selectedSession?.status === "exited") {
      const label = exitCode !== null ? `exited (${exitCode})` : "exited";
      return <Badge variant="red">{label}</Badge>;
    }
    const status = statusLabels[state.status] || statusLabels.idle;
    return <Badge variant={status.variant}>{status.label}</Badge>;
  }, [exitCode, selectedSession?.status, state.status]);

  const showExit = exitCode !== null && selectedSession?.status !== "exited";
  const displayStatus = selectedSession?.status === "exited" ? "exited" : state.status;

  return (
    <div className="min-h-screen bg-tn-bg text-tn-text">
      <header className="sticky top-0 z-10 border-b border-tn-border bg-tn-panel px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-semibold tracking-tight">vtr</span>
            {statusBadge}
            {screen?.waitingForKeyframe && <Badge variant="yellow">resyncing</Badge>}
            {showExit && <Badge variant="red">exited ({exitCode})</Badge>}
            {selectedSession && (
              <span className="text-xs text-tn-text-dim">{selectedSession.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2 lg:ml-auto" ref={settingsRef}>
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="border border-tn-border bg-tn-panel"
                onClick={() => setSettingsOpen((prev) => !prev)}
                aria-expanded={settingsOpen}
                aria-controls="settings-menu"
              >
                Settings
              </Button>
              {settingsOpen && (
                <div
                  id="settings-menu"
                  className="absolute right-0 mt-2 w-64 rounded-lg border border-tn-border bg-tn-panel p-3 shadow-panel"
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-tn-muted">
                      Theme
                    </span>
                    <select
                      className="h-9 w-full rounded-md border border-tn-border bg-tn-panel-2 px-3 text-sm text-tn-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tn-accent"
                      value={activeTheme.id}
                      onChange={(event) => setThemeId(event.target.value)}
                      aria-label="Select theme"
                    >
                      {themes.map((theme) => (
                        <option key={theme.id} value={theme.id}>
                          {theme.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-72px)] flex-col gap-4 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:flex-row">
        <aside className="flex w-full flex-col gap-4 lg:w-80">
          <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-tn-border bg-tn-panel">
            <ScrollArea className="flex-1 max-h-[420px] lg:max-h-none">
              <div className="px-4 py-3">
                <CoordinatorTree
                  coordinators={coordinators}
                  filter={filter}
                  activeSession={activeSession}
                  onSelect={(session) => {
                    setSelectedSession(session);
                    setActiveSession(session.status === "exited" ? null : session.name);
                  }}
                />
              </div>
            </ScrollArea>
            <div className="border-t border-tn-border px-4 py-3">
              <Input
                placeholder="Filter coordinators or sessions"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </div>
          </div>
        </aside>

        <section className="flex min-h-[420px] flex-1 flex-col gap-3">
          <div className="flex-1">
            <TerminalView
              screen={screen}
              status={displayStatus}
              onResize={onResize}
              onSendKey={onSendKey}
              onSendText={onSendText}
              onPaste={onSendText}
              autoFocus={isDesktop}
              focusKey={selectedSession?.name}
            />
          </div>
          {!isDesktop && (
            <>
              <ActionTray
                ctrlArmed={ctrlArmed}
                onCtrlToggle={() => setCtrlArmed((prev) => !prev)}
                onSendKey={onSendKey}
              />
              <InputBar onSend={onSendText} disabled={state.status !== "open"} />
            </>
          )}
        </section>
      </main>
    </div>
  );
}

import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActionTray } from "./components/ActionTray";
import type { CoordinatorInfo, SessionInfo } from "./components/CoordinatorTree";
import { InputBar } from "./components/InputBar";
import { MultiViewDashboard } from "./components/MultiViewDashboard";
import { SessionTabs } from "./components/SessionTabs";
import { TerminalView } from "./components/TerminalView";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { createSession, fetchSessions, sendSessionAction } from "./lib/api";
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
const showClosedSessionsKey = "showClosedSessions";
const terminalRendererKey = "terminalRenderer";

type TerminalRenderer = "dom" | "canvas";

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

function readShowClosedSetting() {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(showClosedSessionsKey) === "true";
  } catch {
    return false;
  }
}

function writeShowClosedSetting(value: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(showClosedSessionsKey, value ? "true" : "false");
  } catch {}
}

function normalizeRenderer(value: string | null): TerminalRenderer | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "canvas" || trimmed === "dom") {
    return trimmed;
  }
  return null;
}

function readRendererSetting(): TerminalRenderer {
  if (typeof window === "undefined") {
    return "dom";
  }
  const params = new URLSearchParams(window.location.search);
  const fromQuery = normalizeRenderer(params.get("renderer"));
  if (fromQuery) {
    return fromQuery;
  }
  try {
    const stored = normalizeRenderer(window.localStorage.getItem(terminalRendererKey));
    return stored ?? "dom";
  } catch {
    return "dom";
  }
}

function writeRendererSetting(value: TerminalRenderer) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(terminalRendererKey, value);
  } catch {}
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

function splitSessionKey(sessionKey: string) {
  const [coordinator, ...rest] = sessionKey.split(":");
  return { coordinator, session: rest.join(":") };
}

export default function App() {
  const [coordinators, setCoordinators] = useState<CoordinatorInfo[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<{
    name: string;
    status: SessionInfo["status"];
    exitCode?: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"single" | "multi">("single");
  const [screen, setScreen] = useState<ScreenState | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [ctrlArmed, setCtrlArmed] = useState(false);
  const [hashSession, setHashSession] = useState(() => readSessionHash());
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [themeId, setThemeId] = useState(() => getTheme(loadThemeId()).id);
  const [terminalRenderer, setTerminalRenderer] = useState<TerminalRenderer>(() =>
    readRendererSetting(),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showClosedSessions, setShowClosedSessions] = useState(() => readShowClosedSetting());
  const [createBusy, setCreateBusy] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sessionKey: string;
    status: SessionInfo["status"];
  } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameBusy, setRenameBusy] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const pendingUpdates = useRef<SubscribeEvent[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastSize = useRef<{ cols: number; rows: number } | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const activeTheme = useMemo(() => getTheme(themeId), [themeId]);
  const visibleCoordinators = useMemo(() => {
    if (showClosedSessions) {
      return coordinators;
    }
    return coordinators
      .map((coord) => ({
        ...coord,
        sessions: coord.sessions.filter((session) => session.status !== "exited"),
      }))
      .filter((coord) => coord.sessions.length > 0);
  }, [coordinators, showClosedSessions]);
  const coordinatorOptions = useMemo(() => coordinators.map((coord) => coord.name), [coordinators]);
  const tabSessions = useMemo(() => {
    const entries: Array<{
      key: string;
      coordinator: string;
      session: SessionInfo;
    }> = [];
    for (const coord of visibleCoordinators) {
      for (const session of coord.sessions) {
        entries.push({
          key: `${coord.name}:${session.name}`,
          coordinator: coord.name,
          session,
        });
      }
    }
    return entries;
  }, [visibleCoordinators]);

  const { state, setEventHandler, sendText, sendKey, sendTextTo, sendKeyTo, resize, close } =
    useVtrStream(activeSession, {
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
    if (!contextMenu) {
      setRenameOpen(false);
      setRenameDraft("");
      setRenameError(null);
      setRenameBusy(false);
      return;
    }
    const { session } = splitSessionKey(contextMenu.sessionKey);
    setRenameDraft(session);
    setRenameError(null);
    setRenameOpen(false);
    setRenameBusy(false);
  }, [contextMenu]);

  useEffect(() => {
    applyTheme(activeTheme);
    storeThemeId(activeTheme.id);
  }, [activeTheme]);

  const applySessions = useCallback((data: CoordinatorInfo[]) => {
    setCoordinators(data);
    setSelectedSession((prev) => {
      if (!prev) {
        return prev;
      }
      const match = findSession(data, prev.name);
      if (!match) {
        return prev;
      }
      if (
        prev.status === match.status &&
        prev.exitCode === match.exitCode &&
        prev.name === match.name
      ) {
        return prev;
      }
      return { ...prev, ...match };
    });
  }, []);

  const refreshSessions = useCallback(async () => {
    const data = await fetchSessions();
    applySessions(data);
  }, [applySessions]);

  useEffect(() => {
    let active = true;
    let firstLoad = true;
    const refresh = async () => {
      try {
        const data = await fetchSessions();
        if (!active) {
          return;
        }
        applySessions(data);
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
  }, [applySessions]);

  useEffect(() => {
    if (!hashSession || selectedSession || !sessionsLoaded) {
      return;
    }
    const match = findSession(visibleCoordinators, hashSession);
    if (!match) {
      writeSessionHash(null);
      setHashSession(null);
      return;
    }
    setSelectedSession(match);
    setActiveSession(match.status === "exited" ? null : match.name);
  }, [hashSession, selectedSession, sessionsLoaded, visibleCoordinators]);

  useEffect(() => {
    if (selectedSession) {
      writeSessionHash(selectedSession.name);
    }
  }, [selectedSession]);

  useEffect(() => {
    writeShowClosedSetting(showClosedSessions);
  }, [showClosedSessions]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) {
        return;
      }
      setContextMenu(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };
    const handleScroll = () => {
      setContextMenu(null);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [contextMenu]);

  const selectedSessionName = selectedSession?.name ?? null;

  useEffect(() => {
    if (!selectedSessionName) {
      setScreen(null);
      return;
    }
    setScreen(null);
  }, [selectedSessionName]);

  useEffect(() => {
    if (!selectedSession || selectedSession.status !== "exited") {
      setExitCode(null);
      return;
    }
    setExitCode(selectedSession.exitCode ?? 0);
  }, [selectedSession]);

  useEffect(() => {
    if (showClosedSessions || !selectedSession || selectedSession.status !== "exited") {
      return;
    }
    setSelectedSession(null);
    setActiveSession(null);
  }, [selectedSession, showClosedSessions]);

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
    rafRef.current = null;
    const updates = pendingUpdates.current;
    if (updates.length === 0) {
      return;
    }
    pendingUpdates.current = [];
    setScreen((prev) => {
      let next = prev;
      for (const event of updates) {
        if (event.screen_update) {
          next = applyScreenUpdate(next, event.screen_update);
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setEventHandler((event) => {
      if (event.screen_update) {
        pendingUpdates.current.push(event);
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
      if (cols < 2 || rows < 2) {
        return;
      }
      const changed =
        !lastSize.current || lastSize.current.cols !== cols || lastSize.current.rows !== rows;
      if (changed) {
        lastSize.current = { cols, rows };
      }
      if (!activeSession || !changed) {
        return;
      }
      resize(cols, rows);
    },
    [activeSession, resize],
  );

  useEffect(() => {
    if (!activeSession || state.status !== "open") {
      return;
    }
    const size = lastSize.current ?? { cols: 120, rows: 40 };
    resize(size.cols, size.rows);
  }, [activeSession, resize, state.status]);

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

  const handleBroadcast = useCallback(
    (mode: "text" | "key", value: string, targets: string[]) => {
      if (targets.length === 0) {
        return false;
      }
      if (state.status !== "open") {
        window.alert("Connect to a session before broadcasting.");
        return false;
      }
      const preview =
        targets.length > 4 ? `${targets.slice(0, 4).join(", ")}…` : targets.join(", ");
      const confirmText =
        targets.length > 1
          ? `Send to ${targets.length} sessions?\\n${preview}`
          : `Send to ${targets[0]}?`;
      if (!window.confirm(confirmText)) {
        return false;
      }
      for (const name of targets) {
        if (mode === "text") {
          sendTextTo(name, value);
        } else {
          sendKeyTo(name, value);
        }
      }
      return true;
    },
    [sendKeyTo, sendTextTo, state.status],
  );

  const handleCreateSession = useCallback(async () => {
    if (createBusy) {
      return;
    }
    const activeCoordinator = activeSession?.split(":")[0] ?? "";
    const coordinator =
      (activeCoordinator && coordinatorOptions.includes(activeCoordinator)
        ? activeCoordinator
        : coordinatorOptions[0]) || "";
    if (!coordinator) {
      window.alert("No coordinators available to create a session.");
      return;
    }
    const existing = new Set<string>();
    const coord = coordinators.find((entry) => entry.name === coordinator);
    if (coord) {
      for (const session of coord.sessions) {
        existing.add(session.name);
      }
    }
    let index = 1;
    let name = `session-${index}`;
    while (existing.has(name)) {
      index += 1;
      name = `session-${index}`;
    }
    setCreateBusy(true);
    try {
      const result = await createSession({ name, coordinator });
      const sessionKey = `${result.coordinator}:${result.session.name}`;
      setSelectedSession({
        name: sessionKey,
        status: result.session.status,
        exitCode: result.session.exitCode,
      });
      setActiveSession(result.session.status === "exited" ? null : sessionKey);
      setViewMode("single");
      try {
        await refreshSessions();
      } catch {
        // ignore refresh errors; periodic fetch will retry
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create session.";
      window.alert(message);
    } finally {
      setCreateBusy(false);
    }
  }, [activeSession, coordinatorOptions, coordinators, createBusy, refreshSessions]);
  const runSessionAction = useCallback(
    async (payload: Parameters<typeof sendSessionAction>[0], refreshAfter = false) => {
      try {
        await sendSessionAction(payload);
        if (refreshAfter) {
          await refreshSessions();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Session action failed.";
        window.alert(message);
      } finally {
        setContextMenu(null);
      }
    },
    [refreshSessions],
  );

  const handleRenameSubmit = async () => {
    if (!contextMenu || renameBusy) {
      return;
    }
    const currentKey = contextMenu.sessionKey;
    const { coordinator, session } = splitSessionKey(currentKey);
    const nextName = renameDraft.trim();
    if (!nextName) {
      setRenameError("Name is required.");
      return;
    }
    if (nextName.includes(":")) {
      setRenameError("Name cannot include ':'");
      return;
    }
    if (nextName === session) {
      setRenameOpen(false);
      setRenameError(null);
      return;
    }
    const duplicate = coordinators
      .find((coord) => coord.name === coordinator)
      ?.sessions.some((entry) => entry.name === nextName);
    if (duplicate) {
      setRenameError("Session name already exists.");
      return;
    }
    setRenameBusy(true);
    setRenameError(null);
    try {
      await sendSessionAction({ name: currentKey, action: "rename", newName: nextName });
      await refreshSessions();
      const newKey = `${coordinator}:${nextName}`;
      setSelectedSession((prev) =>
        prev && prev.name === currentKey ? { ...prev, name: newKey } : prev,
      );
      setActiveSession((prev) => (prev === currentKey ? newKey : prev));
      setContextMenu(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Rename failed.";
      setRenameError(message);
    } finally {
      setRenameBusy(false);
    }
  };

  const handleCloseTab = useCallback(
    (sessionKey: string, session: SessionInfo) => {
      if (session.status === "exited") {
        if (!window.confirm(`Remove exited session ${sessionKey}?`)) {
          return;
        }
        runSessionAction({ name: sessionKey, action: "remove" }, true);
        return;
      }
      if (!window.confirm(`Close session ${sessionKey}?`)) {
        return;
      }
      runSessionAction({ name: sessionKey, action: "close" }, true);
    },
    [runSessionAction],
  );

  const openContextMenuAt = useCallback(
    (coords: { x: number; y: number }, sessionKey: string, session: SessionInfo) => {
      const menuWidth = 220;
      const menuHeight = 320;
      const viewportWidth = window.innerWidth || 0;
      const viewportHeight = window.innerHeight || 0;
      let nextX = coords.x;
      let nextY = coords.y;
      if (viewportWidth) {
        nextX = Math.min(nextX, Math.max(8, viewportWidth - menuWidth - 8));
      }
      if (viewportHeight) {
        nextY = Math.min(nextY, Math.max(8, viewportHeight - menuHeight - 8));
      }
      setContextMenu({
        x: nextX,
        y: nextY,
        sessionKey,
        status: session.status,
      });
    },
    [],
  );

  const openContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>, sessionKey: string, session: SessionInfo) => {
      event.preventDefault();
      openContextMenuAt({ x: event.clientX, y: event.clientY }, sessionKey, session);
    },
    [openContextMenuAt],
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
  const contextLabel = contextMenu?.sessionKey ?? "";
  const contextRunning = contextMenu?.status === "running" || contextMenu?.status === "closing";

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
          <div className="flex items-center gap-2 lg:ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="border border-tn-border bg-tn-panel"
              onClick={() => setViewMode((prev) => (prev === "single" ? "multi" : "single"))}
            >
              {viewMode === "single" ? "Multi-view" : "Single-view"}
            </Button>
            <div className="relative" ref={settingsRef}>
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
                  <div className="mt-4 flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-tn-muted">
                      Renderer
                    </span>
                    <select
                      className="h-9 w-full rounded-md border border-tn-border bg-tn-panel-2 px-3 text-sm text-tn-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tn-accent"
                      value={terminalRenderer}
                      onChange={(event) => {
                        const next = normalizeRenderer(event.target.value) ?? "dom";
                        setTerminalRenderer(next);
                        writeRendererSetting(next);
                      }}
                      aria-label="Select terminal renderer"
                    >
                      <option value="dom">DOM (default)</option>
                      <option value="canvas">Canvas (experimental)</option>
                    </select>
                    <span className="text-[11px] text-tn-text-dim">
                      Use ?renderer=canvas for a URL override.
                    </span>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-tn-muted">
                      Sessions
                    </span>
                    <label className="flex items-center justify-between gap-3 text-sm text-tn-text">
                      <span>Show closed sessions</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-tn-accent"
                        checked={showClosedSessions}
                        onChange={(event) => setShowClosedSessions(event.target.checked)}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-72px)] flex-col gap-4 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <section className="flex min-h-[420px] flex-1 flex-col gap-3">
          {viewMode === "single" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 lg:pr-4">
              <div className="flex min-h-0 flex-1 flex-col">
                <SessionTabs
                  sessions={tabSessions}
                  activeSession={activeSession}
                  onSelect={(sessionKey, session) => {
                    setSelectedSession({
                      name: sessionKey,
                      status: session.status,
                      exitCode: session.exitCode,
                    });
                    setActiveSession(session.status === "exited" ? null : sessionKey);
                  }}
                  onClose={handleCloseTab}
                  onContextMenu={openContextMenu}
                  onContextMenuAt={openContextMenuAt}
                  onCreate={handleCreateSession}
                />
                <div className="flex-1 min-h-[360px] md:min-h-[420px]">
                  <TerminalView
                    screen={screen}
                    status={displayStatus}
                    onResize={onResize}
                    onSendKey={onSendKey}
                    onSendText={onSendText}
                    onPaste={onSendText}
                    autoFocus={isDesktop}
                    focusKey={selectedSession?.name}
                    renderer={terminalRenderer}
                    themeKey={activeTheme.id}
                  />
                </div>
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
            </div>
          ) : (
            <MultiViewDashboard
              coordinators={visibleCoordinators}
              activeSession={activeSession}
              onBroadcast={handleBroadcast}
              onSelect={(sessionKey, session) => {
                setSelectedSession({
                  name: sessionKey,
                  status: session.status,
                  exitCode: session.exitCode,
                });
                setActiveSession(session.status === "exited" ? null : sessionKey);
                setViewMode("single");
              }}
            />
          )}
        </section>
      </main>
      {contextMenu && (
        <div className="fixed inset-0 z-40">
          <div
            ref={contextMenuRef}
            className="absolute w-56 rounded-lg border border-tn-border bg-tn-panel shadow-panel"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="border-b border-tn-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-tn-muted">
              Session actions
            </div>
            <div className="flex flex-col py-1 text-sm">
              <button
                type="button"
                className="px-3 py-2 text-left text-tn-text transition-colors hover:bg-tn-panel-2"
                onClick={() => {
                  setRenameOpen(true);
                  setRenameError(null);
                }}
              >
                Rename session
              </button>
              {renameOpen && (
                <div className="px-3 py-2 text-xs text-tn-text">
                  <label
                    htmlFor="rename-session-input"
                    className="text-[10px] uppercase tracking-wide text-tn-muted"
                  >
                    New name
                  </label>
                  <input
                    className="mt-2 h-8 w-full rounded-md border border-tn-border bg-tn-panel-2 px-2 text-sm text-tn-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tn-accent"
                    id="rename-session-input"
                    value={renameDraft}
                    onChange={(event) => {
                      setRenameDraft(event.target.value);
                      setRenameError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleRenameSubmit();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setRenameOpen(false);
                      }
                    }}
                  />
                  {renameError && (
                    <span className="mt-1 block text-[11px] text-tn-red">{renameError}</span>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-tn-border px-2 py-1 text-xs text-tn-text transition-colors hover:border-tn-accent"
                      onClick={handleRenameSubmit}
                      disabled={renameBusy}
                    >
                      {renameBusy ? "Renaming..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-tn-border px-2 py-1 text-xs text-tn-text transition-colors hover:border-tn-accent"
                      onClick={() => {
                        setRenameOpen(false);
                        setRenameError(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <div className="my-1 h-px bg-tn-border" />
              <button
                type="button"
                className={`px-3 py-2 text-left transition-colors ${
                  contextRunning
                    ? "text-tn-text hover:bg-tn-panel-2"
                    : "cursor-not-allowed text-tn-muted"
                }`}
                onClick={() => {
                  if (!contextRunning) {
                    return;
                  }
                  if (!window.confirm(`Close session ${contextLabel}?`)) {
                    return;
                  }
                  runSessionAction({ name: contextLabel, action: "close" }, true);
                }}
                disabled={!contextRunning}
              >
                Close session (SIGHUP)
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-left transition-colors ${
                  contextRunning
                    ? "text-tn-text hover:bg-tn-panel-2"
                    : "cursor-not-allowed text-tn-muted"
                }`}
                onClick={() => {
                  if (!contextRunning) {
                    return;
                  }
                  if (!window.confirm(`Force kill ${contextLabel}?`)) {
                    return;
                  }
                  runSessionAction({ name: contextLabel, action: "signal", signal: "KILL" }, true);
                }}
                disabled={!contextRunning}
              >
                Force kill (SIGKILL)
              </button>
              <div className="my-1 h-px bg-tn-border" />
              <button
                type="button"
                className={`px-3 py-2 text-left transition-colors ${
                  contextRunning
                    ? "text-tn-text hover:bg-tn-panel-2"
                    : "cursor-not-allowed text-tn-muted"
                }`}
                onClick={() => {
                  if (!contextRunning) {
                    return;
                  }
                  runSessionAction({ name: contextLabel, action: "send_key", key: "ctrl+c" });
                }}
                disabled={!contextRunning}
              >
                Send Ctrl+C
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-left transition-colors ${
                  contextRunning
                    ? "text-tn-text hover:bg-tn-panel-2"
                    : "cursor-not-allowed text-tn-muted"
                }`}
                onClick={() => {
                  if (!contextRunning) {
                    return;
                  }
                  runSessionAction({ name: contextLabel, action: "send_key", key: "ctrl+z" });
                }}
                disabled={!contextRunning}
              >
                Send Ctrl+Z
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-left transition-colors ${
                  contextRunning
                    ? "text-tn-text hover:bg-tn-panel-2"
                    : "cursor-not-allowed text-tn-muted"
                }`}
                onClick={() => {
                  if (!contextRunning) {
                    return;
                  }
                  runSessionAction({ name: contextLabel, action: "send_key", key: "ctrl+d" });
                }}
                disabled={!contextRunning}
              >
                Send Ctrl+D
              </button>
              <div className="my-1 h-px bg-tn-border" />
              <button
                type="button"
                className="px-3 py-2 text-left text-tn-text transition-colors hover:bg-tn-panel-2"
                onClick={() => {
                  if (!window.confirm(`Remove session ${contextLabel}?`)) {
                    return;
                  }
                  runSessionAction({ name: contextLabel, action: "remove" }, true);
                }}
              >
                Remove session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

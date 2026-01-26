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
import { displaySessionName } from "./lib/session";
import { InputBar } from "./components/InputBar";
import { MultiViewDashboard } from "./components/MultiViewDashboard";
import { SessionTabs } from "./components/SessionTabs";
import { TerminalView } from "./components/TerminalView";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { createSession, sendSessionAction } from "./lib/api";
import { loadPreferences, type TerminalRenderer, updatePreferences } from "./lib/preferences";
import type { SubscribeEvent } from "./lib/proto";
import { applyScreenUpdate, type ScreenState } from "./lib/terminal";
import { applyTheme, getTheme, sortedThemes } from "./lib/theme";
import { useVtrSessionsStream, useVtrStream } from "./lib/ws";

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
const initialPreferences = loadPreferences();

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

function readRendererSetting(fallback: TerminalRenderer): TerminalRenderer {
  if (typeof window === "undefined") {
    return fallback;
  }
  const params = new URLSearchParams(window.location.search);
  const fromQuery = normalizeRenderer(params.get("renderer"));
  if (fromQuery) {
    return fromQuery;
  }
  return fallback;
}

type SelectedSession = {
  key: string;
  id: string;
  label: string;
  coordinator: string;
  status: SessionInfo["status"];
  exitCode?: number;
};

function sessionKey(coord: string, session: SessionInfo) {
  const ref = session.id || session.name;
  return `${coord}:${ref}`;
}

function formatSessionLabel(_coordinator: string, label: string) {
  return displaySessionName(label);
}

function findSession(
  coordinators: CoordinatorInfo[],
  key: string,
): SelectedSession | null {
  for (const coord of coordinators) {
    for (const session of coord.sessions) {
      const idKey = sessionKey(coord.name, session);
      if (idKey === key || `${coord.name}:${session.name}` === key) {
        return {
          key: idKey,
          id: session.id || session.name,
          label: session.name,
          coordinator: coord.name,
          status: session.status,
          exitCode: session.exitCode,
        };
      }
    }
  }
  return null;
}

function splitSessionKey(sessionKey: string) {
  const [coordinator, ...rest] = sessionKey.split(":");
  return { coordinator, id: rest.join(":") };
}

export default function App() {
  const [coordinators, setCoordinators] = useState<CoordinatorInfo[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SelectedSession | null>(null);
  const [viewMode, setViewMode] = useState<"single" | "multi">("single");
  const [screen, setScreen] = useState<ScreenState | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [ctrlArmed, setCtrlArmed] = useState(false);
  const [hashSession, setHashSession] = useState(() => readSessionHash());
  const { coordinators: streamCoordinators, loaded: sessionsLoaded } = useVtrSessionsStream();
  const [themeId, setThemeId] = useState(() => getTheme(initialPreferences.themeId).id);
  const [terminalRenderer, setTerminalRenderer] = useState<TerminalRenderer>(() =>
    readRendererSetting(initialPreferences.terminalRenderer),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showClosedSessions, setShowClosedSessions] = useState(
    () => initialPreferences.showClosedSessions,
  );
  const [autoResize, setAutoResize] = useState(() => initialPreferences.autoResize ?? false);
  const [createBusy, setCreateBusy] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sessionKey: string;
    sessionId: string;
    sessionLabel: string;
    coordinator: string;
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
  const [terminalFocused, setTerminalFocused] = useState(false);
  const pendingUpdates = useRef<SubscribeEvent[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastSize = useRef<{ cols: number; rows: number } | null>(null);
  const autoSelectedRef = useRef(false);
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
          key: sessionKey(coord.name, session),
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
    setRenameDraft(contextMenu.sessionLabel);
    setRenameError(null);
    setRenameOpen(false);
    setRenameBusy(false);
  }, [contextMenu]);

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  const applySessions = useCallback((data: CoordinatorInfo[]) => {
    setCoordinators(data);
    setSelectedSession((prev) => {
      if (!prev) {
        return prev;
      }
      const match = findSession(data, prev.key);
      if (!match) {
        return prev;
      }
      if (
        prev.status === match.status &&
        prev.exitCode === match.exitCode &&
        prev.key === match.key &&
        prev.label === match.label
      ) {
        return prev;
      }
      return { ...prev, ...match };
    });
  }, []);

  useEffect(() => {
    applySessions(streamCoordinators);
  }, [applySessions, streamCoordinators]);

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
    setActiveSession(match.status === "exited" ? null : match.key);
  }, [hashSession, selectedSession, sessionsLoaded, visibleCoordinators]);

  useEffect(() => {
    if (!sessionsLoaded || hashSession || selectedSession || autoSelectedRef.current) {
      return;
    }
    let fallback: { key: string; session: SessionInfo; coordinator: string } | null = null;
    for (const coord of visibleCoordinators) {
      for (const session of coord.sessions) {
        const key = sessionKey(coord.name, session);
        if (session.status !== "exited") {
          setSelectedSession({
            key,
            id: session.id || session.name,
            label: session.name,
            coordinator: coord.name,
            status: session.status,
            exitCode: session.exitCode,
          });
          setActiveSession(key);
          autoSelectedRef.current = true;
          return;
        }
        if (!fallback) {
          fallback = { key, session, coordinator: coord.name };
        }
      }
    }
    if (fallback) {
      setSelectedSession({
        key: fallback.key,
        id: fallback.session.id,
        label: fallback.session.name,
        coordinator: fallback.coordinator,
        status: fallback.session.status,
        exitCode: fallback.session.exitCode,
      });
      setActiveSession(fallback.session.status === "exited" ? null : fallback.key);
      autoSelectedRef.current = true;
    }
  }, [hashSession, selectedSession, sessionsLoaded, visibleCoordinators]);

  useEffect(() => {
    if (selectedSession) {
      writeSessionHash(selectedSession.key);
    }
  }, [selectedSession]);

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

  const selectedSessionKey = selectedSession?.key ?? null;

  useEffect(() => {
    if (!selectedSessionKey) {
      setScreen(null);
      return;
    }
    setScreen(null);
  }, [selectedSessionKey]);

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
          if (!prev || prev.key !== activeSession) {
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
      if (!autoResize) {
        return;
      }
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
    [activeSession, autoResize, resize],
  );

  useEffect(() => {
    if (!autoResize || !activeSession || state.status !== "open") {
      return;
    }
    const size = lastSize.current ?? { cols: 120, rows: 40 };
    resize(size.cols, size.rows);
  }, [activeSession, autoResize, resize, state.status]);

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
      const resolvedTargets = targets.map((key) => {
        const match = findSession(coordinators, key);
        if (!match) {
          return { key, label: key };
        }
        return { key, label: formatSessionLabel(match.coordinator, match.label) };
      });
      const labels = resolvedTargets.map((target) => target.label);
      const preview = labels.length > 4 ? `${labels.slice(0, 4).join(", ")}…` : labels.join(", ");
      const confirmText =
        targets.length > 1
          ? `Send to ${targets.length} sessions?\\n${preview}`
          : `Send to ${preview}?`;
      if (!window.confirm(confirmText)) {
        return false;
      }
      for (const target of resolvedTargets) {
        if (mode === "text") {
          sendTextTo(target.key, value);
        } else {
          sendKeyTo(target.key, value);
        }
      }
      return true;
    },
    [coordinators, sendKeyTo, sendTextTo, state.status],
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
      const sessionKey = `${result.coordinator}:${result.session.id}`;
      setSelectedSession({
        key: sessionKey,
        id: result.session.id,
        label: result.session.name,
        coordinator: result.coordinator,
        status: result.session.status,
        exitCode: result.session.exitCode,
      });
      setActiveSession(result.session.status === "exited" ? null : sessionKey);
      setViewMode("single");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create session.";
      window.alert(message);
    } finally {
      setCreateBusy(false);
    }
  }, [activeSession, coordinatorOptions, coordinators, createBusy]);
  const runSessionAction = useCallback(
    async (payload: Parameters<typeof sendSessionAction>[0]) => {
      try {
        await sendSessionAction(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Session action failed.";
        window.alert(message);
      } finally {
        setContextMenu(null);
      }
    },
    [],
  );

  const handleRenameSubmit = async () => {
    if (!contextMenu || renameBusy) {
      return;
    }
    const currentKey = contextMenu.sessionKey;
    const { coordinator } = splitSessionKey(currentKey);
    const nextName = renameDraft.trim();
    if (!nextName) {
      setRenameError("Name is required.");
      return;
    }
    if (nextName.includes(":")) {
      setRenameError("Name cannot include ':'");
      return;
    }
    if (nextName === contextMenu.sessionLabel) {
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
      await sendSessionAction({ id: contextMenu.sessionId, action: "rename", newName: nextName });
      setSelectedSession((prev) =>
        prev && prev.id === contextMenu.sessionId ? { ...prev, label: nextName } : prev,
      );
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
      const { coordinator } = splitSessionKey(sessionKey);
      const label = formatSessionLabel(coordinator, session.name);
      if (session.status === "exited") {
        if (!window.confirm(`Remove exited session ${label}?`)) {
          return;
        }
        runSessionAction({ id: session.id || session.name, action: "remove" });
        return;
      }
      if (!window.confirm(`Close session ${label}?`)) {
        return;
      }
      runSessionAction({ id: session.id || session.name, action: "close" });
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
      const { coordinator } = splitSessionKey(sessionKey);
      setContextMenu({
        x: nextX,
        y: nextY,
        sessionKey,
        sessionId: session.id || session.name,
        sessionLabel: displaySessionName(session.name),
        coordinator,
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
  const contextLabel = contextMenu
    ? formatSessionLabel(contextMenu.coordinator, contextMenu.sessionLabel)
    : "";
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
              <span className="text-xs text-tn-text-dim">
                {formatSessionLabel(selectedSession.coordinator, selectedSession.label)}
              </span>
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
                      onChange={(event) => {
                        const next = event.target.value;
                        setThemeId(next);
                        updatePreferences({ themeId: next });
                      }}
                      aria-label="Select theme"
                    >
                      {sortedThemes.map((theme) => (
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
                        updatePreferences({ terminalRenderer: next });
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
                      Resizing
                    </span>
                    <label className="flex items-center justify-between gap-3 text-sm text-tn-text">
                      <span>Auto-resize terminal</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-tn-accent"
                        checked={autoResize}
                        onChange={(event) => {
                          const next = event.target.checked;
                          setAutoResize(next);
                          updatePreferences({ autoResize: next });
                        }}
                      />
                    </label>
                    <span className="text-[11px] text-tn-text-dim">
                      When off, the session keeps its current size.
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
                        onChange={(event) => {
                          const next = event.target.checked;
                          setShowClosedSessions(next);
                          updatePreferences({ showClosedSessions: next });
                        }}
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
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col">
                <SessionTabs
                  sessions={tabSessions}
                  activeSession={activeSession}
                  onSelect={(sessionKey, session) => {
                    setSelectedSession({
                      key: sessionKey,
                      id: session.id || session.name,
                      label: session.name,
                      coordinator: splitSessionKey(sessionKey).coordinator,
                      status: session.status,
                      exitCode: session.exitCode,
                    });
                    setActiveSession(session.status === "exited" ? null : sessionKey);
                  }}
                  onClose={handleCloseTab}
                  onContextMenu={openContextMenu}
                  onContextMenuAt={openContextMenuAt}
                  onCreate={handleCreateSession}
                  isFocused={terminalFocused}
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
                  focusKey={selectedSession?.key}
                  autoResize={autoResize}
                  minRows={isDesktop ? 50 : undefined}
                  onFocusChange={setTerminalFocused}
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
                  key: sessionKey,
                  id: session.id || session.name,
                  label: session.name,
                  coordinator: splitSessionKey(sessionKey).coordinator,
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
              {renameOpen ? (
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
              ) : (
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
                  runSessionAction({ id: contextMenu.sessionId, action: "close" });
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
                  runSessionAction({ id: contextMenu.sessionId, action: "signal", signal: "KILL" });
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
                  runSessionAction({ id: contextMenu.sessionId, action: "send_key", key: "ctrl+c" });
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
                  runSessionAction({ id: contextMenu.sessionId, action: "send_key", key: "ctrl+z" });
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
                  runSessionAction({ id: contextMenu.sessionId, action: "send_key", key: "ctrl+d" });
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
                  runSessionAction({ id: contextMenu.sessionId, action: "remove" });
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

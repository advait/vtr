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
import { ScrollArea } from "./components/ui/ScrollArea";
import { createSession, fetchWebInfo, sendSessionAction, type WebInfoResponse } from "./lib/api";
import { loadPreferences, type TerminalRenderer, updatePreferences } from "./lib/preferences";
import type { SubscribeEvent } from "./lib/proto";
import {
  displaySessionName,
  type SessionRef,
  sessionKey,
  sessionRefEquals,
  sessionRefFromSession,
} from "./lib/session";
import { applyScreenUpdate, type ScreenState } from "./lib/terminal";
import { applyTheme, getTheme, sortedThemes } from "./lib/theme";
import { useVtrSessionsStream, useVtrStream } from "./lib/ws";

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "green" | "red" | "yellow" }
> = {
  idle: { label: "idle", variant: "default" },
  connecting: { label: "connecting", variant: "yellow" },
  open: { label: "connected", variant: "yellow" },
  reconnecting: { label: "reconnecting", variant: "yellow" },
  error: { label: "error", variant: "red" },
  closed: { label: "closed", variant: "default" },
};

function streamStatusBadge(status: string, receiving?: boolean) {
  if (status === "open") {
    if (receiving) {
      return { label: "connected+receiving", variant: "green" as const };
    }
    return { label: "connected", variant: "yellow" as const };
  }
  return statusLabels[status] || statusLabels.idle;
}

const sessionHashKey = "session";
const sessionCoordHashKey = "coord";
const initialPreferences = loadPreferences();

function readSessionHash(): SessionRef | null {
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
  if (!trimmed) {
    return null;
  }
  const coordinator = params.get(sessionCoordHashKey)?.trim() ?? "";
  return { id: trimmed, coordinator };
}

function writeSessionHash(session: SessionRef | null) {
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
  params.set(sessionHashKey, session.id);
  if (session.coordinator) {
    params.set(sessionCoordHashKey, session.coordinator);
  }
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
  ref: SessionRef;
  label: string;
  status: SessionInfo["status"];
  exitCode?: number;
};

type SessionDetails = {
  ref: SessionRef;
  session: SessionInfo;
};

function formatSessionLabel(_coordinator: string, label: string) {
  return displaySessionName(label);
}

function findSessionDetails(
  coordinators: CoordinatorInfo[],
  ref: SessionRef,
): SessionDetails | null {
  const id = ref.id.trim();
  if (!id) {
    return null;
  }
  let fallback: SessionDetails | null = null;
  for (const coord of coordinators) {
    for (const session of coord.sessions) {
      if (!session.id || session.id !== id) {
        continue;
      }
      const sessionRef = sessionRefFromSession(coord.name, session);
      if (ref.coordinator && sessionRef.coordinator !== ref.coordinator) {
        if (!fallback) {
          fallback = { ref: sessionRef, session };
        }
        continue;
      }
      return { ref: sessionRef, session };
    }
  }
  return fallback;
}

function findSession(coordinators: CoordinatorInfo[], ref: SessionRef): SelectedSession | null {
  const details = findSessionDetails(coordinators, ref);
  if (!details) {
    return null;
  }
  const session = details.session;
  return {
    ref: details.ref,
    label: session.name,
    status: session.status,
    exitCode: session.exitCode,
  };
}

export default function App() {
  const [coordinators, setCoordinators] = useState<CoordinatorInfo[]>([]);
  const [activeSession, setActiveSession] = useState<SessionRef | null>(null);
  const [selectedSession, setSelectedSession] = useState<SelectedSession | null>(null);
  const [viewMode, setViewMode] = useState<"single" | "multi">("single");
  const [screen, setScreen] = useState<ScreenState | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [ctrlArmed, setCtrlArmed] = useState(false);
  const [hashSession, setHashSession] = useState(() => readSessionHash());
  const {
    coordinators: streamCoordinators,
    loaded: sessionsLoaded,
    state: sessionsState,
  } = useVtrSessionsStream();
  const [themeId, setThemeId] = useState(() => getTheme(initialPreferences.themeId).id);
  const [terminalRenderer, setTerminalRenderer] = useState<TerminalRenderer>(() =>
    readRendererSetting(initialPreferences.terminalRenderer),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hubInfoOpen, setHubInfoOpen] = useState(false);
  const [webInfo, setWebInfo] = useState<WebInfoResponse | null>(null);
  const [webInfoError, setWebInfoError] = useState<string | null>(null);
  const [showClosedSessions, setShowClosedSessions] = useState(
    () => initialPreferences.showClosedSessions,
  );
  const [autoResize, setAutoResize] = useState(() => initialPreferences.autoResize ?? false);
  const [createBusy, setCreateBusy] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sessionRef: SessionRef;
    sessionLabel: string;
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
  const lastSelectedIndexRef = useRef<number | null>(null);
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
      ref: SessionRef;
      coordinator: string;
      session: SessionInfo;
    }> = [];
    for (const coord of visibleCoordinators) {
      for (const session of coord.sessions) {
        const ref = sessionRefFromSession(coord.name, session);
        entries.push({
          key: sessionKey(coord.name, session),
          ref,
          coordinator: coord.name,
          session,
        });
      }
    }
    return entries;
  }, [visibleCoordinators]);

  const sessionStats = useMemo(() => {
    const stats = {
      total: 0,
      running: 0,
      closing: 0,
      exited: 0,
      unknown: 0,
      idle: 0,
    };
    for (const coord of coordinators) {
      for (const session of coord.sessions) {
        stats.total += 1;
        switch (session.status) {
          case "running":
            stats.running += 1;
            if (session.idle) {
              stats.idle += 1;
            }
            break;
          case "closing":
            stats.closing += 1;
            break;
          case "exited":
            stats.exited += 1;
            break;
          default:
            stats.unknown += 1;
            break;
        }
      }
    }
    return stats;
  }, [coordinators]);

  const selectedSessionDetails = useMemo(() => {
    if (!selectedSession) {
      return null;
    }
    return findSessionDetails(coordinators, selectedSession.ref);
  }, [coordinators, selectedSession]);

  const { state, setEventHandler, sendText, sendKey, sendTextTo, sendKeyTo, resize, close, restart } =
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
    if (!hubInfoOpen) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHubInfoOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [hubInfoOpen]);

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

  useEffect(() => {
    let cancelled = false;
    fetchWebInfo()
      .then((info) => {
        if (cancelled) {
          return;
        }
        setWebInfo(info);
        setWebInfoError(null);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : "Unable to load hub info.";
        setWebInfoError(message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applySessions = useCallback((data: CoordinatorInfo[]) => {
    setCoordinators(data);
    setSelectedSession((prev) => {
      if (!prev) {
        return prev;
      }
      const match = findSession(data, prev.ref);
      if (!match) {
        return prev;
      }
      if (
        prev.status === match.status &&
        prev.exitCode === match.exitCode &&
        sessionRefEquals(prev.ref, match.ref) &&
        prev.label === match.label
      ) {
        return prev;
      }
      return { ...prev, ...match };
    });
  }, []);

  const selectSession = useCallback((ref: SessionRef, session: SessionInfo) => {
    setSelectedSession({
      ref,
      label: session.name,
      status: session.status,
      exitCode: session.exitCode,
    });
    setActiveSession(session.status === "exited" ? null : ref);
  }, []);

  const selectFallbackSession = useCallback(
    (preferredIndex: number | null) => {
      if (tabSessions.length === 0) {
        setSelectedSession(null);
        setActiveSession(null);
        return false;
      }
      const index = Math.min(Math.max(preferredIndex ?? 0, 0), tabSessions.length - 1);
      const next = tabSessions[index];
      if (!next) {
        setSelectedSession(null);
        setActiveSession(null);
        return false;
      }
      selectSession(next.ref, next.session);
      return true;
    },
    [selectSession, tabSessions],
  );

  const selectAutoSession = useCallback(() => {
    let fallback: { ref: SessionRef; session: SessionInfo } | null = null;
    for (const coord of visibleCoordinators) {
      for (const session of coord.sessions) {
        const ref = sessionRefFromSession(coord.name, session);
        if (session.status !== "exited") {
          selectSession(ref, session);
          return true;
        }
        if (!fallback) {
          fallback = { ref, session };
        }
      }
    }
    if (fallback) {
      selectSession(fallback.ref, fallback.session);
      return true;
    }
    return false;
  }, [selectSession, visibleCoordinators]);

  useEffect(() => {
    applySessions(streamCoordinators);
  }, [applySessions, streamCoordinators]);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }
    const index = tabSessions.findIndex((entry) =>
      sessionRefEquals(entry.ref, selectedSession.ref),
    );
    if (index >= 0) {
      lastSelectedIndexRef.current = index;
    }
  }, [selectedSession, tabSessions]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }
    const details = findSessionDetails(coordinators, activeSession);
    if (details && !sessionRefEquals(details.ref, activeSession)) {
      setActiveSession(details.ref);
    }
  }, [activeSession, coordinators]);

  useEffect(() => {
    if (!hashSession || selectedSession || !sessionsLoaded) {
      return;
    }
    const match = findSession(visibleCoordinators, hashSession);
    if (!match) {
      const selected = selectAutoSession();
      setHashSession(null);
      if (!selected) {
        writeSessionHash(null);
      }
      return;
    }
    setSelectedSession(match);
    setActiveSession(match.status === "exited" ? null : match.ref);
  }, [hashSession, selectedSession, sessionsLoaded, visibleCoordinators, selectAutoSession]);

  useEffect(() => {
    if (!sessionsLoaded || hashSession || selectedSession || autoSelectedRef.current) {
      return;
    }
    if (selectAutoSession()) {
      autoSelectedRef.current = true;
    }
  }, [hashSession, selectedSession, sessionsLoaded, selectAutoSession]);

  useEffect(() => {
    if (selectedSession) {
      writeSessionHash(selectedSession.ref);
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

  const selectedSessionId = selectedSession?.ref.id ?? null;

  useEffect(() => {
    if (!selectedSessionId) {
      setScreen(null);
      return;
    }
    setScreen(null);
  }, [selectedSessionId]);

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
    selectFallbackSession(lastSelectedIndexRef.current);
  }, [selectFallbackSession, selectedSession, showClosedSessions]);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }
    if (selectedSession.status === "exited" && !showClosedSessions) {
      return;
    }
    const index = tabSessions.findIndex((entry) =>
      sessionRefEquals(entry.ref, selectedSession.ref),
    );
    if (index >= 0) {
      return;
    }
    selectFallbackSession(lastSelectedIndexRef.current);
  }, [selectFallbackSession, selectedSession, showClosedSessions, tabSessions]);

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
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeSession || !screen?.waitingForKeyframe) {
      return;
    }
    pendingUpdates.current = [];
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setScreen(null);
    restart();
  }, [activeSession, restart, screen?.waitingForKeyframe]);

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
          if (!prev || !activeSession || !sessionRefEquals(prev.ref, activeSession)) {
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
    (mode: "text" | "key", value: string, targets: SessionRef[]) => {
      if (targets.length === 0) {
        return false;
      }
      if (state.status !== "open") {
        window.alert("Connect to a session before broadcasting.");
        return false;
      }
      const resolvedTargets = targets.map((target) => {
        const match = findSessionDetails(coordinators, target);
        if (!match) {
          return { ref: target, label: target.id };
        }
        return {
          ref: match.ref,
          label: formatSessionLabel(match.ref.coordinator, match.session.name),
        };
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
          sendTextTo(target.ref, value);
        } else {
          sendKeyTo(target.ref, value);
        }
      }
      return true;
    },
    [coordinators, sendKeyTo, sendTextTo, state.status],
  );

  const handleCreateSession = useCallback(
    async (coordinatorOverride?: string) => {
      if (createBusy) {
        return;
      }
      const activeCoordinator =
        (activeSession && findSessionDetails(coordinators, activeSession)?.ref.coordinator) ?? "";
      const preferredCoordinator = coordinatorOverride?.trim() ?? "";
      const coordinator =
        (preferredCoordinator && coordinatorOptions.includes(preferredCoordinator)
          ? preferredCoordinator
          : activeCoordinator && coordinatorOptions.includes(activeCoordinator)
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
        const ref = sessionRefFromSession(result.coordinator, result.session);
        setSelectedSession({
          ref,
          label: result.session.name,
          status: result.session.status,
          exitCode: result.session.exitCode,
        });
        setActiveSession(result.session.status === "exited" ? null : ref);
        setViewMode("single");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to create session.";
        window.alert(message);
      } finally {
        setCreateBusy(false);
      }
    },
    [activeSession, coordinatorOptions, coordinators, createBusy],
  );
  const runSessionAction = useCallback(async (payload: Parameters<typeof sendSessionAction>[0]) => {
    try {
      await sendSessionAction(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Session action failed.";
      window.alert(message);
    } finally {
      setContextMenu(null);
    }
  }, []);

  const handleRenameSubmit = async () => {
    if (!contextMenu || renameBusy) {
      return;
    }
    const coordinator =
      findSessionDetails(coordinators, contextMenu.sessionRef)?.ref.coordinator ??
      contextMenu.sessionRef.coordinator ??
      "";
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
      await sendSessionAction({
        id: contextMenu.sessionRef.id,
        coordinator,
        action: "rename",
        newName: nextName,
      });
      setSelectedSession((prev) =>
        prev && prev.ref.id === contextMenu.sessionRef.id ? { ...prev, label: nextName } : prev,
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
    (ref: SessionRef, session: SessionInfo) => {
      const coordinator = ref.coordinator;
      const label = formatSessionLabel(coordinator, session.name);
      if (session.status === "exited") {
        if (!window.confirm(`Remove exited session ${label}?`)) {
          return;
        }
        runSessionAction({ id: ref.id, coordinator, action: "remove" });
        return;
      }
      if (!window.confirm(`Close session ${label}?`)) {
        return;
      }
      runSessionAction({ id: ref.id, coordinator, action: "close" });
    },
    [runSessionAction],
  );

  const openContextMenuAt = useCallback(
    (coords: { x: number; y: number }, ref: SessionRef, session: SessionInfo) => {
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
        sessionRef: ref,
        sessionLabel: displaySessionName(session.name),
        status: session.status,
      });
    },
    [],
  );

  const openContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>, ref: SessionRef, session: SessionInfo) => {
      event.preventDefault();
      openContextMenuAt({ x: event.clientX, y: event.clientY }, ref, session);
    },
    [openContextMenuAt],
  );

  const activeStreamStatus = useMemo(() => {
    return streamStatusBadge(state.status, state.receiving);
  }, [state.receiving, state.status]);

  const statusBadge = useMemo(() => {
    if (selectedSession?.status === "exited") {
      const label = exitCode !== null ? `exited (${exitCode})` : "exited";
      return <Badge variant="red">{label}</Badge>;
    }
    return <Badge variant={activeStreamStatus.variant}>{activeStreamStatus.label}</Badge>;
  }, [activeStreamStatus.label, activeStreamStatus.variant, exitCode, selectedSession?.status]);

  const showExit = exitCode !== null && selectedSession?.status !== "exited";
  const displayStatus = selectedSession?.status === "exited" ? "exited" : state.status;
  const contextLabel = contextMenu
    ? formatSessionLabel(contextMenu.sessionRef.coordinator, contextMenu.sessionLabel)
    : "";
  const contextRunning = contextMenu?.status === "running" || contextMenu?.status === "closing";
  const sessionsStreamStatus = statusLabels[sessionsState.status] || statusLabels.idle;
  const webAddress = typeof window === "undefined" ? "" : window.location.host;
  const hubName = webInfo?.hub?.name?.trim() || "";
  const hubPath = webInfo?.hub?.path?.trim() || "";
  const hubError = webInfo?.errors?.hub || webInfoError;

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
                {formatSessionLabel(selectedSession.ref.coordinator, selectedSession.label)}
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
                  className="absolute right-0 mt-2 w-[90vw] max-w-md rounded-lg border border-tn-border bg-tn-panel shadow-panel"
                >
                  <ScrollArea className="max-h-[75vh]">
                    <div className="flex flex-col gap-4 p-4">
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
                      <div className="flex flex-col gap-2">
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
                      <div className="flex flex-col gap-2">
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
                      <div className="flex flex-col gap-2">
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
                      <div className="border-t border-tn-border pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-tn-muted">
                            Hub
                          </span>
                          <Badge variant={sessionsStreamStatus.variant}>
                            {sessionsStreamStatus.label}
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between border border-tn-border bg-tn-panel-2"
                            onClick={() => {
                              setHubInfoOpen(true);
                              setSettingsOpen(false);
                            }}
                            aria-haspopup="dialog"
                            aria-controls="hub-info-modal"
                          >
                            <span>View hub info</span>
                            <Badge variant={activeStreamStatus.variant}>
                              {activeStreamStatus.label}
                            </Badge>
                          </Button>
                          <span className="text-[11px] text-tn-text-dim">
                            Connection, coordinators, and session details.
                          </span>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
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
                  coordinators={coordinators}
                  activeSession={activeSession}
                  onSelect={(ref, session) => {
                    setSelectedSession({
                      ref,
                      label: session.name,
                      status: session.status,
                      exitCode: session.exitCode,
                    });
                    setActiveSession(session.status === "exited" ? null : ref);
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
                    focusKey={selectedSession?.ref.id}
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
              onSelect={(ref, session) => {
                setSelectedSession({
                  ref,
                  label: session.name,
                  status: session.status,
                  exitCode: session.exitCode,
                });
                setActiveSession(session.status === "exited" ? null : ref);
                setViewMode("single");
              }}
            />
          )}
        </section>
      </main>
      {hubInfoOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-tn-bg/80 backdrop-blur-sm"
            onClick={() => setHubInfoOpen(false)}
            aria-label="Close hub info"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hub-info-title"
            id="hub-info-modal"
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-tn-border bg-tn-panel shadow-panel"
          >
            <div className="flex items-center justify-between border-b border-tn-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span id="hub-info-title" className="text-sm font-semibold text-tn-text">
                  Hub Info
                </span>
                <Badge variant={sessionsStreamStatus.variant}>{sessionsStreamStatus.label}</Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="border border-tn-border bg-tn-panel-2"
                onClick={() => setHubInfoOpen(false)}
              >
                Close
              </Button>
            </div>
            <ScrollArea className="max-h-[70vh]">
              <div className="grid gap-3 p-4">
                <div className="rounded-lg border border-tn-border bg-tn-panel-2/80 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-tn-text">Connection</span>
                    <Badge variant={activeStreamStatus.variant}>{activeStreamStatus.label}</Badge>
                  </div>
                  <div className="mt-2 grid gap-2 text-[11px] text-tn-text-dim">
                    <div className="flex items-center justify-between gap-3">
                      <span>Web address</span>
                      <span className="font-mono text-tn-text">{webAddress || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Hub name</span>
                      <span className="font-mono text-tn-text">{hubName || "—"}</span>
                    </div>
                    <div>
                      <div className="text-tn-text-dim">Hub path</div>
                      <div className="mt-1 font-mono text-tn-text break-all">{hubPath || "—"}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>vtr version</span>
                      <span className="font-mono text-tn-text">{webInfo?.version || "—"}</span>
                    </div>
                    {hubError && (
                      <div className="text-[11px] text-tn-orange">Hub info error: {hubError}</div>
                    )}
                    {sessionsState.error && (
                      <div className="text-[11px] text-tn-orange">
                        Sessions stream: {sessionsState.error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-tn-border bg-tn-panel-2/80 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-tn-text">Coordinators</span>
                    <Badge>{coordinators.length}</Badge>
                  </div>
                  <div className="mt-2 flex flex-col gap-2 text-[11px] text-tn-text-dim">
                    {coordinators.length === 0 ? (
                      <span className="text-tn-muted">
                        {sessionsLoaded
                          ? "No coordinators reporting."
                          : "Waiting for coordinator snapshot..."}
                      </span>
                    ) : (
                      coordinators.map((coord) => {
                        const running = coord.sessions.filter(
                          (session) => session.status === "running",
                        ).length;
                        const exited = coord.sessions.filter(
                          (session) => session.status === "exited",
                        ).length;
                        return (
                          <div
                            key={`${coord.name}:${coord.path}`}
                            className="rounded-md border border-tn-border bg-tn-panel px-2 py-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-tn-text">
                                {coord.name || "unknown"}
                              </span>
                              <Badge>{coord.sessions.length}</Badge>
                            </div>
                            <div className="mt-1 font-mono text-[10px] text-tn-text-dim break-all">
                              {coord.path || "—"}
                            </div>
                            <div className="mt-1 text-[10px] text-tn-text-dim">
                              {running} running · {exited} exited
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-tn-border bg-tn-panel-2/80 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-tn-text">Sessions</span>
                    <Badge>{sessionStats.total}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-tn-text-dim">
                    <div className="rounded-md border border-tn-border bg-tn-panel px-2 py-2">
                      <div className="text-sm font-semibold text-tn-text">
                        {sessionStats.running}
                      </div>
                      <div>running</div>
                    </div>
                    <div className="rounded-md border border-tn-border bg-tn-panel px-2 py-2">
                      <div className="text-sm font-semibold text-tn-text">{sessionStats.idle}</div>
                      <div>idle</div>
                    </div>
                    <div className="rounded-md border border-tn-border bg-tn-panel px-2 py-2">
                      <div className="text-sm font-semibold text-tn-text">
                        {sessionStats.closing}
                      </div>
                      <div>closing</div>
                    </div>
                    <div className="rounded-md border border-tn-border bg-tn-panel px-2 py-2">
                      <div className="text-sm font-semibold text-tn-text">
                        {sessionStats.exited}
                      </div>
                      <div>exited</div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border border-tn-border bg-tn-panel px-2 py-2 text-[11px] text-tn-text-dim">
                    <div className="flex items-center justify-between">
                      <span>Active session</span>
                      <Badge variant="default">
                        {selectedSessionDetails?.session.status || "none"}
                      </Badge>
                    </div>
                    {selectedSessionDetails ? (
                      <div className="mt-2 grid gap-1 text-[11px] text-tn-text-dim">
                        <div className="text-sm font-semibold text-tn-text">
                          {displaySessionName(selectedSessionDetails.session.name)}
                        </div>
                        <div>
                          {selectedSessionDetails.ref.coordinator} ·{" "}
                          {selectedSessionDetails.session.cols}x
                          {selectedSessionDetails.session.rows}
                        </div>
                        {selectedSessionDetails.session.exitCode !== undefined && (
                          <div>exit code: {selectedSessionDetails.session.exitCode}</div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-tn-muted">No session selected.</div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
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
                  runSessionAction({
                    id: contextMenu.sessionRef.id,
                    coordinator: contextMenu.sessionRef.coordinator,
                    action: "close",
                  });
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
                  runSessionAction({
                    id: contextMenu.sessionRef.id,
                    coordinator: contextMenu.sessionRef.coordinator,
                    action: "signal",
                    signal: "KILL",
                  });
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
                  runSessionAction({
                    id: contextMenu.sessionRef.id,
                    coordinator: contextMenu.sessionRef.coordinator,
                    action: "send_key",
                    key: "ctrl+c",
                  });
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
                  runSessionAction({
                    id: contextMenu.sessionRef.id,
                    coordinator: contextMenu.sessionRef.coordinator,
                    action: "send_key",
                    key: "ctrl+z",
                  });
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
                  runSessionAction({
                    id: contextMenu.sessionRef.id,
                    coordinator: contextMenu.sessionRef.coordinator,
                    action: "send_key",
                    key: "ctrl+d",
                  });
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
                  runSessionAction({
                    id: contextMenu.sessionRef.id,
                    coordinator: contextMenu.sessionRef.coordinator,
                    action: "remove",
                  });
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

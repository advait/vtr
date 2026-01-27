import { useCallback, useEffect, useRef, useState } from "react";
import type { CoordinatorInfo, SessionInfo } from "../components/CoordinatorTree";
import type { SessionRef } from "./session";
import { decodeAny, encodeAny, type Session, type SessionsSnapshot, type SubscribeEvent } from "./proto";

export type StreamStatus = "idle" | "connecting" | "open" | "reconnecting" | "error" | "closed";

type StreamOptions = {
  includeRawOutput?: boolean;
};

type StreamState = {
  status: StreamStatus;
  error?: string;
};

function defaultWsUrl() {
  const { protocol, host } = window.location;
  const wsProto = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${host}/api/ws`;
}

function defaultSessionsWsUrl() {
  const { protocol, host } = window.location;
  const wsProto = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${host}/api/ws/sessions`;
}

function sessionStatusFromProto(status?: number): SessionInfo["status"] {
  switch (status) {
    case 1:
      return "running";
    case 2:
      return "closing";
    case 3:
      return "exited";
    default:
      return "unknown";
  }
}

function normalizeSession(session: Session): SessionInfo {
  return {
    id: session.id ?? "",
    name: session.name ?? "",
    status: sessionStatusFromProto(session.status),
    cols: session.cols ?? 0,
    rows: session.rows ?? 0,
    idle: session.idle ?? false,
    order: session.order ?? 0,
    exitCode: session.exit_code,
  };
}

function snapshotToCoordinators(snapshot: SessionsSnapshot): CoordinatorInfo[] {
  const coords = snapshot.coordinators ?? [];
  return coords.map((coord) => ({
    name: coord.name ?? "",
    path: coord.path ?? "",
    sessions: (coord.sessions ?? []).map(normalizeSession),
  }));
}

export function useVtrStream(sessionRef: SessionRef | null, options: StreamOptions) {
  const [state, setState] = useState<StreamState>({ status: "idle" });
  const eventRef = useRef<((event: SubscribeEvent) => void) | null>(null);
  const pendingEventsRef = useRef<SubscribeEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<{ attempts: number; timer?: number }>({ attempts: 0 });
  const closedByUser = useRef(false);
  const sessionId = sessionRef?.id?.trim() ?? "";
  const sessionCoordinator = sessionRef?.coordinator?.trim() ?? "";

  const setEventHandler = useCallback((handler: (event: SubscribeEvent) => void) => {
    eventRef.current = handler;
    if (pendingEventsRef.current.length > 0) {
      const pending = pendingEventsRef.current;
      pendingEventsRef.current = [];
      for (const event of pending) {
        handler(event);
      }
    }
  }, []);

  const close = useCallback(() => {
    closedByUser.current = true;
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  const sendProto = useCallback((typeName: string, payload: Record<string, unknown>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    const data = encodeAny(typeName as never, payload);
    wsRef.current.send(data);
  }, []);

  const normalizeText = useCallback((text: string) => text.replace(/\r?\n/g, "\r"), []);

  const sendText = useCallback(
    (text: string) => {
      if (!sessionId) return;
      sendProto("vtr.SendTextRequest", {
        session: { id: sessionId, coordinator: sessionCoordinator },
        text: normalizeText(text),
      });
    },
    [normalizeText, sendProto, sessionCoordinator, sessionId],
  );

  const sendKey = useCallback(
    (key: string) => {
      if (!sessionId) return;
      sendProto("vtr.SendKeyRequest", { session: { id: sessionId, coordinator: sessionCoordinator }, key });
    },
    [sendProto, sessionCoordinator, sessionId],
  );

  const sendTextTo = useCallback(
    (target: SessionRef, text: string) => {
      const targetId = target?.id?.trim() ?? "";
      if (!targetId) return;
      sendProto("vtr.SendTextRequest", {
        session: { id: targetId, coordinator: target.coordinator?.trim() ?? "" },
        text: normalizeText(text),
      });
    },
    [normalizeText, sendProto],
  );

  const sendKeyTo = useCallback(
    (target: SessionRef, key: string) => {
      const targetId = target?.id?.trim() ?? "";
      if (!targetId) return;
      sendProto("vtr.SendKeyRequest", {
        session: { id: targetId, coordinator: target.coordinator?.trim() ?? "" },
        key,
      });
    },
    [sendProto],
  );

  const sendBytes = useCallback(
    (data: Uint8Array) => {
      if (!sessionId) return;
      sendProto("vtr.SendBytesRequest", { session: { id: sessionId, coordinator: sessionCoordinator }, data });
    },
    [sendProto, sessionCoordinator, sessionId],
  );

  const resize = useCallback(
    (cols: number, rows: number) => {
      if (!sessionId) return;
      sendProto("vtr.ResizeRequest", {
        session: { id: sessionId, coordinator: sessionCoordinator },
        cols,
        rows,
      });
    },
    [sendProto, sessionCoordinator, sessionId],
  );

  useEffect(() => {
    if (!sessionId) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    closedByUser.current = false;
    pendingEventsRef.current = [];

    const connect = () => {
      if (cancelled) {
        return;
      }
      const ws = new WebSocket(defaultWsUrl());
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;
      setState((prev) => ({
        status: prev.status === "reconnecting" ? "reconnecting" : "connecting",
      }));

      ws.addEventListener("open", () => {
        reconnectRef.current.attempts = 0;
        if (cancelled) {
          return;
        }
        const hello = encodeAny("vtr.SubscribeRequest", {
          session: { id: sessionId, coordinator: sessionCoordinator },
          include_screen_updates: true,
          include_raw_output: options.includeRawOutput ?? false,
        });
        ws.send(hello);
        setState({ status: "open" });
      });

      ws.addEventListener("message", (event) => {
        if (cancelled) {
          return;
        }
        const handleData = (buffer: ArrayBuffer) => {
          const decoded = decodeAny(new Uint8Array(buffer));
          if (decoded.typeName === "google.rpc.Status") {
            const status = decoded.message as { code?: number; message?: string };
            setState({ status: "error", error: status.message || "stream error" });
            ws.close();
            return;
          }
          if (decoded.typeName === "vtr.SubscribeEvent") {
            const msg = decoded.message as SubscribeEvent;
            if (eventRef.current) {
              eventRef.current(msg);
            } else {
              pendingEventsRef.current.push(msg);
            }
          }
        };

        if (event.data instanceof ArrayBuffer) {
          handleData(event.data);
          return;
        }
        if (event.data instanceof Blob) {
          event.data
            .arrayBuffer()
            .then(handleData)
            .catch(() => {});
        }
      });

      ws.addEventListener("close", () => {
        if (cancelled || closedByUser.current) {
          setState({ status: "closed" });
          return;
        }
        const attempts = reconnectRef.current.attempts + 1;
        reconnectRef.current.attempts = attempts;
        const delay = Math.min(5000, 500 * attempts + attempts * 200);
        setState({ status: "reconnecting" });
        reconnectRef.current.timer = window.setTimeout(connect, delay);
      });

      ws.addEventListener("error", () => {
        if (cancelled) {
          return;
        }
        setState({ status: "error", error: "websocket error" });
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectRef.current.timer) {
        window.clearTimeout(reconnectRef.current.timer);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionCoordinator, sessionId, options.includeRawOutput]);

  return {
    state,
    setEventHandler,
    close,
    sendText,
    sendKey,
    sendTextTo,
    sendKeyTo,
    sendBytes,
    resize,
  };
}

export function useVtrSessionsStream(options: { excludeExited?: boolean } = {}) {
  const [state, setState] = useState<StreamState>({ status: "idle" });
  const [coordinators, setCoordinators] = useState<CoordinatorInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<{ attempts: number; timer?: number }>({ attempts: 0 });
  const closedByUser = useRef(false);

  const close = useCallback(() => {
    closedByUser.current = true;
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    closedByUser.current = false;

    const connect = () => {
      if (cancelled) {
        return;
      }
      const ws = new WebSocket(defaultSessionsWsUrl());
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;
      setState((prev) => ({
        status: prev.status === "reconnecting" ? "reconnecting" : "connecting",
      }));

      ws.addEventListener("open", () => {
        reconnectRef.current.attempts = 0;
        if (cancelled) {
          return;
        }
        const hello = encodeAny("vtr.SubscribeSessionsRequest", {
          exclude_exited: options.excludeExited ?? false,
        });
        ws.send(hello);
        setState({ status: "open" });
      });

      ws.addEventListener("message", (event) => {
        if (cancelled) {
          return;
        }
        const handleData = (buffer: ArrayBuffer) => {
          const decoded = decodeAny(new Uint8Array(buffer));
          if (decoded.typeName === "google.rpc.Status") {
            const status = decoded.message as { code?: number; message?: string };
            setState({ status: "error", error: status.message || "stream error" });
            ws.close();
            return;
          }
          if (decoded.typeName === "vtr.SessionsSnapshot") {
            const msg = decoded.message as SessionsSnapshot;
            setCoordinators(snapshotToCoordinators(msg));
            setLoaded(true);
          }
        };

        if (event.data instanceof ArrayBuffer) {
          handleData(event.data);
          return;
        }
        if (event.data instanceof Blob) {
          event.data
            .arrayBuffer()
            .then(handleData)
            .catch(() => {});
        }
      });

      ws.addEventListener("close", () => {
        if (cancelled || closedByUser.current) {
          setState({ status: "closed" });
          return;
        }
        const attempts = reconnectRef.current.attempts + 1;
        reconnectRef.current.attempts = attempts;
        const delay = Math.min(5000, 500 * attempts + attempts * 200);
        setState({ status: "reconnecting" });
        reconnectRef.current.timer = window.setTimeout(connect, delay);
      });

      ws.addEventListener("error", () => {
        if (cancelled) {
          return;
        }
        setState({ status: "error", error: "websocket error" });
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectRef.current.timer) {
        window.clearTimeout(reconnectRef.current.timer);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [options.excludeExited]);

  return { state, coordinators, loaded, close };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { decodeAny, encodeAny, type SubscribeEvent } from "./proto";

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

export function useVtrStream(sessionName: string | null, options: StreamOptions) {
  const [state, setState] = useState<StreamState>({ status: "idle" });
  const eventRef = useRef<((event: SubscribeEvent) => void) | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<{ attempts: number; timer?: number }>({ attempts: 0 });
  const closedByUser = useRef(false);

  const setEventHandler = useCallback((handler: (event: SubscribeEvent) => void) => {
    eventRef.current = handler;
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

  const sendText = useCallback(
    (text: string) => {
      if (!sessionName) return;
      sendProto("vtr.SendTextRequest", { name: sessionName, text });
    },
    [sendProto, sessionName],
  );

  const sendKey = useCallback(
    (key: string) => {
      if (!sessionName) return;
      sendProto("vtr.SendKeyRequest", { name: sessionName, key });
    },
    [sendProto, sessionName],
  );

  const sendTextTo = useCallback(
    (name: string, text: string) => {
      if (!name) return;
      sendProto("vtr.SendTextRequest", { name, text });
    },
    [sendProto],
  );

  const sendKeyTo = useCallback(
    (name: string, key: string) => {
      if (!name) return;
      sendProto("vtr.SendKeyRequest", { name, key });
    },
    [sendProto],
  );

  const sendBytes = useCallback(
    (data: Uint8Array) => {
      if (!sessionName) return;
      sendProto("vtr.SendBytesRequest", { name: sessionName, data });
    },
    [sendProto, sessionName],
  );

  const resize = useCallback(
    (cols: number, rows: number) => {
      if (!sessionName) return;
      sendProto("vtr.ResizeRequest", { name: sessionName, cols, rows });
    },
    [sendProto, sessionName],
  );

  useEffect(() => {
    if (!sessionName) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    closedByUser.current = false;

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
          name: sessionName,
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
            eventRef.current?.(msg);
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
  }, [sessionName, options.includeRawOutput]);

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

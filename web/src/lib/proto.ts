import type { Long } from "protobufjs";
import { google, vtr } from "../gen/proto.generated";

export type ProtoMessageName =
  | "vtr.SubscribeRequest"
  | "vtr.SubscribeEvent"
  | "vtr.ListRequest"
  | "vtr.ListResponse"
  | "vtr.SubscribeSessionsRequest"
  | "vtr.SessionsSnapshot"
  | "vtr.SendTextRequest"
  | "vtr.SendKeyRequest"
  | "vtr.SendBytesRequest"
  | "vtr.ResizeRequest";

export type ScreenCell = vtr.IScreenCell;
export type Session = vtr.ISession;
export type ScreenRow = vtr.IScreenRow;
export type GetScreenResponse = vtr.IGetScreenResponse;
export type ScreenDelta = vtr.IScreenDelta;
export type ScreenUpdate = {
  frame_id?: number | Long | null;
  base_frame_id?: number | Long | null;
  is_keyframe?: boolean | null;
  screen?: GetScreenResponse | null;
  delta?: ScreenDelta | null;
};
export type SubscribeEvent = vtr.ISubscribeEvent;
export type CoordinatorSessions = vtr.ICoordinatorSessions;
export type SessionsSnapshot = vtr.ISessionsSnapshot;
export type Status = google.rpc.IStatus;

type OutboundMessageCtor = {
  create(payload?: Record<string, unknown>): unknown;
  encode(message: unknown): { finish(): Uint8Array };
};

type DecodedMessage = Status | SubscribeEvent | SessionsSnapshot;

const outboundTypes: Record<ProtoMessageName, OutboundMessageCtor> = {
  "vtr.SubscribeRequest": vtr.SubscribeRequest,
  "vtr.SubscribeEvent": vtr.SubscribeEvent,
  "vtr.ListRequest": vtr.ListRequest,
  "vtr.ListResponse": vtr.ListResponse,
  "vtr.SubscribeSessionsRequest": vtr.SubscribeSessionsRequest,
  "vtr.SessionsSnapshot": vtr.SessionsSnapshot,
  "vtr.SendTextRequest": vtr.SendTextRequest,
  "vtr.SendKeyRequest": vtr.SendKeyRequest,
  "vtr.SendBytesRequest": vtr.SendBytesRequest,
  "vtr.ResizeRequest": vtr.ResizeRequest,
};

const inboundDecoders: Record<string, (value: Uint8Array) => DecodedMessage> = {
  "vtr.SubscribeEvent": (value) => vtr.SubscribeEvent.decode(value),
  "vtr.SessionsSnapshot": (value) => vtr.SessionsSnapshot.decode(value),
};

export function encodeAny(typeName: ProtoMessageName, payload: Record<string, unknown>) {
  const messageType = outboundTypes[typeName];
  const value = messageType.encode(messageType.create(payload)).finish();
  const any = google.protobuf.Any.create({
    type_url: `type.googleapis.com/${typeName}`,
    value,
  });
  return google.protobuf.Any.encode(any).finish();
}

export function decodeAny(buffer: Uint8Array) {
  const any = google.protobuf.Any.decode(buffer);
  const typeUrl = any.type_url || "";
  const typeName = typeUrl.replace("type.googleapis.com/", "");
  if (typeName === "google.rpc.Status") {
    const status = google.rpc.Status.decode(any.value ?? new Uint8Array()) as Status;
    return { typeName, message: status };
  }
  const decode = inboundDecoders[typeName];
  if (!decode) {
    throw new Error(`unsupported Any type: ${typeName}`);
  }
  return { typeName, message: decode(any.value ?? new Uint8Array()) };
}

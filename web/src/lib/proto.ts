import protobuf from "protobufjs";

const anyProto = `
syntax = "proto3";
package google.protobuf;
message Any {
  string type_url = 1;
  bytes value = 2;
}
`;

const statusProto = `
syntax = "proto3";
package google.rpc;
import "google/protobuf/any.proto";
message Status {
  int32 code = 1;
  string message = 2;
  repeated google.protobuf.Any details = 3;
}
`;

const vtrProto = `
syntax = "proto3";
package vtr;

enum SessionStatus {
  SESSION_STATUS_UNSPECIFIED = 0;
  SESSION_STATUS_RUNNING = 1;
  SESSION_STATUS_EXITED = 2;
}

message Session {
  string name = 1;
  SessionStatus status = 2;
  int32 cols = 3;
  int32 rows = 4;
  int32 exit_code = 5;
}

message ListRequest {}
message ListResponse { repeated Session sessions = 1; }

message SubscribeRequest {
  string name = 1;
  bool include_screen_updates = 2;
  bool include_raw_output = 3;
}

message ScreenCell {
  string char = 1;
  int32 fg_color = 2;
  int32 bg_color = 3;
  uint32 attributes = 4;
}

message ScreenRow { repeated ScreenCell cells = 1; }

message GetScreenResponse {
  string name = 1;
  int32 cols = 2;
  int32 rows = 3;
  int32 cursor_x = 4;
  int32 cursor_y = 5;
  repeated ScreenRow screen_rows = 6;
}

message ScreenUpdate {
  uint64 frame_id = 1;
  uint64 base_frame_id = 2;
  bool is_keyframe = 3;
  GetScreenResponse screen = 4;
  ScreenDelta delta = 5;
}

message ScreenDelta {
  int32 cols = 1;
  int32 rows = 2;
  int32 cursor_x = 3;
  int32 cursor_y = 4;
  repeated RowDelta row_deltas = 5;
}

message RowDelta {
  int32 row = 1;
  ScreenRow row_data = 2;
}

message SessionExited { int32 exit_code = 1; }

message SubscribeEvent {
  oneof event {
    ScreenUpdate screen_update = 1;
    bytes raw_output = 2;
    SessionExited session_exited = 3;
  }
}

message SendTextRequest { string name = 1; string text = 2; }
message SendKeyRequest { string name = 1; string key = 2; }
message SendBytesRequest { string name = 1; bytes data = 2; }
message ResizeRequest { string name = 1; int32 cols = 2; int32 rows = 3; }
`;

const root = new protobuf.Root();
protobuf.parse(anyProto, root, { keepCase: true });
protobuf.parse(statusProto, root, { keepCase: true });
protobuf.parse(vtrProto, root, { keepCase: true });

const AnyType = root.lookupType("google.protobuf.Any");
const StatusType = root.lookupType("google.rpc.Status");

export type ProtoMessageName =
  | "vtr.SubscribeRequest"
  | "vtr.SubscribeEvent"
  | "vtr.ListRequest"
  | "vtr.ListResponse"
  | "vtr.SendTextRequest"
  | "vtr.SendKeyRequest"
  | "vtr.SendBytesRequest"
  | "vtr.ResizeRequest";

export type ScreenCell = {
  char?: string;
  fg_color?: number;
  bg_color?: number;
  attributes?: number;
};

export type ScreenRow = { cells?: ScreenCell[] };

export type GetScreenResponse = {
  name?: string;
  cols?: number;
  rows?: number;
  cursor_x?: number;
  cursor_y?: number;
  screen_rows?: ScreenRow[];
};

export type ScreenDelta = {
  cols?: number;
  rows?: number;
  cursor_x?: number;
  cursor_y?: number;
  row_deltas?: { row?: number; row_data?: ScreenRow }[];
};

export type ScreenUpdate = {
  frame_id?: number | protobuf.Long;
  base_frame_id?: number | protobuf.Long;
  is_keyframe?: boolean;
  screen?: GetScreenResponse | null;
  delta?: ScreenDelta | null;
};

export type SubscribeEvent = {
  screen_update?: ScreenUpdate | null;
  raw_output?: Uint8Array;
  session_exited?: { exit_code?: number } | null;
};

export type Status = { code?: number; message?: string };

export function encodeAny(typeName: ProtoMessageName, payload: Record<string, unknown>) {
  const type = root.lookupType(typeName);
  const message = type.create(payload);
  const value = type.encode(message).finish();
  const any = AnyType.create({
    type_url: `type.googleapis.com/${typeName}`,
    value,
  });
  return AnyType.encode(any).finish();
}

export function decodeAny(buffer: Uint8Array) {
  const any = AnyType.decode(buffer) as { type_url?: string; value?: Uint8Array };
  const typeUrl = any.type_url || "";
  const typeName = typeUrl.replace("type.googleapis.com/", "");
  if (typeName === "google.rpc.Status") {
    const status = StatusType.decode(any.value ?? new Uint8Array()) as Status;
    return { typeName, message: status };
  }
  const type = root.lookupType(typeName);
  const message = type.decode(any.value ?? new Uint8Array());
  return { typeName, message };
}

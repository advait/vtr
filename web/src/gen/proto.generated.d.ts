import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace vtr. */
export namespace vtr {

    /** SessionStatus enum. */
    enum SessionStatus {
        SESSION_STATUS_UNSPECIFIED = 0,
        SESSION_STATUS_RUNNING = 1,
        SESSION_STATUS_CLOSING = 2,
        SESSION_STATUS_EXITED = 3
    }

    /** Properties of a Session. */
    interface ISession {

        /** Session name */
        name?: (string|null);

        /** Session status */
        status?: (vtr.SessionStatus|null);

        /** Session cols */
        cols?: (number|null);

        /** Session rows */
        rows?: (number|null);

        /** Session exit_code */
        exit_code?: (number|null);

        /** Session created_at */
        created_at?: (google.protobuf.ITimestamp|null);

        /** Session exited_at */
        exited_at?: (google.protobuf.ITimestamp|null);

        /** Session idle */
        idle?: (boolean|null);

        /** Session order */
        order?: (number|null);

        /** Session id */
        id?: (string|null);
    }

    /** Represents a Session. */
    class Session implements ISession {

        /**
         * Constructs a new Session.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISession);

        /** Session name. */
        public name: string;

        /** Session status. */
        public status: vtr.SessionStatus;

        /** Session cols. */
        public cols: number;

        /** Session rows. */
        public rows: number;

        /** Session exit_code. */
        public exit_code: number;

        /** Session created_at. */
        public created_at?: (google.protobuf.ITimestamp|null);

        /** Session exited_at. */
        public exited_at?: (google.protobuf.ITimestamp|null);

        /** Session idle. */
        public idle: boolean;

        /** Session order. */
        public order: number;

        /** Session id. */
        public id: string;

        /**
         * Creates a new Session instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Session instance
         */
        public static create(properties?: vtr.ISession): vtr.Session;

        /**
         * Encodes the specified Session message. Does not implicitly {@link vtr.Session.verify|verify} messages.
         * @param message Session message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISession, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Session message, length delimited. Does not implicitly {@link vtr.Session.verify|verify} messages.
         * @param message Session message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISession, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Session message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Session
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.Session;

        /**
         * Decodes a Session message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Session
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.Session;

        /**
         * Verifies a Session message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Session message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Session
         */
        public static fromObject(object: { [k: string]: any }): vtr.Session;

        /**
         * Creates a plain object from a Session message. Also converts values to other types if specified.
         * @param message Session
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.Session, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Session to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Session
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SessionRef. */
    interface ISessionRef {

        /** SessionRef id */
        id?: (string|null);

        /** SessionRef coordinator */
        coordinator?: (string|null);
    }

    /** Represents a SessionRef. */
    class SessionRef implements ISessionRef {

        /**
         * Constructs a new SessionRef.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISessionRef);

        /** SessionRef id. */
        public id: string;

        /** SessionRef coordinator. */
        public coordinator: string;

        /**
         * Creates a new SessionRef instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SessionRef instance
         */
        public static create(properties?: vtr.ISessionRef): vtr.SessionRef;

        /**
         * Encodes the specified SessionRef message. Does not implicitly {@link vtr.SessionRef.verify|verify} messages.
         * @param message SessionRef message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISessionRef, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SessionRef message, length delimited. Does not implicitly {@link vtr.SessionRef.verify|verify} messages.
         * @param message SessionRef message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISessionRef, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SessionRef message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SessionRef
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SessionRef;

        /**
         * Decodes a SessionRef message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SessionRef
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SessionRef;

        /**
         * Verifies a SessionRef message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SessionRef message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SessionRef
         */
        public static fromObject(object: { [k: string]: any }): vtr.SessionRef;

        /**
         * Creates a plain object from a SessionRef message. Also converts values to other types if specified.
         * @param message SessionRef
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SessionRef, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SessionRef to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SessionRef
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SpawnRequest. */
    interface ISpawnRequest {

        /** SpawnRequest name */
        name?: (string|null);

        /** SpawnRequest command */
        command?: (string|null);

        /** SpawnRequest working_dir */
        working_dir?: (string|null);

        /** SpawnRequest env */
        env?: ({ [k: string]: string }|null);

        /** SpawnRequest cols */
        cols?: (number|null);

        /** SpawnRequest rows */
        rows?: (number|null);
    }

    /** Represents a SpawnRequest. */
    class SpawnRequest implements ISpawnRequest {

        /**
         * Constructs a new SpawnRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISpawnRequest);

        /** SpawnRequest name. */
        public name: string;

        /** SpawnRequest command. */
        public command: string;

        /** SpawnRequest working_dir. */
        public working_dir: string;

        /** SpawnRequest env. */
        public env: { [k: string]: string };

        /** SpawnRequest cols. */
        public cols: number;

        /** SpawnRequest rows. */
        public rows: number;

        /**
         * Creates a new SpawnRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SpawnRequest instance
         */
        public static create(properties?: vtr.ISpawnRequest): vtr.SpawnRequest;

        /**
         * Encodes the specified SpawnRequest message. Does not implicitly {@link vtr.SpawnRequest.verify|verify} messages.
         * @param message SpawnRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISpawnRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SpawnRequest message, length delimited. Does not implicitly {@link vtr.SpawnRequest.verify|verify} messages.
         * @param message SpawnRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISpawnRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SpawnRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SpawnRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SpawnRequest;

        /**
         * Decodes a SpawnRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SpawnRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SpawnRequest;

        /**
         * Verifies a SpawnRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SpawnRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SpawnRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.SpawnRequest;

        /**
         * Creates a plain object from a SpawnRequest message. Also converts values to other types if specified.
         * @param message SpawnRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SpawnRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SpawnRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SpawnRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SpawnResponse. */
    interface ISpawnResponse {

        /** SpawnResponse session */
        session?: (vtr.ISession|null);
    }

    /** Represents a SpawnResponse. */
    class SpawnResponse implements ISpawnResponse {

        /**
         * Constructs a new SpawnResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISpawnResponse);

        /** SpawnResponse session. */
        public session?: (vtr.ISession|null);

        /**
         * Creates a new SpawnResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SpawnResponse instance
         */
        public static create(properties?: vtr.ISpawnResponse): vtr.SpawnResponse;

        /**
         * Encodes the specified SpawnResponse message. Does not implicitly {@link vtr.SpawnResponse.verify|verify} messages.
         * @param message SpawnResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISpawnResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SpawnResponse message, length delimited. Does not implicitly {@link vtr.SpawnResponse.verify|verify} messages.
         * @param message SpawnResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISpawnResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SpawnResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SpawnResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SpawnResponse;

        /**
         * Decodes a SpawnResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SpawnResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SpawnResponse;

        /**
         * Verifies a SpawnResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SpawnResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SpawnResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.SpawnResponse;

        /**
         * Creates a plain object from a SpawnResponse message. Also converts values to other types if specified.
         * @param message SpawnResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SpawnResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SpawnResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SpawnResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ListRequest. */
    interface IListRequest {
    }

    /** Represents a ListRequest. */
    class ListRequest implements IListRequest {

        /**
         * Constructs a new ListRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IListRequest);

        /**
         * Creates a new ListRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListRequest instance
         */
        public static create(properties?: vtr.IListRequest): vtr.ListRequest;

        /**
         * Encodes the specified ListRequest message. Does not implicitly {@link vtr.ListRequest.verify|verify} messages.
         * @param message ListRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IListRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ListRequest message, length delimited. Does not implicitly {@link vtr.ListRequest.verify|verify} messages.
         * @param message ListRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IListRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ListRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.ListRequest;

        /**
         * Decodes a ListRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ListRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.ListRequest;

        /**
         * Verifies a ListRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ListRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ListRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.ListRequest;

        /**
         * Creates a plain object from a ListRequest message. Also converts values to other types if specified.
         * @param message ListRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.ListRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ListRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ListRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ListResponse. */
    interface IListResponse {

        /** ListResponse sessions */
        sessions?: (vtr.ISession[]|null);
    }

    /** Represents a ListResponse. */
    class ListResponse implements IListResponse {

        /**
         * Constructs a new ListResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IListResponse);

        /** ListResponse sessions. */
        public sessions: vtr.ISession[];

        /**
         * Creates a new ListResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListResponse instance
         */
        public static create(properties?: vtr.IListResponse): vtr.ListResponse;

        /**
         * Encodes the specified ListResponse message. Does not implicitly {@link vtr.ListResponse.verify|verify} messages.
         * @param message ListResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IListResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ListResponse message, length delimited. Does not implicitly {@link vtr.ListResponse.verify|verify} messages.
         * @param message ListResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IListResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ListResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.ListResponse;

        /**
         * Decodes a ListResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ListResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.ListResponse;

        /**
         * Verifies a ListResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ListResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ListResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.ListResponse;

        /**
         * Creates a plain object from a ListResponse message. Also converts values to other types if specified.
         * @param message ListResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.ListResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ListResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ListResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SubscribeSessionsRequest. */
    interface ISubscribeSessionsRequest {

        /** SubscribeSessionsRequest exclude_exited */
        exclude_exited?: (boolean|null);
    }

    /** Represents a SubscribeSessionsRequest. */
    class SubscribeSessionsRequest implements ISubscribeSessionsRequest {

        /**
         * Constructs a new SubscribeSessionsRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISubscribeSessionsRequest);

        /** SubscribeSessionsRequest exclude_exited. */
        public exclude_exited: boolean;

        /**
         * Creates a new SubscribeSessionsRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SubscribeSessionsRequest instance
         */
        public static create(properties?: vtr.ISubscribeSessionsRequest): vtr.SubscribeSessionsRequest;

        /**
         * Encodes the specified SubscribeSessionsRequest message. Does not implicitly {@link vtr.SubscribeSessionsRequest.verify|verify} messages.
         * @param message SubscribeSessionsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISubscribeSessionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SubscribeSessionsRequest message, length delimited. Does not implicitly {@link vtr.SubscribeSessionsRequest.verify|verify} messages.
         * @param message SubscribeSessionsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISubscribeSessionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SubscribeSessionsRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SubscribeSessionsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SubscribeSessionsRequest;

        /**
         * Decodes a SubscribeSessionsRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SubscribeSessionsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SubscribeSessionsRequest;

        /**
         * Verifies a SubscribeSessionsRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SubscribeSessionsRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SubscribeSessionsRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.SubscribeSessionsRequest;

        /**
         * Creates a plain object from a SubscribeSessionsRequest message. Also converts values to other types if specified.
         * @param message SubscribeSessionsRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SubscribeSessionsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SubscribeSessionsRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SubscribeSessionsRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SpokeInfo. */
    interface ISpokeInfo {

        /** SpokeInfo name */
        name?: (string|null);

        /** SpokeInfo labels */
        labels?: ({ [k: string]: string }|null);

        /** SpokeInfo version */
        version?: (string|null);
    }

    /** Represents a SpokeInfo. */
    class SpokeInfo implements ISpokeInfo {

        /**
         * Constructs a new SpokeInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISpokeInfo);

        /** SpokeInfo name. */
        public name: string;

        /** SpokeInfo labels. */
        public labels: { [k: string]: string };

        /** SpokeInfo version. */
        public version: string;

        /**
         * Creates a new SpokeInfo instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SpokeInfo instance
         */
        public static create(properties?: vtr.ISpokeInfo): vtr.SpokeInfo;

        /**
         * Encodes the specified SpokeInfo message. Does not implicitly {@link vtr.SpokeInfo.verify|verify} messages.
         * @param message SpokeInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISpokeInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SpokeInfo message, length delimited. Does not implicitly {@link vtr.SpokeInfo.verify|verify} messages.
         * @param message SpokeInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISpokeInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SpokeInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SpokeInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SpokeInfo;

        /**
         * Decodes a SpokeInfo message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SpokeInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SpokeInfo;

        /**
         * Verifies a SpokeInfo message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SpokeInfo message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SpokeInfo
         */
        public static fromObject(object: { [k: string]: any }): vtr.SpokeInfo;

        /**
         * Creates a plain object from a SpokeInfo message. Also converts values to other types if specified.
         * @param message SpokeInfo
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SpokeInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SpokeInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SpokeInfo
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TunnelFrame. */
    interface ITunnelFrame {

        /** TunnelFrame call_id */
        call_id?: (string|null);

        /** TunnelFrame hello */
        hello?: (vtr.ITunnelHello|null);

        /** TunnelFrame request */
        request?: (vtr.ITunnelRequest|null);

        /** TunnelFrame response */
        response?: (vtr.ITunnelResponse|null);

        /** TunnelFrame event */
        event?: (vtr.ITunnelStreamEvent|null);

        /** TunnelFrame cancel */
        cancel?: (vtr.ITunnelCancel|null);

        /** TunnelFrame error */
        error?: (vtr.ITunnelError|null);

        /** TunnelFrame trace */
        trace?: (vtr.ITunnelTraceBatch|null);
    }

    /** Represents a TunnelFrame. */
    class TunnelFrame implements ITunnelFrame {

        /**
         * Constructs a new TunnelFrame.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ITunnelFrame);

        /** TunnelFrame call_id. */
        public call_id: string;

        /** TunnelFrame hello. */
        public hello?: (vtr.ITunnelHello|null);

        /** TunnelFrame request. */
        public request?: (vtr.ITunnelRequest|null);

        /** TunnelFrame response. */
        public response?: (vtr.ITunnelResponse|null);

        /** TunnelFrame event. */
        public event?: (vtr.ITunnelStreamEvent|null);

        /** TunnelFrame cancel. */
        public cancel?: (vtr.ITunnelCancel|null);

        /** TunnelFrame error. */
        public error?: (vtr.ITunnelError|null);

        /** TunnelFrame trace. */
        public trace?: (vtr.ITunnelTraceBatch|null);

        /** TunnelFrame kind. */
        public kind?: ("hello"|"request"|"response"|"event"|"cancel"|"error"|"trace");

        /**
         * Creates a new TunnelFrame instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TunnelFrame instance
         */
        public static create(properties?: vtr.ITunnelFrame): vtr.TunnelFrame;

        /**
         * Encodes the specified TunnelFrame message. Does not implicitly {@link vtr.TunnelFrame.verify|verify} messages.
         * @param message TunnelFrame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ITunnelFrame, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TunnelFrame message, length delimited. Does not implicitly {@link vtr.TunnelFrame.verify|verify} messages.
         * @param message TunnelFrame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ITunnelFrame, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TunnelFrame message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TunnelFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.TunnelFrame;

        /**
         * Decodes a TunnelFrame message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TunnelFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.TunnelFrame;

        /**
         * Verifies a TunnelFrame message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TunnelFrame message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TunnelFrame
         */
        public static fromObject(object: { [k: string]: any }): vtr.TunnelFrame;

        /**
         * Creates a plain object from a TunnelFrame message. Also converts values to other types if specified.
         * @param message TunnelFrame
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.TunnelFrame, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TunnelFrame to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TunnelFrame
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TunnelHello. */
    interface ITunnelHello {

        /** TunnelHello version */
        version?: (string|null);

        /** TunnelHello labels */
        labels?: ({ [k: string]: string }|null);

        /** TunnelHello name */
        name?: (string|null);
    }

    /** Represents a TunnelHello. */
    class TunnelHello implements ITunnelHello {

        /**
         * Constructs a new TunnelHello.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ITunnelHello);

        /** TunnelHello version. */
        public version: string;

        /** TunnelHello labels. */
        public labels: { [k: string]: string };

        /** TunnelHello name. */
        public name: string;

        /**
         * Creates a new TunnelHello instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TunnelHello instance
         */
        public static create(properties?: vtr.ITunnelHello): vtr.TunnelHello;

        /**
         * Encodes the specified TunnelHello message. Does not implicitly {@link vtr.TunnelHello.verify|verify} messages.
         * @param message TunnelHello message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ITunnelHello, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TunnelHello message, length delimited. Does not implicitly {@link vtr.TunnelHello.verify|verify} messages.
         * @param message TunnelHello message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ITunnelHello, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TunnelHello message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TunnelHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.TunnelHello;

        /**
         * Decodes a TunnelHello message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TunnelHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.TunnelHello;

        /**
         * Verifies a TunnelHello message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TunnelHello message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TunnelHello
         */
        public static fromObject(object: { [k: string]: any }): vtr.TunnelHello;

        /**
         * Creates a plain object from a TunnelHello message. Also converts values to other types if specified.
         * @param message TunnelHello
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.TunnelHello, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TunnelHello to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TunnelHello
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TunnelRequest. */
    interface ITunnelRequest {

        /** TunnelRequest method */
        method?: (string|null);

        /** TunnelRequest payload */
        payload?: (Uint8Array|null);

        /** TunnelRequest stream */
        stream?: (boolean|null);

        /** TunnelRequest trace_parent */
        trace_parent?: (string|null);

        /** TunnelRequest trace_state */
        trace_state?: (string|null);

        /** TunnelRequest baggage */
        baggage?: (string|null);
    }

    /** Represents a TunnelRequest. */
    class TunnelRequest implements ITunnelRequest {

        /**
         * Constructs a new TunnelRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ITunnelRequest);

        /** TunnelRequest method. */
        public method: string;

        /** TunnelRequest payload. */
        public payload: Uint8Array;

        /** TunnelRequest stream. */
        public stream: boolean;

        /** TunnelRequest trace_parent. */
        public trace_parent: string;

        /** TunnelRequest trace_state. */
        public trace_state: string;

        /** TunnelRequest baggage. */
        public baggage: string;

        /**
         * Creates a new TunnelRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TunnelRequest instance
         */
        public static create(properties?: vtr.ITunnelRequest): vtr.TunnelRequest;

        /**
         * Encodes the specified TunnelRequest message. Does not implicitly {@link vtr.TunnelRequest.verify|verify} messages.
         * @param message TunnelRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ITunnelRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TunnelRequest message, length delimited. Does not implicitly {@link vtr.TunnelRequest.verify|verify} messages.
         * @param message TunnelRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ITunnelRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TunnelRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TunnelRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.TunnelRequest;

        /**
         * Decodes a TunnelRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TunnelRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.TunnelRequest;

        /**
         * Verifies a TunnelRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TunnelRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TunnelRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.TunnelRequest;

        /**
         * Creates a plain object from a TunnelRequest message. Also converts values to other types if specified.
         * @param message TunnelRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.TunnelRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TunnelRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TunnelRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TunnelResponse. */
    interface ITunnelResponse {

        /** TunnelResponse payload */
        payload?: (Uint8Array|null);

        /** TunnelResponse done */
        done?: (boolean|null);
    }

    /** Represents a TunnelResponse. */
    class TunnelResponse implements ITunnelResponse {

        /**
         * Constructs a new TunnelResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ITunnelResponse);

        /** TunnelResponse payload. */
        public payload: Uint8Array;

        /** TunnelResponse done. */
        public done: boolean;

        /**
         * Creates a new TunnelResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TunnelResponse instance
         */
        public static create(properties?: vtr.ITunnelResponse): vtr.TunnelResponse;

        /**
         * Encodes the specified TunnelResponse message. Does not implicitly {@link vtr.TunnelResponse.verify|verify} messages.
         * @param message TunnelResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ITunnelResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TunnelResponse message, length delimited. Does not implicitly {@link vtr.TunnelResponse.verify|verify} messages.
         * @param message TunnelResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ITunnelResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TunnelResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TunnelResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.TunnelResponse;

        /**
         * Decodes a TunnelResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TunnelResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.TunnelResponse;

        /**
         * Verifies a TunnelResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TunnelResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TunnelResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.TunnelResponse;

        /**
         * Creates a plain object from a TunnelResponse message. Also converts values to other types if specified.
         * @param message TunnelResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.TunnelResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TunnelResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TunnelResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TunnelStreamEvent. */
    interface ITunnelStreamEvent {

        /** TunnelStreamEvent payload */
        payload?: (Uint8Array|null);
    }

    /** Represents a TunnelStreamEvent. */
    class TunnelStreamEvent implements ITunnelStreamEvent {

        /**
         * Constructs a new TunnelStreamEvent.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ITunnelStreamEvent);

        /** TunnelStreamEvent payload. */
        public payload: Uint8Array;

        /**
         * Creates a new TunnelStreamEvent instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TunnelStreamEvent instance
         */
        public static create(properties?: vtr.ITunnelStreamEvent): vtr.TunnelStreamEvent;

        /**
         * Encodes the specified TunnelStreamEvent message. Does not implicitly {@link vtr.TunnelStreamEvent.verify|verify} messages.
         * @param message TunnelStreamEvent message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ITunnelStreamEvent, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TunnelStreamEvent message, length delimited. Does not implicitly {@link vtr.TunnelStreamEvent.verify|verify} messages.
         * @param message TunnelStreamEvent message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ITunnelStreamEvent, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TunnelStreamEvent message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TunnelStreamEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.TunnelStreamEvent;

        /**
         * Decodes a TunnelStreamEvent message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TunnelStreamEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.TunnelStreamEvent;

        /**
         * Verifies a TunnelStreamEvent message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TunnelStreamEvent message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TunnelStreamEvent
         */
        public static fromObject(object: { [k: string]: any }): vtr.TunnelStreamEvent;

        /**
         * Creates a plain object from a TunnelStreamEvent message. Also converts values to other types if specified.
         * @param message TunnelStreamEvent
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.TunnelStreamEvent, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TunnelStreamEvent to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TunnelStreamEvent
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TunnelCancel. */
    interface ITunnelCancel {

        /** TunnelCancel reason */
        reason?: (string|null);
    }

    /** Represents a TunnelCancel. */
    class TunnelCancel implements ITunnelCancel {

        /**
         * Constructs a new TunnelCancel.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ITunnelCancel);

        /** TunnelCancel reason. */
        public reason: string;

        /**
         * Creates a new TunnelCancel instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TunnelCancel instance
         */
        public static create(properties?: vtr.ITunnelCancel): vtr.TunnelCancel;

        /**
         * Encodes the specified TunnelCancel message. Does not implicitly {@link vtr.TunnelCancel.verify|verify} messages.
         * @param message TunnelCancel message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ITunnelCancel, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TunnelCancel message, length delimited. Does not implicitly {@link vtr.TunnelCancel.verify|verify} messages.
         * @param message TunnelCancel message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ITunnelCancel, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TunnelCancel message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TunnelCancel
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.TunnelCancel;

        /**
         * Decodes a TunnelCancel message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TunnelCancel
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.TunnelCancel;

        /**
         * Verifies a TunnelCancel message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TunnelCancel message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TunnelCancel
         */
        public static fromObject(object: { [k: string]: any }): vtr.TunnelCancel;

        /**
         * Creates a plain object from a TunnelCancel message. Also converts values to other types if specified.
         * @param message TunnelCancel
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.TunnelCancel, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TunnelCancel to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TunnelCancel
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TunnelError. */
    interface ITunnelError {

        /** TunnelError code */
        code?: (number|null);

        /** TunnelError message */
        message?: (string|null);
    }

    /** Represents a TunnelError. */
    class TunnelError implements ITunnelError {

        /**
         * Constructs a new TunnelError.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ITunnelError);

        /** TunnelError code. */
        public code: number;

        /** TunnelError message. */
        public message: string;

        /**
         * Creates a new TunnelError instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TunnelError instance
         */
        public static create(properties?: vtr.ITunnelError): vtr.TunnelError;

        /**
         * Encodes the specified TunnelError message. Does not implicitly {@link vtr.TunnelError.verify|verify} messages.
         * @param message TunnelError message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ITunnelError, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TunnelError message, length delimited. Does not implicitly {@link vtr.TunnelError.verify|verify} messages.
         * @param message TunnelError message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ITunnelError, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TunnelError message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TunnelError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.TunnelError;

        /**
         * Decodes a TunnelError message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TunnelError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.TunnelError;

        /**
         * Verifies a TunnelError message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TunnelError message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TunnelError
         */
        public static fromObject(object: { [k: string]: any }): vtr.TunnelError;

        /**
         * Creates a plain object from a TunnelError message. Also converts values to other types if specified.
         * @param message TunnelError
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.TunnelError, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TunnelError to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TunnelError
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TunnelTraceBatch. */
    interface ITunnelTraceBatch {

        /** TunnelTraceBatch payload */
        payload?: (Uint8Array|null);
    }

    /** Represents a TunnelTraceBatch. */
    class TunnelTraceBatch implements ITunnelTraceBatch {

        /**
         * Constructs a new TunnelTraceBatch.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ITunnelTraceBatch);

        /** TunnelTraceBatch payload. */
        public payload: Uint8Array;

        /**
         * Creates a new TunnelTraceBatch instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TunnelTraceBatch instance
         */
        public static create(properties?: vtr.ITunnelTraceBatch): vtr.TunnelTraceBatch;

        /**
         * Encodes the specified TunnelTraceBatch message. Does not implicitly {@link vtr.TunnelTraceBatch.verify|verify} messages.
         * @param message TunnelTraceBatch message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ITunnelTraceBatch, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TunnelTraceBatch message, length delimited. Does not implicitly {@link vtr.TunnelTraceBatch.verify|verify} messages.
         * @param message TunnelTraceBatch message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ITunnelTraceBatch, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TunnelTraceBatch message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TunnelTraceBatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.TunnelTraceBatch;

        /**
         * Decodes a TunnelTraceBatch message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TunnelTraceBatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.TunnelTraceBatch;

        /**
         * Verifies a TunnelTraceBatch message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TunnelTraceBatch message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TunnelTraceBatch
         */
        public static fromObject(object: { [k: string]: any }): vtr.TunnelTraceBatch;

        /**
         * Creates a plain object from a TunnelTraceBatch message. Also converts values to other types if specified.
         * @param message TunnelTraceBatch
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.TunnelTraceBatch, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TunnelTraceBatch to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TunnelTraceBatch
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a CoordinatorSessions. */
    interface ICoordinatorSessions {

        /** CoordinatorSessions name */
        name?: (string|null);

        /** CoordinatorSessions path */
        path?: (string|null);

        /** CoordinatorSessions sessions */
        sessions?: (vtr.ISession[]|null);

        /** CoordinatorSessions error */
        error?: (string|null);
    }

    /** Represents a CoordinatorSessions. */
    class CoordinatorSessions implements ICoordinatorSessions {

        /**
         * Constructs a new CoordinatorSessions.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ICoordinatorSessions);

        /** CoordinatorSessions name. */
        public name: string;

        /** CoordinatorSessions path. */
        public path: string;

        /** CoordinatorSessions sessions. */
        public sessions: vtr.ISession[];

        /** CoordinatorSessions error. */
        public error: string;

        /**
         * Creates a new CoordinatorSessions instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CoordinatorSessions instance
         */
        public static create(properties?: vtr.ICoordinatorSessions): vtr.CoordinatorSessions;

        /**
         * Encodes the specified CoordinatorSessions message. Does not implicitly {@link vtr.CoordinatorSessions.verify|verify} messages.
         * @param message CoordinatorSessions message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ICoordinatorSessions, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CoordinatorSessions message, length delimited. Does not implicitly {@link vtr.CoordinatorSessions.verify|verify} messages.
         * @param message CoordinatorSessions message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ICoordinatorSessions, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CoordinatorSessions message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CoordinatorSessions
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.CoordinatorSessions;

        /**
         * Decodes a CoordinatorSessions message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CoordinatorSessions
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.CoordinatorSessions;

        /**
         * Verifies a CoordinatorSessions message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CoordinatorSessions message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CoordinatorSessions
         */
        public static fromObject(object: { [k: string]: any }): vtr.CoordinatorSessions;

        /**
         * Creates a plain object from a CoordinatorSessions message. Also converts values to other types if specified.
         * @param message CoordinatorSessions
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.CoordinatorSessions, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CoordinatorSessions to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CoordinatorSessions
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SessionsSnapshot. */
    interface ISessionsSnapshot {

        /** SessionsSnapshot coordinators */
        coordinators?: (vtr.ICoordinatorSessions[]|null);
    }

    /** Represents a SessionsSnapshot. */
    class SessionsSnapshot implements ISessionsSnapshot {

        /**
         * Constructs a new SessionsSnapshot.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISessionsSnapshot);

        /** SessionsSnapshot coordinators. */
        public coordinators: vtr.ICoordinatorSessions[];

        /**
         * Creates a new SessionsSnapshot instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SessionsSnapshot instance
         */
        public static create(properties?: vtr.ISessionsSnapshot): vtr.SessionsSnapshot;

        /**
         * Encodes the specified SessionsSnapshot message. Does not implicitly {@link vtr.SessionsSnapshot.verify|verify} messages.
         * @param message SessionsSnapshot message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISessionsSnapshot, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SessionsSnapshot message, length delimited. Does not implicitly {@link vtr.SessionsSnapshot.verify|verify} messages.
         * @param message SessionsSnapshot message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISessionsSnapshot, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SessionsSnapshot message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SessionsSnapshot
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SessionsSnapshot;

        /**
         * Decodes a SessionsSnapshot message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SessionsSnapshot
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SessionsSnapshot;

        /**
         * Verifies a SessionsSnapshot message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SessionsSnapshot message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SessionsSnapshot
         */
        public static fromObject(object: { [k: string]: any }): vtr.SessionsSnapshot;

        /**
         * Creates a plain object from a SessionsSnapshot message. Also converts values to other types if specified.
         * @param message SessionsSnapshot
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SessionsSnapshot, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SessionsSnapshot to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SessionsSnapshot
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an InfoRequest. */
    interface IInfoRequest {

        /** InfoRequest session */
        session?: (vtr.ISessionRef|null);
    }

    /** Represents an InfoRequest. */
    class InfoRequest implements IInfoRequest {

        /**
         * Constructs a new InfoRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IInfoRequest);

        /** InfoRequest session. */
        public session?: (vtr.ISessionRef|null);

        /**
         * Creates a new InfoRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns InfoRequest instance
         */
        public static create(properties?: vtr.IInfoRequest): vtr.InfoRequest;

        /**
         * Encodes the specified InfoRequest message. Does not implicitly {@link vtr.InfoRequest.verify|verify} messages.
         * @param message InfoRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IInfoRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified InfoRequest message, length delimited. Does not implicitly {@link vtr.InfoRequest.verify|verify} messages.
         * @param message InfoRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IInfoRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an InfoRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns InfoRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.InfoRequest;

        /**
         * Decodes an InfoRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns InfoRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.InfoRequest;

        /**
         * Verifies an InfoRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an InfoRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns InfoRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.InfoRequest;

        /**
         * Creates a plain object from an InfoRequest message. Also converts values to other types if specified.
         * @param message InfoRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.InfoRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this InfoRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for InfoRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an InfoResponse. */
    interface IInfoResponse {

        /** InfoResponse session */
        session?: (vtr.ISession|null);
    }

    /** Represents an InfoResponse. */
    class InfoResponse implements IInfoResponse {

        /**
         * Constructs a new InfoResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IInfoResponse);

        /** InfoResponse session. */
        public session?: (vtr.ISession|null);

        /**
         * Creates a new InfoResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns InfoResponse instance
         */
        public static create(properties?: vtr.IInfoResponse): vtr.InfoResponse;

        /**
         * Encodes the specified InfoResponse message. Does not implicitly {@link vtr.InfoResponse.verify|verify} messages.
         * @param message InfoResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IInfoResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified InfoResponse message, length delimited. Does not implicitly {@link vtr.InfoResponse.verify|verify} messages.
         * @param message InfoResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IInfoResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an InfoResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns InfoResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.InfoResponse;

        /**
         * Decodes an InfoResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns InfoResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.InfoResponse;

        /**
         * Verifies an InfoResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an InfoResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns InfoResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.InfoResponse;

        /**
         * Creates a plain object from an InfoResponse message. Also converts values to other types if specified.
         * @param message InfoResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.InfoResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this InfoResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for InfoResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a KillRequest. */
    interface IKillRequest {

        /** KillRequest session */
        session?: (vtr.ISessionRef|null);

        /** KillRequest signal */
        signal?: (string|null);
    }

    /** Represents a KillRequest. */
    class KillRequest implements IKillRequest {

        /**
         * Constructs a new KillRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IKillRequest);

        /** KillRequest session. */
        public session?: (vtr.ISessionRef|null);

        /** KillRequest signal. */
        public signal: string;

        /**
         * Creates a new KillRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns KillRequest instance
         */
        public static create(properties?: vtr.IKillRequest): vtr.KillRequest;

        /**
         * Encodes the specified KillRequest message. Does not implicitly {@link vtr.KillRequest.verify|verify} messages.
         * @param message KillRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IKillRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified KillRequest message, length delimited. Does not implicitly {@link vtr.KillRequest.verify|verify} messages.
         * @param message KillRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IKillRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a KillRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns KillRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.KillRequest;

        /**
         * Decodes a KillRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns KillRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.KillRequest;

        /**
         * Verifies a KillRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a KillRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns KillRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.KillRequest;

        /**
         * Creates a plain object from a KillRequest message. Also converts values to other types if specified.
         * @param message KillRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.KillRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this KillRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for KillRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a KillResponse. */
    interface IKillResponse {
    }

    /** Represents a KillResponse. */
    class KillResponse implements IKillResponse {

        /**
         * Constructs a new KillResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IKillResponse);

        /**
         * Creates a new KillResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns KillResponse instance
         */
        public static create(properties?: vtr.IKillResponse): vtr.KillResponse;

        /**
         * Encodes the specified KillResponse message. Does not implicitly {@link vtr.KillResponse.verify|verify} messages.
         * @param message KillResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IKillResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified KillResponse message, length delimited. Does not implicitly {@link vtr.KillResponse.verify|verify} messages.
         * @param message KillResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IKillResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a KillResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns KillResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.KillResponse;

        /**
         * Decodes a KillResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns KillResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.KillResponse;

        /**
         * Verifies a KillResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a KillResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns KillResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.KillResponse;

        /**
         * Creates a plain object from a KillResponse message. Also converts values to other types if specified.
         * @param message KillResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.KillResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this KillResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for KillResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a CloseRequest. */
    interface ICloseRequest {

        /** CloseRequest session */
        session?: (vtr.ISessionRef|null);
    }

    /** Represents a CloseRequest. */
    class CloseRequest implements ICloseRequest {

        /**
         * Constructs a new CloseRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ICloseRequest);

        /** CloseRequest session. */
        public session?: (vtr.ISessionRef|null);

        /**
         * Creates a new CloseRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CloseRequest instance
         */
        public static create(properties?: vtr.ICloseRequest): vtr.CloseRequest;

        /**
         * Encodes the specified CloseRequest message. Does not implicitly {@link vtr.CloseRequest.verify|verify} messages.
         * @param message CloseRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ICloseRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CloseRequest message, length delimited. Does not implicitly {@link vtr.CloseRequest.verify|verify} messages.
         * @param message CloseRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ICloseRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CloseRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CloseRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.CloseRequest;

        /**
         * Decodes a CloseRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CloseRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.CloseRequest;

        /**
         * Verifies a CloseRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CloseRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CloseRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.CloseRequest;

        /**
         * Creates a plain object from a CloseRequest message. Also converts values to other types if specified.
         * @param message CloseRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.CloseRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CloseRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CloseRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a CloseResponse. */
    interface ICloseResponse {
    }

    /** Represents a CloseResponse. */
    class CloseResponse implements ICloseResponse {

        /**
         * Constructs a new CloseResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ICloseResponse);

        /**
         * Creates a new CloseResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CloseResponse instance
         */
        public static create(properties?: vtr.ICloseResponse): vtr.CloseResponse;

        /**
         * Encodes the specified CloseResponse message. Does not implicitly {@link vtr.CloseResponse.verify|verify} messages.
         * @param message CloseResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ICloseResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CloseResponse message, length delimited. Does not implicitly {@link vtr.CloseResponse.verify|verify} messages.
         * @param message CloseResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ICloseResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CloseResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CloseResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.CloseResponse;

        /**
         * Decodes a CloseResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CloseResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.CloseResponse;

        /**
         * Verifies a CloseResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CloseResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CloseResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.CloseResponse;

        /**
         * Creates a plain object from a CloseResponse message. Also converts values to other types if specified.
         * @param message CloseResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.CloseResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CloseResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CloseResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a RemoveRequest. */
    interface IRemoveRequest {

        /** RemoveRequest session */
        session?: (vtr.ISessionRef|null);
    }

    /** Represents a RemoveRequest. */
    class RemoveRequest implements IRemoveRequest {

        /**
         * Constructs a new RemoveRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IRemoveRequest);

        /** RemoveRequest session. */
        public session?: (vtr.ISessionRef|null);

        /**
         * Creates a new RemoveRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RemoveRequest instance
         */
        public static create(properties?: vtr.IRemoveRequest): vtr.RemoveRequest;

        /**
         * Encodes the specified RemoveRequest message. Does not implicitly {@link vtr.RemoveRequest.verify|verify} messages.
         * @param message RemoveRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IRemoveRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RemoveRequest message, length delimited. Does not implicitly {@link vtr.RemoveRequest.verify|verify} messages.
         * @param message RemoveRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IRemoveRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RemoveRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RemoveRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.RemoveRequest;

        /**
         * Decodes a RemoveRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RemoveRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.RemoveRequest;

        /**
         * Verifies a RemoveRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RemoveRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RemoveRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.RemoveRequest;

        /**
         * Creates a plain object from a RemoveRequest message. Also converts values to other types if specified.
         * @param message RemoveRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.RemoveRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RemoveRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RemoveRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a RemoveResponse. */
    interface IRemoveResponse {
    }

    /** Represents a RemoveResponse. */
    class RemoveResponse implements IRemoveResponse {

        /**
         * Constructs a new RemoveResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IRemoveResponse);

        /**
         * Creates a new RemoveResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RemoveResponse instance
         */
        public static create(properties?: vtr.IRemoveResponse): vtr.RemoveResponse;

        /**
         * Encodes the specified RemoveResponse message. Does not implicitly {@link vtr.RemoveResponse.verify|verify} messages.
         * @param message RemoveResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IRemoveResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RemoveResponse message, length delimited. Does not implicitly {@link vtr.RemoveResponse.verify|verify} messages.
         * @param message RemoveResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IRemoveResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RemoveResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RemoveResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.RemoveResponse;

        /**
         * Decodes a RemoveResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RemoveResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.RemoveResponse;

        /**
         * Verifies a RemoveResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RemoveResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RemoveResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.RemoveResponse;

        /**
         * Creates a plain object from a RemoveResponse message. Also converts values to other types if specified.
         * @param message RemoveResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.RemoveResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RemoveResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RemoveResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a RenameRequest. */
    interface IRenameRequest {

        /** RenameRequest session */
        session?: (vtr.ISessionRef|null);

        /** RenameRequest new_name */
        new_name?: (string|null);
    }

    /** Represents a RenameRequest. */
    class RenameRequest implements IRenameRequest {

        /**
         * Constructs a new RenameRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IRenameRequest);

        /** RenameRequest session. */
        public session?: (vtr.ISessionRef|null);

        /** RenameRequest new_name. */
        public new_name: string;

        /**
         * Creates a new RenameRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RenameRequest instance
         */
        public static create(properties?: vtr.IRenameRequest): vtr.RenameRequest;

        /**
         * Encodes the specified RenameRequest message. Does not implicitly {@link vtr.RenameRequest.verify|verify} messages.
         * @param message RenameRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IRenameRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RenameRequest message, length delimited. Does not implicitly {@link vtr.RenameRequest.verify|verify} messages.
         * @param message RenameRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IRenameRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RenameRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RenameRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.RenameRequest;

        /**
         * Decodes a RenameRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RenameRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.RenameRequest;

        /**
         * Verifies a RenameRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RenameRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RenameRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.RenameRequest;

        /**
         * Creates a plain object from a RenameRequest message. Also converts values to other types if specified.
         * @param message RenameRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.RenameRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RenameRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RenameRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a RenameResponse. */
    interface IRenameResponse {
    }

    /** Represents a RenameResponse. */
    class RenameResponse implements IRenameResponse {

        /**
         * Constructs a new RenameResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IRenameResponse);

        /**
         * Creates a new RenameResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RenameResponse instance
         */
        public static create(properties?: vtr.IRenameResponse): vtr.RenameResponse;

        /**
         * Encodes the specified RenameResponse message. Does not implicitly {@link vtr.RenameResponse.verify|verify} messages.
         * @param message RenameResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IRenameResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RenameResponse message, length delimited. Does not implicitly {@link vtr.RenameResponse.verify|verify} messages.
         * @param message RenameResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IRenameResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RenameResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RenameResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.RenameResponse;

        /**
         * Decodes a RenameResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RenameResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.RenameResponse;

        /**
         * Verifies a RenameResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RenameResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RenameResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.RenameResponse;

        /**
         * Creates a plain object from a RenameResponse message. Also converts values to other types if specified.
         * @param message RenameResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.RenameResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RenameResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RenameResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetScreenRequest. */
    interface IGetScreenRequest {

        /** GetScreenRequest session */
        session?: (vtr.ISessionRef|null);
    }

    /** Represents a GetScreenRequest. */
    class GetScreenRequest implements IGetScreenRequest {

        /**
         * Constructs a new GetScreenRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IGetScreenRequest);

        /** GetScreenRequest session. */
        public session?: (vtr.ISessionRef|null);

        /**
         * Creates a new GetScreenRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetScreenRequest instance
         */
        public static create(properties?: vtr.IGetScreenRequest): vtr.GetScreenRequest;

        /**
         * Encodes the specified GetScreenRequest message. Does not implicitly {@link vtr.GetScreenRequest.verify|verify} messages.
         * @param message GetScreenRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IGetScreenRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetScreenRequest message, length delimited. Does not implicitly {@link vtr.GetScreenRequest.verify|verify} messages.
         * @param message GetScreenRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IGetScreenRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetScreenRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetScreenRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.GetScreenRequest;

        /**
         * Decodes a GetScreenRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetScreenRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.GetScreenRequest;

        /**
         * Verifies a GetScreenRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetScreenRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetScreenRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.GetScreenRequest;

        /**
         * Creates a plain object from a GetScreenRequest message. Also converts values to other types if specified.
         * @param message GetScreenRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.GetScreenRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetScreenRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetScreenRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ScreenCell. */
    interface IScreenCell {

        /** ScreenCell char */
        char?: (string|null);

        /** ScreenCell fg_color */
        fg_color?: (number|null);

        /** ScreenCell bg_color */
        bg_color?: (number|null);

        /** ScreenCell attributes */
        attributes?: (number|null);
    }

    /** Represents a ScreenCell. */
    class ScreenCell implements IScreenCell {

        /**
         * Constructs a new ScreenCell.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IScreenCell);

        /** ScreenCell char. */
        public char: string;

        /** ScreenCell fg_color. */
        public fg_color: number;

        /** ScreenCell bg_color. */
        public bg_color: number;

        /** ScreenCell attributes. */
        public attributes: number;

        /**
         * Creates a new ScreenCell instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ScreenCell instance
         */
        public static create(properties?: vtr.IScreenCell): vtr.ScreenCell;

        /**
         * Encodes the specified ScreenCell message. Does not implicitly {@link vtr.ScreenCell.verify|verify} messages.
         * @param message ScreenCell message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IScreenCell, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ScreenCell message, length delimited. Does not implicitly {@link vtr.ScreenCell.verify|verify} messages.
         * @param message ScreenCell message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IScreenCell, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ScreenCell message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ScreenCell
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.ScreenCell;

        /**
         * Decodes a ScreenCell message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ScreenCell
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.ScreenCell;

        /**
         * Verifies a ScreenCell message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ScreenCell message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ScreenCell
         */
        public static fromObject(object: { [k: string]: any }): vtr.ScreenCell;

        /**
         * Creates a plain object from a ScreenCell message. Also converts values to other types if specified.
         * @param message ScreenCell
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.ScreenCell, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ScreenCell to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ScreenCell
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ScreenRow. */
    interface IScreenRow {

        /** ScreenRow cells */
        cells?: (vtr.IScreenCell[]|null);
    }

    /** Represents a ScreenRow. */
    class ScreenRow implements IScreenRow {

        /**
         * Constructs a new ScreenRow.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IScreenRow);

        /** ScreenRow cells. */
        public cells: vtr.IScreenCell[];

        /**
         * Creates a new ScreenRow instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ScreenRow instance
         */
        public static create(properties?: vtr.IScreenRow): vtr.ScreenRow;

        /**
         * Encodes the specified ScreenRow message. Does not implicitly {@link vtr.ScreenRow.verify|verify} messages.
         * @param message ScreenRow message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IScreenRow, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ScreenRow message, length delimited. Does not implicitly {@link vtr.ScreenRow.verify|verify} messages.
         * @param message ScreenRow message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IScreenRow, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ScreenRow message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ScreenRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.ScreenRow;

        /**
         * Decodes a ScreenRow message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ScreenRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.ScreenRow;

        /**
         * Verifies a ScreenRow message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ScreenRow message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ScreenRow
         */
        public static fromObject(object: { [k: string]: any }): vtr.ScreenRow;

        /**
         * Creates a plain object from a ScreenRow message. Also converts values to other types if specified.
         * @param message ScreenRow
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.ScreenRow, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ScreenRow to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ScreenRow
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetScreenResponse. */
    interface IGetScreenResponse {

        /** GetScreenResponse name */
        name?: (string|null);

        /** GetScreenResponse cols */
        cols?: (number|null);

        /** GetScreenResponse rows */
        rows?: (number|null);

        /** GetScreenResponse cursor_x */
        cursor_x?: (number|null);

        /** GetScreenResponse cursor_y */
        cursor_y?: (number|null);

        /** GetScreenResponse screen_rows */
        screen_rows?: (vtr.IScreenRow[]|null);

        /** GetScreenResponse id */
        id?: (string|null);
    }

    /** Represents a GetScreenResponse. */
    class GetScreenResponse implements IGetScreenResponse {

        /**
         * Constructs a new GetScreenResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IGetScreenResponse);

        /** GetScreenResponse name. */
        public name: string;

        /** GetScreenResponse cols. */
        public cols: number;

        /** GetScreenResponse rows. */
        public rows: number;

        /** GetScreenResponse cursor_x. */
        public cursor_x: number;

        /** GetScreenResponse cursor_y. */
        public cursor_y: number;

        /** GetScreenResponse screen_rows. */
        public screen_rows: vtr.IScreenRow[];

        /** GetScreenResponse id. */
        public id: string;

        /**
         * Creates a new GetScreenResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetScreenResponse instance
         */
        public static create(properties?: vtr.IGetScreenResponse): vtr.GetScreenResponse;

        /**
         * Encodes the specified GetScreenResponse message. Does not implicitly {@link vtr.GetScreenResponse.verify|verify} messages.
         * @param message GetScreenResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IGetScreenResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetScreenResponse message, length delimited. Does not implicitly {@link vtr.GetScreenResponse.verify|verify} messages.
         * @param message GetScreenResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IGetScreenResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetScreenResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetScreenResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.GetScreenResponse;

        /**
         * Decodes a GetScreenResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetScreenResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.GetScreenResponse;

        /**
         * Verifies a GetScreenResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetScreenResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetScreenResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.GetScreenResponse;

        /**
         * Creates a plain object from a GetScreenResponse message. Also converts values to other types if specified.
         * @param message GetScreenResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.GetScreenResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetScreenResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetScreenResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GrepRequest. */
    interface IGrepRequest {

        /** GrepRequest session */
        session?: (vtr.ISessionRef|null);

        /** GrepRequest pattern */
        pattern?: (string|null);

        /** GrepRequest context_before */
        context_before?: (number|null);

        /** GrepRequest context_after */
        context_after?: (number|null);

        /** GrepRequest max_matches */
        max_matches?: (number|null);
    }

    /** Represents a GrepRequest. */
    class GrepRequest implements IGrepRequest {

        /**
         * Constructs a new GrepRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IGrepRequest);

        /** GrepRequest session. */
        public session?: (vtr.ISessionRef|null);

        /** GrepRequest pattern. */
        public pattern: string;

        /** GrepRequest context_before. */
        public context_before: number;

        /** GrepRequest context_after. */
        public context_after: number;

        /** GrepRequest max_matches. */
        public max_matches: number;

        /**
         * Creates a new GrepRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GrepRequest instance
         */
        public static create(properties?: vtr.IGrepRequest): vtr.GrepRequest;

        /**
         * Encodes the specified GrepRequest message. Does not implicitly {@link vtr.GrepRequest.verify|verify} messages.
         * @param message GrepRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IGrepRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GrepRequest message, length delimited. Does not implicitly {@link vtr.GrepRequest.verify|verify} messages.
         * @param message GrepRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IGrepRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GrepRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GrepRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.GrepRequest;

        /**
         * Decodes a GrepRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GrepRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.GrepRequest;

        /**
         * Verifies a GrepRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GrepRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GrepRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.GrepRequest;

        /**
         * Creates a plain object from a GrepRequest message. Also converts values to other types if specified.
         * @param message GrepRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.GrepRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GrepRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GrepRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GrepMatch. */
    interface IGrepMatch {

        /** GrepMatch line_number */
        line_number?: (number|null);

        /** GrepMatch line */
        line?: (string|null);

        /** GrepMatch context_before */
        context_before?: (string[]|null);

        /** GrepMatch context_after */
        context_after?: (string[]|null);
    }

    /** Represents a GrepMatch. */
    class GrepMatch implements IGrepMatch {

        /**
         * Constructs a new GrepMatch.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IGrepMatch);

        /** GrepMatch line_number. */
        public line_number: number;

        /** GrepMatch line. */
        public line: string;

        /** GrepMatch context_before. */
        public context_before: string[];

        /** GrepMatch context_after. */
        public context_after: string[];

        /**
         * Creates a new GrepMatch instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GrepMatch instance
         */
        public static create(properties?: vtr.IGrepMatch): vtr.GrepMatch;

        /**
         * Encodes the specified GrepMatch message. Does not implicitly {@link vtr.GrepMatch.verify|verify} messages.
         * @param message GrepMatch message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IGrepMatch, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GrepMatch message, length delimited. Does not implicitly {@link vtr.GrepMatch.verify|verify} messages.
         * @param message GrepMatch message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IGrepMatch, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GrepMatch message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GrepMatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.GrepMatch;

        /**
         * Decodes a GrepMatch message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GrepMatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.GrepMatch;

        /**
         * Verifies a GrepMatch message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GrepMatch message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GrepMatch
         */
        public static fromObject(object: { [k: string]: any }): vtr.GrepMatch;

        /**
         * Creates a plain object from a GrepMatch message. Also converts values to other types if specified.
         * @param message GrepMatch
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.GrepMatch, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GrepMatch to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GrepMatch
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GrepResponse. */
    interface IGrepResponse {

        /** GrepResponse matches */
        matches?: (vtr.IGrepMatch[]|null);
    }

    /** Represents a GrepResponse. */
    class GrepResponse implements IGrepResponse {

        /**
         * Constructs a new GrepResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IGrepResponse);

        /** GrepResponse matches. */
        public matches: vtr.IGrepMatch[];

        /**
         * Creates a new GrepResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GrepResponse instance
         */
        public static create(properties?: vtr.IGrepResponse): vtr.GrepResponse;

        /**
         * Encodes the specified GrepResponse message. Does not implicitly {@link vtr.GrepResponse.verify|verify} messages.
         * @param message GrepResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IGrepResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GrepResponse message, length delimited. Does not implicitly {@link vtr.GrepResponse.verify|verify} messages.
         * @param message GrepResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IGrepResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GrepResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GrepResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.GrepResponse;

        /**
         * Decodes a GrepResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GrepResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.GrepResponse;

        /**
         * Verifies a GrepResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GrepResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GrepResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.GrepResponse;

        /**
         * Creates a plain object from a GrepResponse message. Also converts values to other types if specified.
         * @param message GrepResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.GrepResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GrepResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GrepResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SendTextRequest. */
    interface ISendTextRequest {

        /** SendTextRequest session */
        session?: (vtr.ISessionRef|null);

        /** SendTextRequest text */
        text?: (string|null);
    }

    /** Represents a SendTextRequest. */
    class SendTextRequest implements ISendTextRequest {

        /**
         * Constructs a new SendTextRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISendTextRequest);

        /** SendTextRequest session. */
        public session?: (vtr.ISessionRef|null);

        /** SendTextRequest text. */
        public text: string;

        /**
         * Creates a new SendTextRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SendTextRequest instance
         */
        public static create(properties?: vtr.ISendTextRequest): vtr.SendTextRequest;

        /**
         * Encodes the specified SendTextRequest message. Does not implicitly {@link vtr.SendTextRequest.verify|verify} messages.
         * @param message SendTextRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISendTextRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SendTextRequest message, length delimited. Does not implicitly {@link vtr.SendTextRequest.verify|verify} messages.
         * @param message SendTextRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISendTextRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SendTextRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SendTextRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SendTextRequest;

        /**
         * Decodes a SendTextRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SendTextRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SendTextRequest;

        /**
         * Verifies a SendTextRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SendTextRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SendTextRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.SendTextRequest;

        /**
         * Creates a plain object from a SendTextRequest message. Also converts values to other types if specified.
         * @param message SendTextRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SendTextRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SendTextRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SendTextRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SendTextResponse. */
    interface ISendTextResponse {
    }

    /** Represents a SendTextResponse. */
    class SendTextResponse implements ISendTextResponse {

        /**
         * Constructs a new SendTextResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISendTextResponse);

        /**
         * Creates a new SendTextResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SendTextResponse instance
         */
        public static create(properties?: vtr.ISendTextResponse): vtr.SendTextResponse;

        /**
         * Encodes the specified SendTextResponse message. Does not implicitly {@link vtr.SendTextResponse.verify|verify} messages.
         * @param message SendTextResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISendTextResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SendTextResponse message, length delimited. Does not implicitly {@link vtr.SendTextResponse.verify|verify} messages.
         * @param message SendTextResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISendTextResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SendTextResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SendTextResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SendTextResponse;

        /**
         * Decodes a SendTextResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SendTextResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SendTextResponse;

        /**
         * Verifies a SendTextResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SendTextResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SendTextResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.SendTextResponse;

        /**
         * Creates a plain object from a SendTextResponse message. Also converts values to other types if specified.
         * @param message SendTextResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SendTextResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SendTextResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SendTextResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SendKeyRequest. */
    interface ISendKeyRequest {

        /** SendKeyRequest session */
        session?: (vtr.ISessionRef|null);

        /** SendKeyRequest key */
        key?: (string|null);
    }

    /** Represents a SendKeyRequest. */
    class SendKeyRequest implements ISendKeyRequest {

        /**
         * Constructs a new SendKeyRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISendKeyRequest);

        /** SendKeyRequest session. */
        public session?: (vtr.ISessionRef|null);

        /** SendKeyRequest key. */
        public key: string;

        /**
         * Creates a new SendKeyRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SendKeyRequest instance
         */
        public static create(properties?: vtr.ISendKeyRequest): vtr.SendKeyRequest;

        /**
         * Encodes the specified SendKeyRequest message. Does not implicitly {@link vtr.SendKeyRequest.verify|verify} messages.
         * @param message SendKeyRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISendKeyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SendKeyRequest message, length delimited. Does not implicitly {@link vtr.SendKeyRequest.verify|verify} messages.
         * @param message SendKeyRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISendKeyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SendKeyRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SendKeyRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SendKeyRequest;

        /**
         * Decodes a SendKeyRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SendKeyRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SendKeyRequest;

        /**
         * Verifies a SendKeyRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SendKeyRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SendKeyRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.SendKeyRequest;

        /**
         * Creates a plain object from a SendKeyRequest message. Also converts values to other types if specified.
         * @param message SendKeyRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SendKeyRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SendKeyRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SendKeyRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SendKeyResponse. */
    interface ISendKeyResponse {
    }

    /** Represents a SendKeyResponse. */
    class SendKeyResponse implements ISendKeyResponse {

        /**
         * Constructs a new SendKeyResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISendKeyResponse);

        /**
         * Creates a new SendKeyResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SendKeyResponse instance
         */
        public static create(properties?: vtr.ISendKeyResponse): vtr.SendKeyResponse;

        /**
         * Encodes the specified SendKeyResponse message. Does not implicitly {@link vtr.SendKeyResponse.verify|verify} messages.
         * @param message SendKeyResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISendKeyResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SendKeyResponse message, length delimited. Does not implicitly {@link vtr.SendKeyResponse.verify|verify} messages.
         * @param message SendKeyResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISendKeyResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SendKeyResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SendKeyResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SendKeyResponse;

        /**
         * Decodes a SendKeyResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SendKeyResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SendKeyResponse;

        /**
         * Verifies a SendKeyResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SendKeyResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SendKeyResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.SendKeyResponse;

        /**
         * Creates a plain object from a SendKeyResponse message. Also converts values to other types if specified.
         * @param message SendKeyResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SendKeyResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SendKeyResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SendKeyResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SendBytesRequest. */
    interface ISendBytesRequest {

        /** SendBytesRequest session */
        session?: (vtr.ISessionRef|null);

        /** SendBytesRequest data */
        data?: (Uint8Array|null);
    }

    /** Represents a SendBytesRequest. */
    class SendBytesRequest implements ISendBytesRequest {

        /**
         * Constructs a new SendBytesRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISendBytesRequest);

        /** SendBytesRequest session. */
        public session?: (vtr.ISessionRef|null);

        /** SendBytesRequest data. */
        public data: Uint8Array;

        /**
         * Creates a new SendBytesRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SendBytesRequest instance
         */
        public static create(properties?: vtr.ISendBytesRequest): vtr.SendBytesRequest;

        /**
         * Encodes the specified SendBytesRequest message. Does not implicitly {@link vtr.SendBytesRequest.verify|verify} messages.
         * @param message SendBytesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISendBytesRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SendBytesRequest message, length delimited. Does not implicitly {@link vtr.SendBytesRequest.verify|verify} messages.
         * @param message SendBytesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISendBytesRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SendBytesRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SendBytesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SendBytesRequest;

        /**
         * Decodes a SendBytesRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SendBytesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SendBytesRequest;

        /**
         * Verifies a SendBytesRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SendBytesRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SendBytesRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.SendBytesRequest;

        /**
         * Creates a plain object from a SendBytesRequest message. Also converts values to other types if specified.
         * @param message SendBytesRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SendBytesRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SendBytesRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SendBytesRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SendBytesResponse. */
    interface ISendBytesResponse {
    }

    /** Represents a SendBytesResponse. */
    class SendBytesResponse implements ISendBytesResponse {

        /**
         * Constructs a new SendBytesResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISendBytesResponse);

        /**
         * Creates a new SendBytesResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SendBytesResponse instance
         */
        public static create(properties?: vtr.ISendBytesResponse): vtr.SendBytesResponse;

        /**
         * Encodes the specified SendBytesResponse message. Does not implicitly {@link vtr.SendBytesResponse.verify|verify} messages.
         * @param message SendBytesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISendBytesResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SendBytesResponse message, length delimited. Does not implicitly {@link vtr.SendBytesResponse.verify|verify} messages.
         * @param message SendBytesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISendBytesResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SendBytesResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SendBytesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SendBytesResponse;

        /**
         * Decodes a SendBytesResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SendBytesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SendBytesResponse;

        /**
         * Verifies a SendBytesResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SendBytesResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SendBytesResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.SendBytesResponse;

        /**
         * Creates a plain object from a SendBytesResponse message. Also converts values to other types if specified.
         * @param message SendBytesResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SendBytesResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SendBytesResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SendBytesResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ResizeRequest. */
    interface IResizeRequest {

        /** ResizeRequest session */
        session?: (vtr.ISessionRef|null);

        /** ResizeRequest cols */
        cols?: (number|null);

        /** ResizeRequest rows */
        rows?: (number|null);
    }

    /** Represents a ResizeRequest. */
    class ResizeRequest implements IResizeRequest {

        /**
         * Constructs a new ResizeRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IResizeRequest);

        /** ResizeRequest session. */
        public session?: (vtr.ISessionRef|null);

        /** ResizeRequest cols. */
        public cols: number;

        /** ResizeRequest rows. */
        public rows: number;

        /**
         * Creates a new ResizeRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ResizeRequest instance
         */
        public static create(properties?: vtr.IResizeRequest): vtr.ResizeRequest;

        /**
         * Encodes the specified ResizeRequest message. Does not implicitly {@link vtr.ResizeRequest.verify|verify} messages.
         * @param message ResizeRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IResizeRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ResizeRequest message, length delimited. Does not implicitly {@link vtr.ResizeRequest.verify|verify} messages.
         * @param message ResizeRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IResizeRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ResizeRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ResizeRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.ResizeRequest;

        /**
         * Decodes a ResizeRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ResizeRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.ResizeRequest;

        /**
         * Verifies a ResizeRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ResizeRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ResizeRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.ResizeRequest;

        /**
         * Creates a plain object from a ResizeRequest message. Also converts values to other types if specified.
         * @param message ResizeRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.ResizeRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ResizeRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ResizeRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ResizeResponse. */
    interface IResizeResponse {
    }

    /** Represents a ResizeResponse. */
    class ResizeResponse implements IResizeResponse {

        /**
         * Constructs a new ResizeResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IResizeResponse);

        /**
         * Creates a new ResizeResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ResizeResponse instance
         */
        public static create(properties?: vtr.IResizeResponse): vtr.ResizeResponse;

        /**
         * Encodes the specified ResizeResponse message. Does not implicitly {@link vtr.ResizeResponse.verify|verify} messages.
         * @param message ResizeResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IResizeResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ResizeResponse message, length delimited. Does not implicitly {@link vtr.ResizeResponse.verify|verify} messages.
         * @param message ResizeResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IResizeResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ResizeResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ResizeResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.ResizeResponse;

        /**
         * Decodes a ResizeResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ResizeResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.ResizeResponse;

        /**
         * Verifies a ResizeResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ResizeResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ResizeResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.ResizeResponse;

        /**
         * Creates a plain object from a ResizeResponse message. Also converts values to other types if specified.
         * @param message ResizeResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.ResizeResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ResizeResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ResizeResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a WaitForRequest. */
    interface IWaitForRequest {

        /** WaitForRequest session */
        session?: (vtr.ISessionRef|null);

        /** WaitForRequest pattern */
        pattern?: (string|null);

        /** WaitForRequest timeout */
        timeout?: (google.protobuf.IDuration|null);
    }

    /** Represents a WaitForRequest. */
    class WaitForRequest implements IWaitForRequest {

        /**
         * Constructs a new WaitForRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IWaitForRequest);

        /** WaitForRequest session. */
        public session?: (vtr.ISessionRef|null);

        /** WaitForRequest pattern. */
        public pattern: string;

        /** WaitForRequest timeout. */
        public timeout?: (google.protobuf.IDuration|null);

        /**
         * Creates a new WaitForRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns WaitForRequest instance
         */
        public static create(properties?: vtr.IWaitForRequest): vtr.WaitForRequest;

        /**
         * Encodes the specified WaitForRequest message. Does not implicitly {@link vtr.WaitForRequest.verify|verify} messages.
         * @param message WaitForRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IWaitForRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified WaitForRequest message, length delimited. Does not implicitly {@link vtr.WaitForRequest.verify|verify} messages.
         * @param message WaitForRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IWaitForRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a WaitForRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns WaitForRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.WaitForRequest;

        /**
         * Decodes a WaitForRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns WaitForRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.WaitForRequest;

        /**
         * Verifies a WaitForRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a WaitForRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns WaitForRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.WaitForRequest;

        /**
         * Creates a plain object from a WaitForRequest message. Also converts values to other types if specified.
         * @param message WaitForRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.WaitForRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this WaitForRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for WaitForRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a WaitForResponse. */
    interface IWaitForResponse {

        /** WaitForResponse matched */
        matched?: (boolean|null);

        /** WaitForResponse matched_line */
        matched_line?: (string|null);

        /** WaitForResponse timed_out */
        timed_out?: (boolean|null);
    }

    /** Represents a WaitForResponse. */
    class WaitForResponse implements IWaitForResponse {

        /**
         * Constructs a new WaitForResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IWaitForResponse);

        /** WaitForResponse matched. */
        public matched: boolean;

        /** WaitForResponse matched_line. */
        public matched_line: string;

        /** WaitForResponse timed_out. */
        public timed_out: boolean;

        /**
         * Creates a new WaitForResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns WaitForResponse instance
         */
        public static create(properties?: vtr.IWaitForResponse): vtr.WaitForResponse;

        /**
         * Encodes the specified WaitForResponse message. Does not implicitly {@link vtr.WaitForResponse.verify|verify} messages.
         * @param message WaitForResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IWaitForResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified WaitForResponse message, length delimited. Does not implicitly {@link vtr.WaitForResponse.verify|verify} messages.
         * @param message WaitForResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IWaitForResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a WaitForResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns WaitForResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.WaitForResponse;

        /**
         * Decodes a WaitForResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns WaitForResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.WaitForResponse;

        /**
         * Verifies a WaitForResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a WaitForResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns WaitForResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.WaitForResponse;

        /**
         * Creates a plain object from a WaitForResponse message. Also converts values to other types if specified.
         * @param message WaitForResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.WaitForResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this WaitForResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for WaitForResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a WaitForIdleRequest. */
    interface IWaitForIdleRequest {

        /** WaitForIdleRequest session */
        session?: (vtr.ISessionRef|null);

        /** WaitForIdleRequest idle_duration */
        idle_duration?: (google.protobuf.IDuration|null);

        /** WaitForIdleRequest timeout */
        timeout?: (google.protobuf.IDuration|null);

        /** WaitForIdleRequest include_screen */
        include_screen?: (boolean|null);
    }

    /** Represents a WaitForIdleRequest. */
    class WaitForIdleRequest implements IWaitForIdleRequest {

        /**
         * Constructs a new WaitForIdleRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IWaitForIdleRequest);

        /** WaitForIdleRequest session. */
        public session?: (vtr.ISessionRef|null);

        /** WaitForIdleRequest idle_duration. */
        public idle_duration?: (google.protobuf.IDuration|null);

        /** WaitForIdleRequest timeout. */
        public timeout?: (google.protobuf.IDuration|null);

        /** WaitForIdleRequest include_screen. */
        public include_screen: boolean;

        /**
         * Creates a new WaitForIdleRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns WaitForIdleRequest instance
         */
        public static create(properties?: vtr.IWaitForIdleRequest): vtr.WaitForIdleRequest;

        /**
         * Encodes the specified WaitForIdleRequest message. Does not implicitly {@link vtr.WaitForIdleRequest.verify|verify} messages.
         * @param message WaitForIdleRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IWaitForIdleRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified WaitForIdleRequest message, length delimited. Does not implicitly {@link vtr.WaitForIdleRequest.verify|verify} messages.
         * @param message WaitForIdleRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IWaitForIdleRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a WaitForIdleRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns WaitForIdleRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.WaitForIdleRequest;

        /**
         * Decodes a WaitForIdleRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns WaitForIdleRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.WaitForIdleRequest;

        /**
         * Verifies a WaitForIdleRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a WaitForIdleRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns WaitForIdleRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.WaitForIdleRequest;

        /**
         * Creates a plain object from a WaitForIdleRequest message. Also converts values to other types if specified.
         * @param message WaitForIdleRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.WaitForIdleRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this WaitForIdleRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for WaitForIdleRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a WaitForIdleResponse. */
    interface IWaitForIdleResponse {

        /** WaitForIdleResponse idle */
        idle?: (boolean|null);

        /** WaitForIdleResponse timed_out */
        timed_out?: (boolean|null);

        /** WaitForIdleResponse screen */
        screen?: (vtr.IGetScreenResponse|null);
    }

    /** Represents a WaitForIdleResponse. */
    class WaitForIdleResponse implements IWaitForIdleResponse {

        /**
         * Constructs a new WaitForIdleResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IWaitForIdleResponse);

        /** WaitForIdleResponse idle. */
        public idle: boolean;

        /** WaitForIdleResponse timed_out. */
        public timed_out: boolean;

        /** WaitForIdleResponse screen. */
        public screen?: (vtr.IGetScreenResponse|null);

        /**
         * Creates a new WaitForIdleResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns WaitForIdleResponse instance
         */
        public static create(properties?: vtr.IWaitForIdleResponse): vtr.WaitForIdleResponse;

        /**
         * Encodes the specified WaitForIdleResponse message. Does not implicitly {@link vtr.WaitForIdleResponse.verify|verify} messages.
         * @param message WaitForIdleResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IWaitForIdleResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified WaitForIdleResponse message, length delimited. Does not implicitly {@link vtr.WaitForIdleResponse.verify|verify} messages.
         * @param message WaitForIdleResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IWaitForIdleResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a WaitForIdleResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns WaitForIdleResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.WaitForIdleResponse;

        /**
         * Decodes a WaitForIdleResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns WaitForIdleResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.WaitForIdleResponse;

        /**
         * Verifies a WaitForIdleResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a WaitForIdleResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns WaitForIdleResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.WaitForIdleResponse;

        /**
         * Creates a plain object from a WaitForIdleResponse message. Also converts values to other types if specified.
         * @param message WaitForIdleResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.WaitForIdleResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this WaitForIdleResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for WaitForIdleResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SubscribeRequest. */
    interface ISubscribeRequest {

        /** SubscribeRequest session */
        session?: (vtr.ISessionRef|null);

        /** SubscribeRequest include_screen_updates */
        include_screen_updates?: (boolean|null);

        /** SubscribeRequest include_raw_output */
        include_raw_output?: (boolean|null);
    }

    /** Represents a SubscribeRequest. */
    class SubscribeRequest implements ISubscribeRequest {

        /**
         * Constructs a new SubscribeRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISubscribeRequest);

        /** SubscribeRequest session. */
        public session?: (vtr.ISessionRef|null);

        /** SubscribeRequest include_screen_updates. */
        public include_screen_updates: boolean;

        /** SubscribeRequest include_raw_output. */
        public include_raw_output: boolean;

        /**
         * Creates a new SubscribeRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SubscribeRequest instance
         */
        public static create(properties?: vtr.ISubscribeRequest): vtr.SubscribeRequest;

        /**
         * Encodes the specified SubscribeRequest message. Does not implicitly {@link vtr.SubscribeRequest.verify|verify} messages.
         * @param message SubscribeRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISubscribeRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SubscribeRequest message, length delimited. Does not implicitly {@link vtr.SubscribeRequest.verify|verify} messages.
         * @param message SubscribeRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISubscribeRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SubscribeRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SubscribeRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SubscribeRequest;

        /**
         * Decodes a SubscribeRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SubscribeRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SubscribeRequest;

        /**
         * Verifies a SubscribeRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SubscribeRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SubscribeRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.SubscribeRequest;

        /**
         * Creates a plain object from a SubscribeRequest message. Also converts values to other types if specified.
         * @param message SubscribeRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SubscribeRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SubscribeRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SubscribeRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ScreenUpdate. */
    interface IScreenUpdate {

        /** ScreenUpdate frame_id */
        frame_id?: (number|Long|null);

        /** ScreenUpdate base_frame_id */
        base_frame_id?: (number|Long|null);

        /** ScreenUpdate is_keyframe */
        is_keyframe?: (boolean|null);

        /** ScreenUpdate screen */
        screen?: (vtr.IGetScreenResponse|null);

        /** ScreenUpdate delta */
        delta?: (vtr.IScreenDelta|null);
    }

    /** Represents a ScreenUpdate. */
    class ScreenUpdate implements IScreenUpdate {

        /**
         * Constructs a new ScreenUpdate.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IScreenUpdate);

        /** ScreenUpdate frame_id. */
        public frame_id: (number|Long);

        /** ScreenUpdate base_frame_id. */
        public base_frame_id: (number|Long);

        /** ScreenUpdate is_keyframe. */
        public is_keyframe: boolean;

        /** ScreenUpdate screen. */
        public screen?: (vtr.IGetScreenResponse|null);

        /** ScreenUpdate delta. */
        public delta?: (vtr.IScreenDelta|null);

        /**
         * Creates a new ScreenUpdate instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ScreenUpdate instance
         */
        public static create(properties?: vtr.IScreenUpdate): vtr.ScreenUpdate;

        /**
         * Encodes the specified ScreenUpdate message. Does not implicitly {@link vtr.ScreenUpdate.verify|verify} messages.
         * @param message ScreenUpdate message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IScreenUpdate, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ScreenUpdate message, length delimited. Does not implicitly {@link vtr.ScreenUpdate.verify|verify} messages.
         * @param message ScreenUpdate message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IScreenUpdate, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ScreenUpdate message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ScreenUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.ScreenUpdate;

        /**
         * Decodes a ScreenUpdate message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ScreenUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.ScreenUpdate;

        /**
         * Verifies a ScreenUpdate message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ScreenUpdate message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ScreenUpdate
         */
        public static fromObject(object: { [k: string]: any }): vtr.ScreenUpdate;

        /**
         * Creates a plain object from a ScreenUpdate message. Also converts values to other types if specified.
         * @param message ScreenUpdate
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.ScreenUpdate, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ScreenUpdate to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ScreenUpdate
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ScreenDelta. */
    interface IScreenDelta {

        /** ScreenDelta cols */
        cols?: (number|null);

        /** ScreenDelta rows */
        rows?: (number|null);

        /** ScreenDelta cursor_x */
        cursor_x?: (number|null);

        /** ScreenDelta cursor_y */
        cursor_y?: (number|null);

        /** ScreenDelta row_deltas */
        row_deltas?: (vtr.IRowDelta[]|null);
    }

    /** Represents a ScreenDelta. */
    class ScreenDelta implements IScreenDelta {

        /**
         * Constructs a new ScreenDelta.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IScreenDelta);

        /** ScreenDelta cols. */
        public cols: number;

        /** ScreenDelta rows. */
        public rows: number;

        /** ScreenDelta cursor_x. */
        public cursor_x: number;

        /** ScreenDelta cursor_y. */
        public cursor_y: number;

        /** ScreenDelta row_deltas. */
        public row_deltas: vtr.IRowDelta[];

        /**
         * Creates a new ScreenDelta instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ScreenDelta instance
         */
        public static create(properties?: vtr.IScreenDelta): vtr.ScreenDelta;

        /**
         * Encodes the specified ScreenDelta message. Does not implicitly {@link vtr.ScreenDelta.verify|verify} messages.
         * @param message ScreenDelta message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IScreenDelta, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ScreenDelta message, length delimited. Does not implicitly {@link vtr.ScreenDelta.verify|verify} messages.
         * @param message ScreenDelta message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IScreenDelta, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ScreenDelta message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ScreenDelta
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.ScreenDelta;

        /**
         * Decodes a ScreenDelta message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ScreenDelta
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.ScreenDelta;

        /**
         * Verifies a ScreenDelta message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ScreenDelta message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ScreenDelta
         */
        public static fromObject(object: { [k: string]: any }): vtr.ScreenDelta;

        /**
         * Creates a plain object from a ScreenDelta message. Also converts values to other types if specified.
         * @param message ScreenDelta
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.ScreenDelta, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ScreenDelta to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ScreenDelta
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a RowDelta. */
    interface IRowDelta {

        /** RowDelta row */
        row?: (number|null);

        /** RowDelta row_data */
        row_data?: (vtr.IScreenRow|null);
    }

    /** Represents a RowDelta. */
    class RowDelta implements IRowDelta {

        /**
         * Constructs a new RowDelta.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IRowDelta);

        /** RowDelta row. */
        public row: number;

        /** RowDelta row_data. */
        public row_data?: (vtr.IScreenRow|null);

        /**
         * Creates a new RowDelta instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RowDelta instance
         */
        public static create(properties?: vtr.IRowDelta): vtr.RowDelta;

        /**
         * Encodes the specified RowDelta message. Does not implicitly {@link vtr.RowDelta.verify|verify} messages.
         * @param message RowDelta message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IRowDelta, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RowDelta message, length delimited. Does not implicitly {@link vtr.RowDelta.verify|verify} messages.
         * @param message RowDelta message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IRowDelta, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RowDelta message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RowDelta
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.RowDelta;

        /**
         * Decodes a RowDelta message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RowDelta
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.RowDelta;

        /**
         * Verifies a RowDelta message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RowDelta message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RowDelta
         */
        public static fromObject(object: { [k: string]: any }): vtr.RowDelta;

        /**
         * Creates a plain object from a RowDelta message. Also converts values to other types if specified.
         * @param message RowDelta
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.RowDelta, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RowDelta to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RowDelta
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SessionExited. */
    interface ISessionExited {

        /** SessionExited exit_code */
        exit_code?: (number|null);

        /** SessionExited id */
        id?: (string|null);
    }

    /** Represents a SessionExited. */
    class SessionExited implements ISessionExited {

        /**
         * Constructs a new SessionExited.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISessionExited);

        /** SessionExited exit_code. */
        public exit_code: number;

        /** SessionExited id. */
        public id: string;

        /**
         * Creates a new SessionExited instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SessionExited instance
         */
        public static create(properties?: vtr.ISessionExited): vtr.SessionExited;

        /**
         * Encodes the specified SessionExited message. Does not implicitly {@link vtr.SessionExited.verify|verify} messages.
         * @param message SessionExited message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISessionExited, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SessionExited message, length delimited. Does not implicitly {@link vtr.SessionExited.verify|verify} messages.
         * @param message SessionExited message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISessionExited, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SessionExited message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SessionExited
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SessionExited;

        /**
         * Decodes a SessionExited message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SessionExited
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SessionExited;

        /**
         * Verifies a SessionExited message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SessionExited message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SessionExited
         */
        public static fromObject(object: { [k: string]: any }): vtr.SessionExited;

        /**
         * Creates a plain object from a SessionExited message. Also converts values to other types if specified.
         * @param message SessionExited
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SessionExited, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SessionExited to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SessionExited
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SessionIdle. */
    interface ISessionIdle {

        /** SessionIdle name */
        name?: (string|null);

        /** SessionIdle idle */
        idle?: (boolean|null);

        /** SessionIdle id */
        id?: (string|null);
    }

    /** Represents a SessionIdle. */
    class SessionIdle implements ISessionIdle {

        /**
         * Constructs a new SessionIdle.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISessionIdle);

        /** SessionIdle name. */
        public name: string;

        /** SessionIdle idle. */
        public idle: boolean;

        /** SessionIdle id. */
        public id: string;

        /**
         * Creates a new SessionIdle instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SessionIdle instance
         */
        public static create(properties?: vtr.ISessionIdle): vtr.SessionIdle;

        /**
         * Encodes the specified SessionIdle message. Does not implicitly {@link vtr.SessionIdle.verify|verify} messages.
         * @param message SessionIdle message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISessionIdle, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SessionIdle message, length delimited. Does not implicitly {@link vtr.SessionIdle.verify|verify} messages.
         * @param message SessionIdle message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISessionIdle, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SessionIdle message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SessionIdle
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SessionIdle;

        /**
         * Decodes a SessionIdle message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SessionIdle
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SessionIdle;

        /**
         * Verifies a SessionIdle message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SessionIdle message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SessionIdle
         */
        public static fromObject(object: { [k: string]: any }): vtr.SessionIdle;

        /**
         * Creates a plain object from a SessionIdle message. Also converts values to other types if specified.
         * @param message SessionIdle
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SessionIdle, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SessionIdle to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SessionIdle
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SubscribeEvent. */
    interface ISubscribeEvent {

        /** SubscribeEvent screen_update */
        screen_update?: (vtr.IScreenUpdate|null);

        /** SubscribeEvent raw_output */
        raw_output?: (Uint8Array|null);

        /** SubscribeEvent session_exited */
        session_exited?: (vtr.ISessionExited|null);

        /** SubscribeEvent session_idle */
        session_idle?: (vtr.ISessionIdle|null);
    }

    /** Represents a SubscribeEvent. */
    class SubscribeEvent implements ISubscribeEvent {

        /**
         * Constructs a new SubscribeEvent.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.ISubscribeEvent);

        /** SubscribeEvent screen_update. */
        public screen_update?: (vtr.IScreenUpdate|null);

        /** SubscribeEvent raw_output. */
        public raw_output?: (Uint8Array|null);

        /** SubscribeEvent session_exited. */
        public session_exited?: (vtr.ISessionExited|null);

        /** SubscribeEvent session_idle. */
        public session_idle?: (vtr.ISessionIdle|null);

        /** SubscribeEvent event. */
        public event?: ("screen_update"|"raw_output"|"session_exited"|"session_idle");

        /**
         * Creates a new SubscribeEvent instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SubscribeEvent instance
         */
        public static create(properties?: vtr.ISubscribeEvent): vtr.SubscribeEvent;

        /**
         * Encodes the specified SubscribeEvent message. Does not implicitly {@link vtr.SubscribeEvent.verify|verify} messages.
         * @param message SubscribeEvent message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.ISubscribeEvent, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SubscribeEvent message, length delimited. Does not implicitly {@link vtr.SubscribeEvent.verify|verify} messages.
         * @param message SubscribeEvent message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.ISubscribeEvent, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SubscribeEvent message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SubscribeEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.SubscribeEvent;

        /**
         * Decodes a SubscribeEvent message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SubscribeEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.SubscribeEvent;

        /**
         * Verifies a SubscribeEvent message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SubscribeEvent message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SubscribeEvent
         */
        public static fromObject(object: { [k: string]: any }): vtr.SubscribeEvent;

        /**
         * Creates a plain object from a SubscribeEvent message. Also converts values to other types if specified.
         * @param message SubscribeEvent
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.SubscribeEvent, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SubscribeEvent to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SubscribeEvent
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DumpAsciinemaRequest. */
    interface IDumpAsciinemaRequest {

        /** DumpAsciinemaRequest session */
        session?: (vtr.ISessionRef|null);
    }

    /** Represents a DumpAsciinemaRequest. */
    class DumpAsciinemaRequest implements IDumpAsciinemaRequest {

        /**
         * Constructs a new DumpAsciinemaRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IDumpAsciinemaRequest);

        /** DumpAsciinemaRequest session. */
        public session?: (vtr.ISessionRef|null);

        /**
         * Creates a new DumpAsciinemaRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DumpAsciinemaRequest instance
         */
        public static create(properties?: vtr.IDumpAsciinemaRequest): vtr.DumpAsciinemaRequest;

        /**
         * Encodes the specified DumpAsciinemaRequest message. Does not implicitly {@link vtr.DumpAsciinemaRequest.verify|verify} messages.
         * @param message DumpAsciinemaRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IDumpAsciinemaRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DumpAsciinemaRequest message, length delimited. Does not implicitly {@link vtr.DumpAsciinemaRequest.verify|verify} messages.
         * @param message DumpAsciinemaRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IDumpAsciinemaRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DumpAsciinemaRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DumpAsciinemaRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.DumpAsciinemaRequest;

        /**
         * Decodes a DumpAsciinemaRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DumpAsciinemaRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.DumpAsciinemaRequest;

        /**
         * Verifies a DumpAsciinemaRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DumpAsciinemaRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DumpAsciinemaRequest
         */
        public static fromObject(object: { [k: string]: any }): vtr.DumpAsciinemaRequest;

        /**
         * Creates a plain object from a DumpAsciinemaRequest message. Also converts values to other types if specified.
         * @param message DumpAsciinemaRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.DumpAsciinemaRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DumpAsciinemaRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DumpAsciinemaRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DumpAsciinemaResponse. */
    interface IDumpAsciinemaResponse {

        /** DumpAsciinemaResponse data */
        data?: (Uint8Array|null);
    }

    /** Represents a DumpAsciinemaResponse. */
    class DumpAsciinemaResponse implements IDumpAsciinemaResponse {

        /**
         * Constructs a new DumpAsciinemaResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: vtr.IDumpAsciinemaResponse);

        /** DumpAsciinemaResponse data. */
        public data: Uint8Array;

        /**
         * Creates a new DumpAsciinemaResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DumpAsciinemaResponse instance
         */
        public static create(properties?: vtr.IDumpAsciinemaResponse): vtr.DumpAsciinemaResponse;

        /**
         * Encodes the specified DumpAsciinemaResponse message. Does not implicitly {@link vtr.DumpAsciinemaResponse.verify|verify} messages.
         * @param message DumpAsciinemaResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: vtr.IDumpAsciinemaResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DumpAsciinemaResponse message, length delimited. Does not implicitly {@link vtr.DumpAsciinemaResponse.verify|verify} messages.
         * @param message DumpAsciinemaResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: vtr.IDumpAsciinemaResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DumpAsciinemaResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DumpAsciinemaResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): vtr.DumpAsciinemaResponse;

        /**
         * Decodes a DumpAsciinemaResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DumpAsciinemaResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): vtr.DumpAsciinemaResponse;

        /**
         * Verifies a DumpAsciinemaResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DumpAsciinemaResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DumpAsciinemaResponse
         */
        public static fromObject(object: { [k: string]: any }): vtr.DumpAsciinemaResponse;

        /**
         * Creates a plain object from a DumpAsciinemaResponse message. Also converts values to other types if specified.
         * @param message DumpAsciinemaResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: vtr.DumpAsciinemaResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DumpAsciinemaResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DumpAsciinemaResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace google. */
export namespace google {

    /** Namespace protobuf. */
    namespace protobuf {

        /** Properties of a Timestamp. */
        interface ITimestamp {

            /** Timestamp seconds */
            seconds?: (number|Long|null);

            /** Timestamp nanos */
            nanos?: (number|null);
        }

        /** Represents a Timestamp. */
        class Timestamp implements ITimestamp {

            /**
             * Constructs a new Timestamp.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.ITimestamp);

            /** Timestamp seconds. */
            public seconds: (number|Long);

            /** Timestamp nanos. */
            public nanos: number;

            /**
             * Creates a new Timestamp instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Timestamp instance
             */
            public static create(properties?: google.protobuf.ITimestamp): google.protobuf.Timestamp;

            /**
             * Encodes the specified Timestamp message. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @param message Timestamp message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.ITimestamp, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Timestamp message, length delimited. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @param message Timestamp message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.ITimestamp, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Timestamp message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.Timestamp;

            /**
             * Decodes a Timestamp message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.Timestamp;

            /**
             * Verifies a Timestamp message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Timestamp message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Timestamp
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.Timestamp;

            /**
             * Creates a plain object from a Timestamp message. Also converts values to other types if specified.
             * @param message Timestamp
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.Timestamp, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Timestamp to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Timestamp
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a Duration. */
        interface IDuration {

            /** Duration seconds */
            seconds?: (number|Long|null);

            /** Duration nanos */
            nanos?: (number|null);
        }

        /** Represents a Duration. */
        class Duration implements IDuration {

            /**
             * Constructs a new Duration.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IDuration);

            /** Duration seconds. */
            public seconds: (number|Long);

            /** Duration nanos. */
            public nanos: number;

            /**
             * Creates a new Duration instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Duration instance
             */
            public static create(properties?: google.protobuf.IDuration): google.protobuf.Duration;

            /**
             * Encodes the specified Duration message. Does not implicitly {@link google.protobuf.Duration.verify|verify} messages.
             * @param message Duration message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IDuration, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Duration message, length delimited. Does not implicitly {@link google.protobuf.Duration.verify|verify} messages.
             * @param message Duration message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IDuration, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Duration message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Duration
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.Duration;

            /**
             * Decodes a Duration message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Duration
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.Duration;

            /**
             * Verifies a Duration message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Duration message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Duration
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.Duration;

            /**
             * Creates a plain object from a Duration message. Also converts values to other types if specified.
             * @param message Duration
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.Duration, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Duration to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Duration
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an Any. */
        interface IAny {

            /** Any type_url */
            type_url?: (string|null);

            /** Any value */
            value?: (Uint8Array|null);
        }

        /** Represents an Any. */
        class Any implements IAny {

            /**
             * Constructs a new Any.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IAny);

            /** Any type_url. */
            public type_url: string;

            /** Any value. */
            public value: Uint8Array;

            /**
             * Creates a new Any instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Any instance
             */
            public static create(properties?: google.protobuf.IAny): google.protobuf.Any;

            /**
             * Encodes the specified Any message. Does not implicitly {@link google.protobuf.Any.verify|verify} messages.
             * @param message Any message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IAny, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Any message, length delimited. Does not implicitly {@link google.protobuf.Any.verify|verify} messages.
             * @param message Any message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IAny, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an Any message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Any
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.Any;

            /**
             * Decodes an Any message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Any
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.Any;

            /**
             * Verifies an Any message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an Any message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Any
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.Any;

            /**
             * Creates a plain object from an Any message. Also converts values to other types if specified.
             * @param message Any
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.Any, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Any to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Any
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Namespace rpc. */
    namespace rpc {

        /** Properties of a Status. */
        interface IStatus {

            /** Status code */
            code?: (number|null);

            /** Status message */
            message?: (string|null);

            /** Status details */
            details?: (google.protobuf.IAny[]|null);
        }

        /** Represents a Status. */
        class Status implements IStatus {

            /**
             * Constructs a new Status.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.rpc.IStatus);

            /** Status code. */
            public code: number;

            /** Status message. */
            public message: string;

            /** Status details. */
            public details: google.protobuf.IAny[];

            /**
             * Creates a new Status instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Status instance
             */
            public static create(properties?: google.rpc.IStatus): google.rpc.Status;

            /**
             * Encodes the specified Status message. Does not implicitly {@link google.rpc.Status.verify|verify} messages.
             * @param message Status message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.rpc.IStatus, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Status message, length delimited. Does not implicitly {@link google.rpc.Status.verify|verify} messages.
             * @param message Status message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.rpc.IStatus, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Status message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Status
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.rpc.Status;

            /**
             * Decodes a Status message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Status
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.rpc.Status;

            /**
             * Verifies a Status message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Status message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Status
             */
            public static fromObject(object: { [k: string]: any }): google.rpc.Status;

            /**
             * Creates a plain object from a Status message. Also converts values to other types if specified.
             * @param message Status
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.rpc.Status, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Status to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Status
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }
}

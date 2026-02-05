/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const vtr = $root.vtr = (() => {

    /**
     * Namespace vtr.
     * @exports vtr
     * @namespace
     */
    const vtr = {};

    /**
     * SessionStatus enum.
     * @name vtr.SessionStatus
     * @enum {number}
     * @property {number} SESSION_STATUS_UNSPECIFIED=0 SESSION_STATUS_UNSPECIFIED value
     * @property {number} SESSION_STATUS_RUNNING=1 SESSION_STATUS_RUNNING value
     * @property {number} SESSION_STATUS_CLOSING=2 SESSION_STATUS_CLOSING value
     * @property {number} SESSION_STATUS_EXITED=3 SESSION_STATUS_EXITED value
     */
    vtr.SessionStatus = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "SESSION_STATUS_UNSPECIFIED"] = 0;
        values[valuesById[1] = "SESSION_STATUS_RUNNING"] = 1;
        values[valuesById[2] = "SESSION_STATUS_CLOSING"] = 2;
        values[valuesById[3] = "SESSION_STATUS_EXITED"] = 3;
        return values;
    })();

    vtr.Session = (function() {

        /**
         * Properties of a Session.
         * @memberof vtr
         * @interface ISession
         * @property {string|null} [name] Session name
         * @property {vtr.SessionStatus|null} [status] Session status
         * @property {number|null} [cols] Session cols
         * @property {number|null} [rows] Session rows
         * @property {number|null} [exit_code] Session exit_code
         * @property {google.protobuf.ITimestamp|null} [created_at] Session created_at
         * @property {google.protobuf.ITimestamp|null} [exited_at] Session exited_at
         * @property {boolean|null} [idle] Session idle
         * @property {number|null} [order] Session order
         * @property {string|null} [id] Session id
         */

        /**
         * Constructs a new Session.
         * @memberof vtr
         * @classdesc Represents a Session.
         * @implements ISession
         * @constructor
         * @param {vtr.ISession=} [properties] Properties to set
         */
        function Session(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Session name.
         * @member {string} name
         * @memberof vtr.Session
         * @instance
         */
        Session.prototype.name = "";

        /**
         * Session status.
         * @member {vtr.SessionStatus} status
         * @memberof vtr.Session
         * @instance
         */
        Session.prototype.status = 0;

        /**
         * Session cols.
         * @member {number} cols
         * @memberof vtr.Session
         * @instance
         */
        Session.prototype.cols = 0;

        /**
         * Session rows.
         * @member {number} rows
         * @memberof vtr.Session
         * @instance
         */
        Session.prototype.rows = 0;

        /**
         * Session exit_code.
         * @member {number} exit_code
         * @memberof vtr.Session
         * @instance
         */
        Session.prototype.exit_code = 0;

        /**
         * Session created_at.
         * @member {google.protobuf.ITimestamp|null|undefined} created_at
         * @memberof vtr.Session
         * @instance
         */
        Session.prototype.created_at = null;

        /**
         * Session exited_at.
         * @member {google.protobuf.ITimestamp|null|undefined} exited_at
         * @memberof vtr.Session
         * @instance
         */
        Session.prototype.exited_at = null;

        /**
         * Session idle.
         * @member {boolean} idle
         * @memberof vtr.Session
         * @instance
         */
        Session.prototype.idle = false;

        /**
         * Session order.
         * @member {number} order
         * @memberof vtr.Session
         * @instance
         */
        Session.prototype.order = 0;

        /**
         * Session id.
         * @member {string} id
         * @memberof vtr.Session
         * @instance
         */
        Session.prototype.id = "";

        /**
         * Creates a new Session instance using the specified properties.
         * @function create
         * @memberof vtr.Session
         * @static
         * @param {vtr.ISession=} [properties] Properties to set
         * @returns {vtr.Session} Session instance
         */
        Session.create = function create(properties) {
            return new Session(properties);
        };

        /**
         * Encodes the specified Session message. Does not implicitly {@link vtr.Session.verify|verify} messages.
         * @function encode
         * @memberof vtr.Session
         * @static
         * @param {vtr.ISession} message Session message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Session.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.status);
            if (message.cols != null && Object.hasOwnProperty.call(message, "cols"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.cols);
            if (message.rows != null && Object.hasOwnProperty.call(message, "rows"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.rows);
            if (message.exit_code != null && Object.hasOwnProperty.call(message, "exit_code"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.exit_code);
            if (message.created_at != null && Object.hasOwnProperty.call(message, "created_at"))
                $root.google.protobuf.Timestamp.encode(message.created_at, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            if (message.exited_at != null && Object.hasOwnProperty.call(message, "exited_at"))
                $root.google.protobuf.Timestamp.encode(message.exited_at, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
            if (message.idle != null && Object.hasOwnProperty.call(message, "idle"))
                writer.uint32(/* id 8, wireType 0 =*/64).bool(message.idle);
            if (message.order != null && Object.hasOwnProperty.call(message, "order"))
                writer.uint32(/* id 9, wireType 0 =*/72).uint32(message.order);
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 10, wireType 2 =*/82).string(message.id);
            return writer;
        };

        /**
         * Encodes the specified Session message, length delimited. Does not implicitly {@link vtr.Session.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.Session
         * @static
         * @param {vtr.ISession} message Session message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Session.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Session message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.Session
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.Session} Session
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Session.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.Session();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.name = reader.string();
                        break;
                    }
                case 2: {
                        message.status = reader.int32();
                        break;
                    }
                case 3: {
                        message.cols = reader.int32();
                        break;
                    }
                case 4: {
                        message.rows = reader.int32();
                        break;
                    }
                case 5: {
                        message.exit_code = reader.int32();
                        break;
                    }
                case 6: {
                        message.created_at = $root.google.protobuf.Timestamp.decode(reader, reader.uint32());
                        break;
                    }
                case 7: {
                        message.exited_at = $root.google.protobuf.Timestamp.decode(reader, reader.uint32());
                        break;
                    }
                case 8: {
                        message.idle = reader.bool();
                        break;
                    }
                case 9: {
                        message.order = reader.uint32();
                        break;
                    }
                case 10: {
                        message.id = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Session message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.Session
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.Session} Session
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Session.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Session message.
         * @function verify
         * @memberof vtr.Session
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Session.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            if (message.status != null && message.hasOwnProperty("status"))
                switch (message.status) {
                default:
                    return "status: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                    break;
                }
            if (message.cols != null && message.hasOwnProperty("cols"))
                if (!$util.isInteger(message.cols))
                    return "cols: integer expected";
            if (message.rows != null && message.hasOwnProperty("rows"))
                if (!$util.isInteger(message.rows))
                    return "rows: integer expected";
            if (message.exit_code != null && message.hasOwnProperty("exit_code"))
                if (!$util.isInteger(message.exit_code))
                    return "exit_code: integer expected";
            if (message.created_at != null && message.hasOwnProperty("created_at")) {
                let error = $root.google.protobuf.Timestamp.verify(message.created_at);
                if (error)
                    return "created_at." + error;
            }
            if (message.exited_at != null && message.hasOwnProperty("exited_at")) {
                let error = $root.google.protobuf.Timestamp.verify(message.exited_at);
                if (error)
                    return "exited_at." + error;
            }
            if (message.idle != null && message.hasOwnProperty("idle"))
                if (typeof message.idle !== "boolean")
                    return "idle: boolean expected";
            if (message.order != null && message.hasOwnProperty("order"))
                if (!$util.isInteger(message.order))
                    return "order: integer expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            return null;
        };

        /**
         * Creates a Session message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.Session
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.Session} Session
         */
        Session.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.Session)
                return object;
            let message = new $root.vtr.Session();
            if (object.name != null)
                message.name = String(object.name);
            switch (object.status) {
            default:
                if (typeof object.status === "number") {
                    message.status = object.status;
                    break;
                }
                break;
            case "SESSION_STATUS_UNSPECIFIED":
            case 0:
                message.status = 0;
                break;
            case "SESSION_STATUS_RUNNING":
            case 1:
                message.status = 1;
                break;
            case "SESSION_STATUS_CLOSING":
            case 2:
                message.status = 2;
                break;
            case "SESSION_STATUS_EXITED":
            case 3:
                message.status = 3;
                break;
            }
            if (object.cols != null)
                message.cols = object.cols | 0;
            if (object.rows != null)
                message.rows = object.rows | 0;
            if (object.exit_code != null)
                message.exit_code = object.exit_code | 0;
            if (object.created_at != null) {
                if (typeof object.created_at !== "object")
                    throw TypeError(".vtr.Session.created_at: object expected");
                message.created_at = $root.google.protobuf.Timestamp.fromObject(object.created_at);
            }
            if (object.exited_at != null) {
                if (typeof object.exited_at !== "object")
                    throw TypeError(".vtr.Session.exited_at: object expected");
                message.exited_at = $root.google.protobuf.Timestamp.fromObject(object.exited_at);
            }
            if (object.idle != null)
                message.idle = Boolean(object.idle);
            if (object.order != null)
                message.order = object.order >>> 0;
            if (object.id != null)
                message.id = String(object.id);
            return message;
        };

        /**
         * Creates a plain object from a Session message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.Session
         * @static
         * @param {vtr.Session} message Session
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Session.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.name = "";
                object.status = options.enums === String ? "SESSION_STATUS_UNSPECIFIED" : 0;
                object.cols = 0;
                object.rows = 0;
                object.exit_code = 0;
                object.created_at = null;
                object.exited_at = null;
                object.idle = false;
                object.order = 0;
                object.id = "";
            }
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = options.enums === String ? $root.vtr.SessionStatus[message.status] === undefined ? message.status : $root.vtr.SessionStatus[message.status] : message.status;
            if (message.cols != null && message.hasOwnProperty("cols"))
                object.cols = message.cols;
            if (message.rows != null && message.hasOwnProperty("rows"))
                object.rows = message.rows;
            if (message.exit_code != null && message.hasOwnProperty("exit_code"))
                object.exit_code = message.exit_code;
            if (message.created_at != null && message.hasOwnProperty("created_at"))
                object.created_at = $root.google.protobuf.Timestamp.toObject(message.created_at, options);
            if (message.exited_at != null && message.hasOwnProperty("exited_at"))
                object.exited_at = $root.google.protobuf.Timestamp.toObject(message.exited_at, options);
            if (message.idle != null && message.hasOwnProperty("idle"))
                object.idle = message.idle;
            if (message.order != null && message.hasOwnProperty("order"))
                object.order = message.order;
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            return object;
        };

        /**
         * Converts this Session to JSON.
         * @function toJSON
         * @memberof vtr.Session
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Session.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Session
         * @function getTypeUrl
         * @memberof vtr.Session
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Session.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.Session";
        };

        return Session;
    })();

    vtr.SessionRef = (function() {

        /**
         * Properties of a SessionRef.
         * @memberof vtr
         * @interface ISessionRef
         * @property {string|null} [id] SessionRef id
         * @property {string|null} [coordinator] SessionRef coordinator
         */

        /**
         * Constructs a new SessionRef.
         * @memberof vtr
         * @classdesc Represents a SessionRef.
         * @implements ISessionRef
         * @constructor
         * @param {vtr.ISessionRef=} [properties] Properties to set
         */
        function SessionRef(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SessionRef id.
         * @member {string} id
         * @memberof vtr.SessionRef
         * @instance
         */
        SessionRef.prototype.id = "";

        /**
         * SessionRef coordinator.
         * @member {string} coordinator
         * @memberof vtr.SessionRef
         * @instance
         */
        SessionRef.prototype.coordinator = "";

        /**
         * Creates a new SessionRef instance using the specified properties.
         * @function create
         * @memberof vtr.SessionRef
         * @static
         * @param {vtr.ISessionRef=} [properties] Properties to set
         * @returns {vtr.SessionRef} SessionRef instance
         */
        SessionRef.create = function create(properties) {
            return new SessionRef(properties);
        };

        /**
         * Encodes the specified SessionRef message. Does not implicitly {@link vtr.SessionRef.verify|verify} messages.
         * @function encode
         * @memberof vtr.SessionRef
         * @static
         * @param {vtr.ISessionRef} message SessionRef message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionRef.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            if (message.coordinator != null && Object.hasOwnProperty.call(message, "coordinator"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.coordinator);
            return writer;
        };

        /**
         * Encodes the specified SessionRef message, length delimited. Does not implicitly {@link vtr.SessionRef.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SessionRef
         * @static
         * @param {vtr.ISessionRef} message SessionRef message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionRef.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SessionRef message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SessionRef
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SessionRef} SessionRef
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionRef.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SessionRef();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                case 2: {
                        message.coordinator = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SessionRef message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SessionRef
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SessionRef} SessionRef
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionRef.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SessionRef message.
         * @function verify
         * @memberof vtr.SessionRef
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SessionRef.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.coordinator != null && message.hasOwnProperty("coordinator"))
                if (!$util.isString(message.coordinator))
                    return "coordinator: string expected";
            return null;
        };

        /**
         * Creates a SessionRef message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SessionRef
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SessionRef} SessionRef
         */
        SessionRef.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SessionRef)
                return object;
            let message = new $root.vtr.SessionRef();
            if (object.id != null)
                message.id = String(object.id);
            if (object.coordinator != null)
                message.coordinator = String(object.coordinator);
            return message;
        };

        /**
         * Creates a plain object from a SessionRef message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SessionRef
         * @static
         * @param {vtr.SessionRef} message SessionRef
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SessionRef.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.coordinator = "";
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.coordinator != null && message.hasOwnProperty("coordinator"))
                object.coordinator = message.coordinator;
            return object;
        };

        /**
         * Converts this SessionRef to JSON.
         * @function toJSON
         * @memberof vtr.SessionRef
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SessionRef.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SessionRef
         * @function getTypeUrl
         * @memberof vtr.SessionRef
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SessionRef.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SessionRef";
        };

        return SessionRef;
    })();

    vtr.SpawnRequest = (function() {

        /**
         * Properties of a SpawnRequest.
         * @memberof vtr
         * @interface ISpawnRequest
         * @property {string|null} [name] SpawnRequest name
         * @property {string|null} [command] SpawnRequest command
         * @property {string|null} [working_dir] SpawnRequest working_dir
         * @property {Object.<string,string>|null} [env] SpawnRequest env
         * @property {number|null} [cols] SpawnRequest cols
         * @property {number|null} [rows] SpawnRequest rows
         */

        /**
         * Constructs a new SpawnRequest.
         * @memberof vtr
         * @classdesc Represents a SpawnRequest.
         * @implements ISpawnRequest
         * @constructor
         * @param {vtr.ISpawnRequest=} [properties] Properties to set
         */
        function SpawnRequest(properties) {
            this.env = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SpawnRequest name.
         * @member {string} name
         * @memberof vtr.SpawnRequest
         * @instance
         */
        SpawnRequest.prototype.name = "";

        /**
         * SpawnRequest command.
         * @member {string} command
         * @memberof vtr.SpawnRequest
         * @instance
         */
        SpawnRequest.prototype.command = "";

        /**
         * SpawnRequest working_dir.
         * @member {string} working_dir
         * @memberof vtr.SpawnRequest
         * @instance
         */
        SpawnRequest.prototype.working_dir = "";

        /**
         * SpawnRequest env.
         * @member {Object.<string,string>} env
         * @memberof vtr.SpawnRequest
         * @instance
         */
        SpawnRequest.prototype.env = $util.emptyObject;

        /**
         * SpawnRequest cols.
         * @member {number} cols
         * @memberof vtr.SpawnRequest
         * @instance
         */
        SpawnRequest.prototype.cols = 0;

        /**
         * SpawnRequest rows.
         * @member {number} rows
         * @memberof vtr.SpawnRequest
         * @instance
         */
        SpawnRequest.prototype.rows = 0;

        /**
         * Creates a new SpawnRequest instance using the specified properties.
         * @function create
         * @memberof vtr.SpawnRequest
         * @static
         * @param {vtr.ISpawnRequest=} [properties] Properties to set
         * @returns {vtr.SpawnRequest} SpawnRequest instance
         */
        SpawnRequest.create = function create(properties) {
            return new SpawnRequest(properties);
        };

        /**
         * Encodes the specified SpawnRequest message. Does not implicitly {@link vtr.SpawnRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.SpawnRequest
         * @static
         * @param {vtr.ISpawnRequest} message SpawnRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SpawnRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
            if (message.command != null && Object.hasOwnProperty.call(message, "command"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.command);
            if (message.working_dir != null && Object.hasOwnProperty.call(message, "working_dir"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.working_dir);
            if (message.env != null && Object.hasOwnProperty.call(message, "env"))
                for (let keys = Object.keys(message.env), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 4, wireType 2 =*/34).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.env[keys[i]]).ldelim();
            if (message.cols != null && Object.hasOwnProperty.call(message, "cols"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.cols);
            if (message.rows != null && Object.hasOwnProperty.call(message, "rows"))
                writer.uint32(/* id 6, wireType 0 =*/48).int32(message.rows);
            return writer;
        };

        /**
         * Encodes the specified SpawnRequest message, length delimited. Does not implicitly {@link vtr.SpawnRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SpawnRequest
         * @static
         * @param {vtr.ISpawnRequest} message SpawnRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SpawnRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SpawnRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SpawnRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SpawnRequest} SpawnRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SpawnRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SpawnRequest(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.name = reader.string();
                        break;
                    }
                case 2: {
                        message.command = reader.string();
                        break;
                    }
                case 3: {
                        message.working_dir = reader.string();
                        break;
                    }
                case 4: {
                        if (message.env === $util.emptyObject)
                            message.env = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.env[key] = value;
                        break;
                    }
                case 5: {
                        message.cols = reader.int32();
                        break;
                    }
                case 6: {
                        message.rows = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SpawnRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SpawnRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SpawnRequest} SpawnRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SpawnRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SpawnRequest message.
         * @function verify
         * @memberof vtr.SpawnRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SpawnRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            if (message.command != null && message.hasOwnProperty("command"))
                if (!$util.isString(message.command))
                    return "command: string expected";
            if (message.working_dir != null && message.hasOwnProperty("working_dir"))
                if (!$util.isString(message.working_dir))
                    return "working_dir: string expected";
            if (message.env != null && message.hasOwnProperty("env")) {
                if (!$util.isObject(message.env))
                    return "env: object expected";
                let key = Object.keys(message.env);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isString(message.env[key[i]]))
                        return "env: string{k:string} expected";
            }
            if (message.cols != null && message.hasOwnProperty("cols"))
                if (!$util.isInteger(message.cols))
                    return "cols: integer expected";
            if (message.rows != null && message.hasOwnProperty("rows"))
                if (!$util.isInteger(message.rows))
                    return "rows: integer expected";
            return null;
        };

        /**
         * Creates a SpawnRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SpawnRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SpawnRequest} SpawnRequest
         */
        SpawnRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SpawnRequest)
                return object;
            let message = new $root.vtr.SpawnRequest();
            if (object.name != null)
                message.name = String(object.name);
            if (object.command != null)
                message.command = String(object.command);
            if (object.working_dir != null)
                message.working_dir = String(object.working_dir);
            if (object.env) {
                if (typeof object.env !== "object")
                    throw TypeError(".vtr.SpawnRequest.env: object expected");
                message.env = {};
                for (let keys = Object.keys(object.env), i = 0; i < keys.length; ++i)
                    message.env[keys[i]] = String(object.env[keys[i]]);
            }
            if (object.cols != null)
                message.cols = object.cols | 0;
            if (object.rows != null)
                message.rows = object.rows | 0;
            return message;
        };

        /**
         * Creates a plain object from a SpawnRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SpawnRequest
         * @static
         * @param {vtr.SpawnRequest} message SpawnRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SpawnRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.objects || options.defaults)
                object.env = {};
            if (options.defaults) {
                object.name = "";
                object.command = "";
                object.working_dir = "";
                object.cols = 0;
                object.rows = 0;
            }
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            if (message.command != null && message.hasOwnProperty("command"))
                object.command = message.command;
            if (message.working_dir != null && message.hasOwnProperty("working_dir"))
                object.working_dir = message.working_dir;
            let keys2;
            if (message.env && (keys2 = Object.keys(message.env)).length) {
                object.env = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.env[keys2[j]] = message.env[keys2[j]];
            }
            if (message.cols != null && message.hasOwnProperty("cols"))
                object.cols = message.cols;
            if (message.rows != null && message.hasOwnProperty("rows"))
                object.rows = message.rows;
            return object;
        };

        /**
         * Converts this SpawnRequest to JSON.
         * @function toJSON
         * @memberof vtr.SpawnRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SpawnRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SpawnRequest
         * @function getTypeUrl
         * @memberof vtr.SpawnRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SpawnRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SpawnRequest";
        };

        return SpawnRequest;
    })();

    vtr.SpawnResponse = (function() {

        /**
         * Properties of a SpawnResponse.
         * @memberof vtr
         * @interface ISpawnResponse
         * @property {vtr.ISession|null} [session] SpawnResponse session
         */

        /**
         * Constructs a new SpawnResponse.
         * @memberof vtr
         * @classdesc Represents a SpawnResponse.
         * @implements ISpawnResponse
         * @constructor
         * @param {vtr.ISpawnResponse=} [properties] Properties to set
         */
        function SpawnResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SpawnResponse session.
         * @member {vtr.ISession|null|undefined} session
         * @memberof vtr.SpawnResponse
         * @instance
         */
        SpawnResponse.prototype.session = null;

        /**
         * Creates a new SpawnResponse instance using the specified properties.
         * @function create
         * @memberof vtr.SpawnResponse
         * @static
         * @param {vtr.ISpawnResponse=} [properties] Properties to set
         * @returns {vtr.SpawnResponse} SpawnResponse instance
         */
        SpawnResponse.create = function create(properties) {
            return new SpawnResponse(properties);
        };

        /**
         * Encodes the specified SpawnResponse message. Does not implicitly {@link vtr.SpawnResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.SpawnResponse
         * @static
         * @param {vtr.ISpawnResponse} message SpawnResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SpawnResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.Session.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified SpawnResponse message, length delimited. Does not implicitly {@link vtr.SpawnResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SpawnResponse
         * @static
         * @param {vtr.ISpawnResponse} message SpawnResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SpawnResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SpawnResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SpawnResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SpawnResponse} SpawnResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SpawnResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SpawnResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.Session.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SpawnResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SpawnResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SpawnResponse} SpawnResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SpawnResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SpawnResponse message.
         * @function verify
         * @memberof vtr.SpawnResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SpawnResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.Session.verify(message.session);
                if (error)
                    return "session." + error;
            }
            return null;
        };

        /**
         * Creates a SpawnResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SpawnResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SpawnResponse} SpawnResponse
         */
        SpawnResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SpawnResponse)
                return object;
            let message = new $root.vtr.SpawnResponse();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.SpawnResponse.session: object expected");
                message.session = $root.vtr.Session.fromObject(object.session);
            }
            return message;
        };

        /**
         * Creates a plain object from a SpawnResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SpawnResponse
         * @static
         * @param {vtr.SpawnResponse} message SpawnResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SpawnResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.session = null;
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.Session.toObject(message.session, options);
            return object;
        };

        /**
         * Converts this SpawnResponse to JSON.
         * @function toJSON
         * @memberof vtr.SpawnResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SpawnResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SpawnResponse
         * @function getTypeUrl
         * @memberof vtr.SpawnResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SpawnResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SpawnResponse";
        };

        return SpawnResponse;
    })();

    vtr.ListRequest = (function() {

        /**
         * Properties of a ListRequest.
         * @memberof vtr
         * @interface IListRequest
         */

        /**
         * Constructs a new ListRequest.
         * @memberof vtr
         * @classdesc Represents a ListRequest.
         * @implements IListRequest
         * @constructor
         * @param {vtr.IListRequest=} [properties] Properties to set
         */
        function ListRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new ListRequest instance using the specified properties.
         * @function create
         * @memberof vtr.ListRequest
         * @static
         * @param {vtr.IListRequest=} [properties] Properties to set
         * @returns {vtr.ListRequest} ListRequest instance
         */
        ListRequest.create = function create(properties) {
            return new ListRequest(properties);
        };

        /**
         * Encodes the specified ListRequest message. Does not implicitly {@link vtr.ListRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.ListRequest
         * @static
         * @param {vtr.IListRequest} message ListRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified ListRequest message, length delimited. Does not implicitly {@link vtr.ListRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.ListRequest
         * @static
         * @param {vtr.IListRequest} message ListRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.ListRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.ListRequest} ListRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.ListRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ListRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.ListRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.ListRequest} ListRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ListRequest message.
         * @function verify
         * @memberof vtr.ListRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ListRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates a ListRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.ListRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.ListRequest} ListRequest
         */
        ListRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.ListRequest)
                return object;
            return new $root.vtr.ListRequest();
        };

        /**
         * Creates a plain object from a ListRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.ListRequest
         * @static
         * @param {vtr.ListRequest} message ListRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ListRequest.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this ListRequest to JSON.
         * @function toJSON
         * @memberof vtr.ListRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ListRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ListRequest
         * @function getTypeUrl
         * @memberof vtr.ListRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ListRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.ListRequest";
        };

        return ListRequest;
    })();

    vtr.ListResponse = (function() {

        /**
         * Properties of a ListResponse.
         * @memberof vtr
         * @interface IListResponse
         * @property {Array.<vtr.ISession>|null} [sessions] ListResponse sessions
         */

        /**
         * Constructs a new ListResponse.
         * @memberof vtr
         * @classdesc Represents a ListResponse.
         * @implements IListResponse
         * @constructor
         * @param {vtr.IListResponse=} [properties] Properties to set
         */
        function ListResponse(properties) {
            this.sessions = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ListResponse sessions.
         * @member {Array.<vtr.ISession>} sessions
         * @memberof vtr.ListResponse
         * @instance
         */
        ListResponse.prototype.sessions = $util.emptyArray;

        /**
         * Creates a new ListResponse instance using the specified properties.
         * @function create
         * @memberof vtr.ListResponse
         * @static
         * @param {vtr.IListResponse=} [properties] Properties to set
         * @returns {vtr.ListResponse} ListResponse instance
         */
        ListResponse.create = function create(properties) {
            return new ListResponse(properties);
        };

        /**
         * Encodes the specified ListResponse message. Does not implicitly {@link vtr.ListResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.ListResponse
         * @static
         * @param {vtr.IListResponse} message ListResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.sessions != null && message.sessions.length)
                for (let i = 0; i < message.sessions.length; ++i)
                    $root.vtr.Session.encode(message.sessions[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ListResponse message, length delimited. Does not implicitly {@link vtr.ListResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.ListResponse
         * @static
         * @param {vtr.IListResponse} message ListResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.ListResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.ListResponse} ListResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.ListResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.sessions && message.sessions.length))
                            message.sessions = [];
                        message.sessions.push($root.vtr.Session.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ListResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.ListResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.ListResponse} ListResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ListResponse message.
         * @function verify
         * @memberof vtr.ListResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ListResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.sessions != null && message.hasOwnProperty("sessions")) {
                if (!Array.isArray(message.sessions))
                    return "sessions: array expected";
                for (let i = 0; i < message.sessions.length; ++i) {
                    let error = $root.vtr.Session.verify(message.sessions[i]);
                    if (error)
                        return "sessions." + error;
                }
            }
            return null;
        };

        /**
         * Creates a ListResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.ListResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.ListResponse} ListResponse
         */
        ListResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.ListResponse)
                return object;
            let message = new $root.vtr.ListResponse();
            if (object.sessions) {
                if (!Array.isArray(object.sessions))
                    throw TypeError(".vtr.ListResponse.sessions: array expected");
                message.sessions = [];
                for (let i = 0; i < object.sessions.length; ++i) {
                    if (typeof object.sessions[i] !== "object")
                        throw TypeError(".vtr.ListResponse.sessions: object expected");
                    message.sessions[i] = $root.vtr.Session.fromObject(object.sessions[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a ListResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.ListResponse
         * @static
         * @param {vtr.ListResponse} message ListResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ListResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.sessions = [];
            if (message.sessions && message.sessions.length) {
                object.sessions = [];
                for (let j = 0; j < message.sessions.length; ++j)
                    object.sessions[j] = $root.vtr.Session.toObject(message.sessions[j], options);
            }
            return object;
        };

        /**
         * Converts this ListResponse to JSON.
         * @function toJSON
         * @memberof vtr.ListResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ListResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ListResponse
         * @function getTypeUrl
         * @memberof vtr.ListResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ListResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.ListResponse";
        };

        return ListResponse;
    })();

    vtr.SubscribeSessionsRequest = (function() {

        /**
         * Properties of a SubscribeSessionsRequest.
         * @memberof vtr
         * @interface ISubscribeSessionsRequest
         * @property {boolean|null} [exclude_exited] SubscribeSessionsRequest exclude_exited
         */

        /**
         * Constructs a new SubscribeSessionsRequest.
         * @memberof vtr
         * @classdesc Represents a SubscribeSessionsRequest.
         * @implements ISubscribeSessionsRequest
         * @constructor
         * @param {vtr.ISubscribeSessionsRequest=} [properties] Properties to set
         */
        function SubscribeSessionsRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SubscribeSessionsRequest exclude_exited.
         * @member {boolean} exclude_exited
         * @memberof vtr.SubscribeSessionsRequest
         * @instance
         */
        SubscribeSessionsRequest.prototype.exclude_exited = false;

        /**
         * Creates a new SubscribeSessionsRequest instance using the specified properties.
         * @function create
         * @memberof vtr.SubscribeSessionsRequest
         * @static
         * @param {vtr.ISubscribeSessionsRequest=} [properties] Properties to set
         * @returns {vtr.SubscribeSessionsRequest} SubscribeSessionsRequest instance
         */
        SubscribeSessionsRequest.create = function create(properties) {
            return new SubscribeSessionsRequest(properties);
        };

        /**
         * Encodes the specified SubscribeSessionsRequest message. Does not implicitly {@link vtr.SubscribeSessionsRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.SubscribeSessionsRequest
         * @static
         * @param {vtr.ISubscribeSessionsRequest} message SubscribeSessionsRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SubscribeSessionsRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.exclude_exited != null && Object.hasOwnProperty.call(message, "exclude_exited"))
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.exclude_exited);
            return writer;
        };

        /**
         * Encodes the specified SubscribeSessionsRequest message, length delimited. Does not implicitly {@link vtr.SubscribeSessionsRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SubscribeSessionsRequest
         * @static
         * @param {vtr.ISubscribeSessionsRequest} message SubscribeSessionsRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SubscribeSessionsRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SubscribeSessionsRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SubscribeSessionsRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SubscribeSessionsRequest} SubscribeSessionsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SubscribeSessionsRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SubscribeSessionsRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.exclude_exited = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SubscribeSessionsRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SubscribeSessionsRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SubscribeSessionsRequest} SubscribeSessionsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SubscribeSessionsRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SubscribeSessionsRequest message.
         * @function verify
         * @memberof vtr.SubscribeSessionsRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SubscribeSessionsRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.exclude_exited != null && message.hasOwnProperty("exclude_exited"))
                if (typeof message.exclude_exited !== "boolean")
                    return "exclude_exited: boolean expected";
            return null;
        };

        /**
         * Creates a SubscribeSessionsRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SubscribeSessionsRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SubscribeSessionsRequest} SubscribeSessionsRequest
         */
        SubscribeSessionsRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SubscribeSessionsRequest)
                return object;
            let message = new $root.vtr.SubscribeSessionsRequest();
            if (object.exclude_exited != null)
                message.exclude_exited = Boolean(object.exclude_exited);
            return message;
        };

        /**
         * Creates a plain object from a SubscribeSessionsRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SubscribeSessionsRequest
         * @static
         * @param {vtr.SubscribeSessionsRequest} message SubscribeSessionsRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SubscribeSessionsRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.exclude_exited = false;
            if (message.exclude_exited != null && message.hasOwnProperty("exclude_exited"))
                object.exclude_exited = message.exclude_exited;
            return object;
        };

        /**
         * Converts this SubscribeSessionsRequest to JSON.
         * @function toJSON
         * @memberof vtr.SubscribeSessionsRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SubscribeSessionsRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SubscribeSessionsRequest
         * @function getTypeUrl
         * @memberof vtr.SubscribeSessionsRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SubscribeSessionsRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SubscribeSessionsRequest";
        };

        return SubscribeSessionsRequest;
    })();

    vtr.SpokeInfo = (function() {

        /**
         * Properties of a SpokeInfo.
         * @memberof vtr
         * @interface ISpokeInfo
         * @property {string|null} [name] SpokeInfo name
         * @property {Object.<string,string>|null} [labels] SpokeInfo labels
         * @property {string|null} [version] SpokeInfo version
         */

        /**
         * Constructs a new SpokeInfo.
         * @memberof vtr
         * @classdesc Represents a SpokeInfo.
         * @implements ISpokeInfo
         * @constructor
         * @param {vtr.ISpokeInfo=} [properties] Properties to set
         */
        function SpokeInfo(properties) {
            this.labels = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SpokeInfo name.
         * @member {string} name
         * @memberof vtr.SpokeInfo
         * @instance
         */
        SpokeInfo.prototype.name = "";

        /**
         * SpokeInfo labels.
         * @member {Object.<string,string>} labels
         * @memberof vtr.SpokeInfo
         * @instance
         */
        SpokeInfo.prototype.labels = $util.emptyObject;

        /**
         * SpokeInfo version.
         * @member {string} version
         * @memberof vtr.SpokeInfo
         * @instance
         */
        SpokeInfo.prototype.version = "";

        /**
         * Creates a new SpokeInfo instance using the specified properties.
         * @function create
         * @memberof vtr.SpokeInfo
         * @static
         * @param {vtr.ISpokeInfo=} [properties] Properties to set
         * @returns {vtr.SpokeInfo} SpokeInfo instance
         */
        SpokeInfo.create = function create(properties) {
            return new SpokeInfo(properties);
        };

        /**
         * Encodes the specified SpokeInfo message. Does not implicitly {@link vtr.SpokeInfo.verify|verify} messages.
         * @function encode
         * @memberof vtr.SpokeInfo
         * @static
         * @param {vtr.ISpokeInfo} message SpokeInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SpokeInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
            if (message.labels != null && Object.hasOwnProperty.call(message, "labels"))
                for (let keys = Object.keys(message.labels), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.labels[keys[i]]).ldelim();
            if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.version);
            return writer;
        };

        /**
         * Encodes the specified SpokeInfo message, length delimited. Does not implicitly {@link vtr.SpokeInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SpokeInfo
         * @static
         * @param {vtr.ISpokeInfo} message SpokeInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SpokeInfo.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SpokeInfo message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SpokeInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SpokeInfo} SpokeInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SpokeInfo.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SpokeInfo(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.name = reader.string();
                        break;
                    }
                case 3: {
                        if (message.labels === $util.emptyObject)
                            message.labels = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.labels[key] = value;
                        break;
                    }
                case 4: {
                        message.version = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SpokeInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SpokeInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SpokeInfo} SpokeInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SpokeInfo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SpokeInfo message.
         * @function verify
         * @memberof vtr.SpokeInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SpokeInfo.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            if (message.labels != null && message.hasOwnProperty("labels")) {
                if (!$util.isObject(message.labels))
                    return "labels: object expected";
                let key = Object.keys(message.labels);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isString(message.labels[key[i]]))
                        return "labels: string{k:string} expected";
            }
            if (message.version != null && message.hasOwnProperty("version"))
                if (!$util.isString(message.version))
                    return "version: string expected";
            return null;
        };

        /**
         * Creates a SpokeInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SpokeInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SpokeInfo} SpokeInfo
         */
        SpokeInfo.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SpokeInfo)
                return object;
            let message = new $root.vtr.SpokeInfo();
            if (object.name != null)
                message.name = String(object.name);
            if (object.labels) {
                if (typeof object.labels !== "object")
                    throw TypeError(".vtr.SpokeInfo.labels: object expected");
                message.labels = {};
                for (let keys = Object.keys(object.labels), i = 0; i < keys.length; ++i)
                    message.labels[keys[i]] = String(object.labels[keys[i]]);
            }
            if (object.version != null)
                message.version = String(object.version);
            return message;
        };

        /**
         * Creates a plain object from a SpokeInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SpokeInfo
         * @static
         * @param {vtr.SpokeInfo} message SpokeInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SpokeInfo.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.objects || options.defaults)
                object.labels = {};
            if (options.defaults) {
                object.name = "";
                object.version = "";
            }
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            let keys2;
            if (message.labels && (keys2 = Object.keys(message.labels)).length) {
                object.labels = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.labels[keys2[j]] = message.labels[keys2[j]];
            }
            if (message.version != null && message.hasOwnProperty("version"))
                object.version = message.version;
            return object;
        };

        /**
         * Converts this SpokeInfo to JSON.
         * @function toJSON
         * @memberof vtr.SpokeInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SpokeInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SpokeInfo
         * @function getTypeUrl
         * @memberof vtr.SpokeInfo
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SpokeInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SpokeInfo";
        };

        return SpokeInfo;
    })();

    vtr.TunnelFrame = (function() {

        /**
         * Properties of a TunnelFrame.
         * @memberof vtr
         * @interface ITunnelFrame
         * @property {string|null} [call_id] TunnelFrame call_id
         * @property {vtr.ITunnelHello|null} [hello] TunnelFrame hello
         * @property {vtr.ITunnelRequest|null} [request] TunnelFrame request
         * @property {vtr.ITunnelResponse|null} [response] TunnelFrame response
         * @property {vtr.ITunnelStreamEvent|null} [event] TunnelFrame event
         * @property {vtr.ITunnelCancel|null} [cancel] TunnelFrame cancel
         * @property {vtr.ITunnelError|null} [error] TunnelFrame error
         * @property {vtr.ITunnelTraceBatch|null} [trace] TunnelFrame trace
         */

        /**
         * Constructs a new TunnelFrame.
         * @memberof vtr
         * @classdesc Represents a TunnelFrame.
         * @implements ITunnelFrame
         * @constructor
         * @param {vtr.ITunnelFrame=} [properties] Properties to set
         */
        function TunnelFrame(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TunnelFrame call_id.
         * @member {string} call_id
         * @memberof vtr.TunnelFrame
         * @instance
         */
        TunnelFrame.prototype.call_id = "";

        /**
         * TunnelFrame hello.
         * @member {vtr.ITunnelHello|null|undefined} hello
         * @memberof vtr.TunnelFrame
         * @instance
         */
        TunnelFrame.prototype.hello = null;

        /**
         * TunnelFrame request.
         * @member {vtr.ITunnelRequest|null|undefined} request
         * @memberof vtr.TunnelFrame
         * @instance
         */
        TunnelFrame.prototype.request = null;

        /**
         * TunnelFrame response.
         * @member {vtr.ITunnelResponse|null|undefined} response
         * @memberof vtr.TunnelFrame
         * @instance
         */
        TunnelFrame.prototype.response = null;

        /**
         * TunnelFrame event.
         * @member {vtr.ITunnelStreamEvent|null|undefined} event
         * @memberof vtr.TunnelFrame
         * @instance
         */
        TunnelFrame.prototype.event = null;

        /**
         * TunnelFrame cancel.
         * @member {vtr.ITunnelCancel|null|undefined} cancel
         * @memberof vtr.TunnelFrame
         * @instance
         */
        TunnelFrame.prototype.cancel = null;

        /**
         * TunnelFrame error.
         * @member {vtr.ITunnelError|null|undefined} error
         * @memberof vtr.TunnelFrame
         * @instance
         */
        TunnelFrame.prototype.error = null;

        /**
         * TunnelFrame trace.
         * @member {vtr.ITunnelTraceBatch|null|undefined} trace
         * @memberof vtr.TunnelFrame
         * @instance
         */
        TunnelFrame.prototype.trace = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * TunnelFrame kind.
         * @member {"hello"|"request"|"response"|"event"|"cancel"|"error"|"trace"|undefined} kind
         * @memberof vtr.TunnelFrame
         * @instance
         */
        Object.defineProperty(TunnelFrame.prototype, "kind", {
            get: $util.oneOfGetter($oneOfFields = ["hello", "request", "response", "event", "cancel", "error", "trace"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new TunnelFrame instance using the specified properties.
         * @function create
         * @memberof vtr.TunnelFrame
         * @static
         * @param {vtr.ITunnelFrame=} [properties] Properties to set
         * @returns {vtr.TunnelFrame} TunnelFrame instance
         */
        TunnelFrame.create = function create(properties) {
            return new TunnelFrame(properties);
        };

        /**
         * Encodes the specified TunnelFrame message. Does not implicitly {@link vtr.TunnelFrame.verify|verify} messages.
         * @function encode
         * @memberof vtr.TunnelFrame
         * @static
         * @param {vtr.ITunnelFrame} message TunnelFrame message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelFrame.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.call_id != null && Object.hasOwnProperty.call(message, "call_id"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.call_id);
            if (message.hello != null && Object.hasOwnProperty.call(message, "hello"))
                $root.vtr.TunnelHello.encode(message.hello, writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
            if (message.request != null && Object.hasOwnProperty.call(message, "request"))
                $root.vtr.TunnelRequest.encode(message.request, writer.uint32(/* id 11, wireType 2 =*/90).fork()).ldelim();
            if (message.response != null && Object.hasOwnProperty.call(message, "response"))
                $root.vtr.TunnelResponse.encode(message.response, writer.uint32(/* id 12, wireType 2 =*/98).fork()).ldelim();
            if (message.event != null && Object.hasOwnProperty.call(message, "event"))
                $root.vtr.TunnelStreamEvent.encode(message.event, writer.uint32(/* id 13, wireType 2 =*/106).fork()).ldelim();
            if (message.cancel != null && Object.hasOwnProperty.call(message, "cancel"))
                $root.vtr.TunnelCancel.encode(message.cancel, writer.uint32(/* id 14, wireType 2 =*/114).fork()).ldelim();
            if (message.error != null && Object.hasOwnProperty.call(message, "error"))
                $root.vtr.TunnelError.encode(message.error, writer.uint32(/* id 15, wireType 2 =*/122).fork()).ldelim();
            if (message.trace != null && Object.hasOwnProperty.call(message, "trace"))
                $root.vtr.TunnelTraceBatch.encode(message.trace, writer.uint32(/* id 16, wireType 2 =*/130).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified TunnelFrame message, length delimited. Does not implicitly {@link vtr.TunnelFrame.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.TunnelFrame
         * @static
         * @param {vtr.ITunnelFrame} message TunnelFrame message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelFrame.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TunnelFrame message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.TunnelFrame
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.TunnelFrame} TunnelFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelFrame.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.TunnelFrame();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 2: {
                        message.call_id = reader.string();
                        break;
                    }
                case 10: {
                        message.hello = $root.vtr.TunnelHello.decode(reader, reader.uint32());
                        break;
                    }
                case 11: {
                        message.request = $root.vtr.TunnelRequest.decode(reader, reader.uint32());
                        break;
                    }
                case 12: {
                        message.response = $root.vtr.TunnelResponse.decode(reader, reader.uint32());
                        break;
                    }
                case 13: {
                        message.event = $root.vtr.TunnelStreamEvent.decode(reader, reader.uint32());
                        break;
                    }
                case 14: {
                        message.cancel = $root.vtr.TunnelCancel.decode(reader, reader.uint32());
                        break;
                    }
                case 15: {
                        message.error = $root.vtr.TunnelError.decode(reader, reader.uint32());
                        break;
                    }
                case 16: {
                        message.trace = $root.vtr.TunnelTraceBatch.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TunnelFrame message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.TunnelFrame
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.TunnelFrame} TunnelFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelFrame.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TunnelFrame message.
         * @function verify
         * @memberof vtr.TunnelFrame
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TunnelFrame.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.call_id != null && message.hasOwnProperty("call_id"))
                if (!$util.isString(message.call_id))
                    return "call_id: string expected";
            if (message.hello != null && message.hasOwnProperty("hello")) {
                properties.kind = 1;
                {
                    let error = $root.vtr.TunnelHello.verify(message.hello);
                    if (error)
                        return "hello." + error;
                }
            }
            if (message.request != null && message.hasOwnProperty("request")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.vtr.TunnelRequest.verify(message.request);
                    if (error)
                        return "request." + error;
                }
            }
            if (message.response != null && message.hasOwnProperty("response")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.vtr.TunnelResponse.verify(message.response);
                    if (error)
                        return "response." + error;
                }
            }
            if (message.event != null && message.hasOwnProperty("event")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.vtr.TunnelStreamEvent.verify(message.event);
                    if (error)
                        return "event." + error;
                }
            }
            if (message.cancel != null && message.hasOwnProperty("cancel")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.vtr.TunnelCancel.verify(message.cancel);
                    if (error)
                        return "cancel." + error;
                }
            }
            if (message.error != null && message.hasOwnProperty("error")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.vtr.TunnelError.verify(message.error);
                    if (error)
                        return "error." + error;
                }
            }
            if (message.trace != null && message.hasOwnProperty("trace")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.vtr.TunnelTraceBatch.verify(message.trace);
                    if (error)
                        return "trace." + error;
                }
            }
            return null;
        };

        /**
         * Creates a TunnelFrame message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.TunnelFrame
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.TunnelFrame} TunnelFrame
         */
        TunnelFrame.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.TunnelFrame)
                return object;
            let message = new $root.vtr.TunnelFrame();
            if (object.call_id != null)
                message.call_id = String(object.call_id);
            if (object.hello != null) {
                if (typeof object.hello !== "object")
                    throw TypeError(".vtr.TunnelFrame.hello: object expected");
                message.hello = $root.vtr.TunnelHello.fromObject(object.hello);
            }
            if (object.request != null) {
                if (typeof object.request !== "object")
                    throw TypeError(".vtr.TunnelFrame.request: object expected");
                message.request = $root.vtr.TunnelRequest.fromObject(object.request);
            }
            if (object.response != null) {
                if (typeof object.response !== "object")
                    throw TypeError(".vtr.TunnelFrame.response: object expected");
                message.response = $root.vtr.TunnelResponse.fromObject(object.response);
            }
            if (object.event != null) {
                if (typeof object.event !== "object")
                    throw TypeError(".vtr.TunnelFrame.event: object expected");
                message.event = $root.vtr.TunnelStreamEvent.fromObject(object.event);
            }
            if (object.cancel != null) {
                if (typeof object.cancel !== "object")
                    throw TypeError(".vtr.TunnelFrame.cancel: object expected");
                message.cancel = $root.vtr.TunnelCancel.fromObject(object.cancel);
            }
            if (object.error != null) {
                if (typeof object.error !== "object")
                    throw TypeError(".vtr.TunnelFrame.error: object expected");
                message.error = $root.vtr.TunnelError.fromObject(object.error);
            }
            if (object.trace != null) {
                if (typeof object.trace !== "object")
                    throw TypeError(".vtr.TunnelFrame.trace: object expected");
                message.trace = $root.vtr.TunnelTraceBatch.fromObject(object.trace);
            }
            return message;
        };

        /**
         * Creates a plain object from a TunnelFrame message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.TunnelFrame
         * @static
         * @param {vtr.TunnelFrame} message TunnelFrame
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TunnelFrame.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.call_id = "";
            if (message.call_id != null && message.hasOwnProperty("call_id"))
                object.call_id = message.call_id;
            if (message.hello != null && message.hasOwnProperty("hello")) {
                object.hello = $root.vtr.TunnelHello.toObject(message.hello, options);
                if (options.oneofs)
                    object.kind = "hello";
            }
            if (message.request != null && message.hasOwnProperty("request")) {
                object.request = $root.vtr.TunnelRequest.toObject(message.request, options);
                if (options.oneofs)
                    object.kind = "request";
            }
            if (message.response != null && message.hasOwnProperty("response")) {
                object.response = $root.vtr.TunnelResponse.toObject(message.response, options);
                if (options.oneofs)
                    object.kind = "response";
            }
            if (message.event != null && message.hasOwnProperty("event")) {
                object.event = $root.vtr.TunnelStreamEvent.toObject(message.event, options);
                if (options.oneofs)
                    object.kind = "event";
            }
            if (message.cancel != null && message.hasOwnProperty("cancel")) {
                object.cancel = $root.vtr.TunnelCancel.toObject(message.cancel, options);
                if (options.oneofs)
                    object.kind = "cancel";
            }
            if (message.error != null && message.hasOwnProperty("error")) {
                object.error = $root.vtr.TunnelError.toObject(message.error, options);
                if (options.oneofs)
                    object.kind = "error";
            }
            if (message.trace != null && message.hasOwnProperty("trace")) {
                object.trace = $root.vtr.TunnelTraceBatch.toObject(message.trace, options);
                if (options.oneofs)
                    object.kind = "trace";
            }
            return object;
        };

        /**
         * Converts this TunnelFrame to JSON.
         * @function toJSON
         * @memberof vtr.TunnelFrame
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TunnelFrame.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TunnelFrame
         * @function getTypeUrl
         * @memberof vtr.TunnelFrame
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TunnelFrame.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.TunnelFrame";
        };

        return TunnelFrame;
    })();

    vtr.TunnelHello = (function() {

        /**
         * Properties of a TunnelHello.
         * @memberof vtr
         * @interface ITunnelHello
         * @property {string|null} [version] TunnelHello version
         * @property {Object.<string,string>|null} [labels] TunnelHello labels
         * @property {string|null} [name] TunnelHello name
         */

        /**
         * Constructs a new TunnelHello.
         * @memberof vtr
         * @classdesc Represents a TunnelHello.
         * @implements ITunnelHello
         * @constructor
         * @param {vtr.ITunnelHello=} [properties] Properties to set
         */
        function TunnelHello(properties) {
            this.labels = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TunnelHello version.
         * @member {string} version
         * @memberof vtr.TunnelHello
         * @instance
         */
        TunnelHello.prototype.version = "";

        /**
         * TunnelHello labels.
         * @member {Object.<string,string>} labels
         * @memberof vtr.TunnelHello
         * @instance
         */
        TunnelHello.prototype.labels = $util.emptyObject;

        /**
         * TunnelHello name.
         * @member {string} name
         * @memberof vtr.TunnelHello
         * @instance
         */
        TunnelHello.prototype.name = "";

        /**
         * Creates a new TunnelHello instance using the specified properties.
         * @function create
         * @memberof vtr.TunnelHello
         * @static
         * @param {vtr.ITunnelHello=} [properties] Properties to set
         * @returns {vtr.TunnelHello} TunnelHello instance
         */
        TunnelHello.create = function create(properties) {
            return new TunnelHello(properties);
        };

        /**
         * Encodes the specified TunnelHello message. Does not implicitly {@link vtr.TunnelHello.verify|verify} messages.
         * @function encode
         * @memberof vtr.TunnelHello
         * @static
         * @param {vtr.ITunnelHello} message TunnelHello message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelHello.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.version);
            if (message.labels != null && Object.hasOwnProperty.call(message, "labels"))
                for (let keys = Object.keys(message.labels), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.labels[keys[i]]).ldelim();
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.name);
            return writer;
        };

        /**
         * Encodes the specified TunnelHello message, length delimited. Does not implicitly {@link vtr.TunnelHello.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.TunnelHello
         * @static
         * @param {vtr.ITunnelHello} message TunnelHello message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelHello.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TunnelHello message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.TunnelHello
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.TunnelHello} TunnelHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelHello.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.TunnelHello(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.version = reader.string();
                        break;
                    }
                case 2: {
                        if (message.labels === $util.emptyObject)
                            message.labels = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.labels[key] = value;
                        break;
                    }
                case 3: {
                        message.name = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TunnelHello message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.TunnelHello
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.TunnelHello} TunnelHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelHello.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TunnelHello message.
         * @function verify
         * @memberof vtr.TunnelHello
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TunnelHello.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.version != null && message.hasOwnProperty("version"))
                if (!$util.isString(message.version))
                    return "version: string expected";
            if (message.labels != null && message.hasOwnProperty("labels")) {
                if (!$util.isObject(message.labels))
                    return "labels: object expected";
                let key = Object.keys(message.labels);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isString(message.labels[key[i]]))
                        return "labels: string{k:string} expected";
            }
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            return null;
        };

        /**
         * Creates a TunnelHello message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.TunnelHello
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.TunnelHello} TunnelHello
         */
        TunnelHello.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.TunnelHello)
                return object;
            let message = new $root.vtr.TunnelHello();
            if (object.version != null)
                message.version = String(object.version);
            if (object.labels) {
                if (typeof object.labels !== "object")
                    throw TypeError(".vtr.TunnelHello.labels: object expected");
                message.labels = {};
                for (let keys = Object.keys(object.labels), i = 0; i < keys.length; ++i)
                    message.labels[keys[i]] = String(object.labels[keys[i]]);
            }
            if (object.name != null)
                message.name = String(object.name);
            return message;
        };

        /**
         * Creates a plain object from a TunnelHello message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.TunnelHello
         * @static
         * @param {vtr.TunnelHello} message TunnelHello
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TunnelHello.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.objects || options.defaults)
                object.labels = {};
            if (options.defaults) {
                object.version = "";
                object.name = "";
            }
            if (message.version != null && message.hasOwnProperty("version"))
                object.version = message.version;
            let keys2;
            if (message.labels && (keys2 = Object.keys(message.labels)).length) {
                object.labels = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.labels[keys2[j]] = message.labels[keys2[j]];
            }
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            return object;
        };

        /**
         * Converts this TunnelHello to JSON.
         * @function toJSON
         * @memberof vtr.TunnelHello
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TunnelHello.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TunnelHello
         * @function getTypeUrl
         * @memberof vtr.TunnelHello
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TunnelHello.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.TunnelHello";
        };

        return TunnelHello;
    })();

    vtr.TunnelRequest = (function() {

        /**
         * Properties of a TunnelRequest.
         * @memberof vtr
         * @interface ITunnelRequest
         * @property {string|null} [method] TunnelRequest method
         * @property {Uint8Array|null} [payload] TunnelRequest payload
         * @property {boolean|null} [stream] TunnelRequest stream
         * @property {string|null} [trace_parent] TunnelRequest trace_parent
         * @property {string|null} [trace_state] TunnelRequest trace_state
         * @property {string|null} [baggage] TunnelRequest baggage
         */

        /**
         * Constructs a new TunnelRequest.
         * @memberof vtr
         * @classdesc Represents a TunnelRequest.
         * @implements ITunnelRequest
         * @constructor
         * @param {vtr.ITunnelRequest=} [properties] Properties to set
         */
        function TunnelRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TunnelRequest method.
         * @member {string} method
         * @memberof vtr.TunnelRequest
         * @instance
         */
        TunnelRequest.prototype.method = "";

        /**
         * TunnelRequest payload.
         * @member {Uint8Array} payload
         * @memberof vtr.TunnelRequest
         * @instance
         */
        TunnelRequest.prototype.payload = $util.newBuffer([]);

        /**
         * TunnelRequest stream.
         * @member {boolean} stream
         * @memberof vtr.TunnelRequest
         * @instance
         */
        TunnelRequest.prototype.stream = false;

        /**
         * TunnelRequest trace_parent.
         * @member {string} trace_parent
         * @memberof vtr.TunnelRequest
         * @instance
         */
        TunnelRequest.prototype.trace_parent = "";

        /**
         * TunnelRequest trace_state.
         * @member {string} trace_state
         * @memberof vtr.TunnelRequest
         * @instance
         */
        TunnelRequest.prototype.trace_state = "";

        /**
         * TunnelRequest baggage.
         * @member {string} baggage
         * @memberof vtr.TunnelRequest
         * @instance
         */
        TunnelRequest.prototype.baggage = "";

        /**
         * Creates a new TunnelRequest instance using the specified properties.
         * @function create
         * @memberof vtr.TunnelRequest
         * @static
         * @param {vtr.ITunnelRequest=} [properties] Properties to set
         * @returns {vtr.TunnelRequest} TunnelRequest instance
         */
        TunnelRequest.create = function create(properties) {
            return new TunnelRequest(properties);
        };

        /**
         * Encodes the specified TunnelRequest message. Does not implicitly {@link vtr.TunnelRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.TunnelRequest
         * @static
         * @param {vtr.ITunnelRequest} message TunnelRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.method != null && Object.hasOwnProperty.call(message, "method"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.method);
            if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.payload);
            if (message.stream != null && Object.hasOwnProperty.call(message, "stream"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.stream);
            if (message.trace_parent != null && Object.hasOwnProperty.call(message, "trace_parent"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.trace_parent);
            if (message.trace_state != null && Object.hasOwnProperty.call(message, "trace_state"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.trace_state);
            if (message.baggage != null && Object.hasOwnProperty.call(message, "baggage"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.baggage);
            return writer;
        };

        /**
         * Encodes the specified TunnelRequest message, length delimited. Does not implicitly {@link vtr.TunnelRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.TunnelRequest
         * @static
         * @param {vtr.ITunnelRequest} message TunnelRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TunnelRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.TunnelRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.TunnelRequest} TunnelRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.TunnelRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.method = reader.string();
                        break;
                    }
                case 2: {
                        message.payload = reader.bytes();
                        break;
                    }
                case 3: {
                        message.stream = reader.bool();
                        break;
                    }
                case 4: {
                        message.trace_parent = reader.string();
                        break;
                    }
                case 5: {
                        message.trace_state = reader.string();
                        break;
                    }
                case 6: {
                        message.baggage = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TunnelRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.TunnelRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.TunnelRequest} TunnelRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TunnelRequest message.
         * @function verify
         * @memberof vtr.TunnelRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TunnelRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.method != null && message.hasOwnProperty("method"))
                if (!$util.isString(message.method))
                    return "method: string expected";
            if (message.payload != null && message.hasOwnProperty("payload"))
                if (!(message.payload && typeof message.payload.length === "number" || $util.isString(message.payload)))
                    return "payload: buffer expected";
            if (message.stream != null && message.hasOwnProperty("stream"))
                if (typeof message.stream !== "boolean")
                    return "stream: boolean expected";
            if (message.trace_parent != null && message.hasOwnProperty("trace_parent"))
                if (!$util.isString(message.trace_parent))
                    return "trace_parent: string expected";
            if (message.trace_state != null && message.hasOwnProperty("trace_state"))
                if (!$util.isString(message.trace_state))
                    return "trace_state: string expected";
            if (message.baggage != null && message.hasOwnProperty("baggage"))
                if (!$util.isString(message.baggage))
                    return "baggage: string expected";
            return null;
        };

        /**
         * Creates a TunnelRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.TunnelRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.TunnelRequest} TunnelRequest
         */
        TunnelRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.TunnelRequest)
                return object;
            let message = new $root.vtr.TunnelRequest();
            if (object.method != null)
                message.method = String(object.method);
            if (object.payload != null)
                if (typeof object.payload === "string")
                    $util.base64.decode(object.payload, message.payload = $util.newBuffer($util.base64.length(object.payload)), 0);
                else if (object.payload.length >= 0)
                    message.payload = object.payload;
            if (object.stream != null)
                message.stream = Boolean(object.stream);
            if (object.trace_parent != null)
                message.trace_parent = String(object.trace_parent);
            if (object.trace_state != null)
                message.trace_state = String(object.trace_state);
            if (object.baggage != null)
                message.baggage = String(object.baggage);
            return message;
        };

        /**
         * Creates a plain object from a TunnelRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.TunnelRequest
         * @static
         * @param {vtr.TunnelRequest} message TunnelRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TunnelRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.method = "";
                if (options.bytes === String)
                    object.payload = "";
                else {
                    object.payload = [];
                    if (options.bytes !== Array)
                        object.payload = $util.newBuffer(object.payload);
                }
                object.stream = false;
                object.trace_parent = "";
                object.trace_state = "";
                object.baggage = "";
            }
            if (message.method != null && message.hasOwnProperty("method"))
                object.method = message.method;
            if (message.payload != null && message.hasOwnProperty("payload"))
                object.payload = options.bytes === String ? $util.base64.encode(message.payload, 0, message.payload.length) : options.bytes === Array ? Array.prototype.slice.call(message.payload) : message.payload;
            if (message.stream != null && message.hasOwnProperty("stream"))
                object.stream = message.stream;
            if (message.trace_parent != null && message.hasOwnProperty("trace_parent"))
                object.trace_parent = message.trace_parent;
            if (message.trace_state != null && message.hasOwnProperty("trace_state"))
                object.trace_state = message.trace_state;
            if (message.baggage != null && message.hasOwnProperty("baggage"))
                object.baggage = message.baggage;
            return object;
        };

        /**
         * Converts this TunnelRequest to JSON.
         * @function toJSON
         * @memberof vtr.TunnelRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TunnelRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TunnelRequest
         * @function getTypeUrl
         * @memberof vtr.TunnelRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TunnelRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.TunnelRequest";
        };

        return TunnelRequest;
    })();

    vtr.TunnelResponse = (function() {

        /**
         * Properties of a TunnelResponse.
         * @memberof vtr
         * @interface ITunnelResponse
         * @property {Uint8Array|null} [payload] TunnelResponse payload
         * @property {boolean|null} [done] TunnelResponse done
         */

        /**
         * Constructs a new TunnelResponse.
         * @memberof vtr
         * @classdesc Represents a TunnelResponse.
         * @implements ITunnelResponse
         * @constructor
         * @param {vtr.ITunnelResponse=} [properties] Properties to set
         */
        function TunnelResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TunnelResponse payload.
         * @member {Uint8Array} payload
         * @memberof vtr.TunnelResponse
         * @instance
         */
        TunnelResponse.prototype.payload = $util.newBuffer([]);

        /**
         * TunnelResponse done.
         * @member {boolean} done
         * @memberof vtr.TunnelResponse
         * @instance
         */
        TunnelResponse.prototype.done = false;

        /**
         * Creates a new TunnelResponse instance using the specified properties.
         * @function create
         * @memberof vtr.TunnelResponse
         * @static
         * @param {vtr.ITunnelResponse=} [properties] Properties to set
         * @returns {vtr.TunnelResponse} TunnelResponse instance
         */
        TunnelResponse.create = function create(properties) {
            return new TunnelResponse(properties);
        };

        /**
         * Encodes the specified TunnelResponse message. Does not implicitly {@link vtr.TunnelResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.TunnelResponse
         * @static
         * @param {vtr.ITunnelResponse} message TunnelResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.payload);
            if (message.done != null && Object.hasOwnProperty.call(message, "done"))
                writer.uint32(/* id 2, wireType 0 =*/16).bool(message.done);
            return writer;
        };

        /**
         * Encodes the specified TunnelResponse message, length delimited. Does not implicitly {@link vtr.TunnelResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.TunnelResponse
         * @static
         * @param {vtr.ITunnelResponse} message TunnelResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TunnelResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.TunnelResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.TunnelResponse} TunnelResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.TunnelResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.payload = reader.bytes();
                        break;
                    }
                case 2: {
                        message.done = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TunnelResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.TunnelResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.TunnelResponse} TunnelResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TunnelResponse message.
         * @function verify
         * @memberof vtr.TunnelResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TunnelResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.payload != null && message.hasOwnProperty("payload"))
                if (!(message.payload && typeof message.payload.length === "number" || $util.isString(message.payload)))
                    return "payload: buffer expected";
            if (message.done != null && message.hasOwnProperty("done"))
                if (typeof message.done !== "boolean")
                    return "done: boolean expected";
            return null;
        };

        /**
         * Creates a TunnelResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.TunnelResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.TunnelResponse} TunnelResponse
         */
        TunnelResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.TunnelResponse)
                return object;
            let message = new $root.vtr.TunnelResponse();
            if (object.payload != null)
                if (typeof object.payload === "string")
                    $util.base64.decode(object.payload, message.payload = $util.newBuffer($util.base64.length(object.payload)), 0);
                else if (object.payload.length >= 0)
                    message.payload = object.payload;
            if (object.done != null)
                message.done = Boolean(object.done);
            return message;
        };

        /**
         * Creates a plain object from a TunnelResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.TunnelResponse
         * @static
         * @param {vtr.TunnelResponse} message TunnelResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TunnelResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                if (options.bytes === String)
                    object.payload = "";
                else {
                    object.payload = [];
                    if (options.bytes !== Array)
                        object.payload = $util.newBuffer(object.payload);
                }
                object.done = false;
            }
            if (message.payload != null && message.hasOwnProperty("payload"))
                object.payload = options.bytes === String ? $util.base64.encode(message.payload, 0, message.payload.length) : options.bytes === Array ? Array.prototype.slice.call(message.payload) : message.payload;
            if (message.done != null && message.hasOwnProperty("done"))
                object.done = message.done;
            return object;
        };

        /**
         * Converts this TunnelResponse to JSON.
         * @function toJSON
         * @memberof vtr.TunnelResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TunnelResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TunnelResponse
         * @function getTypeUrl
         * @memberof vtr.TunnelResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TunnelResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.TunnelResponse";
        };

        return TunnelResponse;
    })();

    vtr.TunnelStreamEvent = (function() {

        /**
         * Properties of a TunnelStreamEvent.
         * @memberof vtr
         * @interface ITunnelStreamEvent
         * @property {Uint8Array|null} [payload] TunnelStreamEvent payload
         */

        /**
         * Constructs a new TunnelStreamEvent.
         * @memberof vtr
         * @classdesc Represents a TunnelStreamEvent.
         * @implements ITunnelStreamEvent
         * @constructor
         * @param {vtr.ITunnelStreamEvent=} [properties] Properties to set
         */
        function TunnelStreamEvent(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TunnelStreamEvent payload.
         * @member {Uint8Array} payload
         * @memberof vtr.TunnelStreamEvent
         * @instance
         */
        TunnelStreamEvent.prototype.payload = $util.newBuffer([]);

        /**
         * Creates a new TunnelStreamEvent instance using the specified properties.
         * @function create
         * @memberof vtr.TunnelStreamEvent
         * @static
         * @param {vtr.ITunnelStreamEvent=} [properties] Properties to set
         * @returns {vtr.TunnelStreamEvent} TunnelStreamEvent instance
         */
        TunnelStreamEvent.create = function create(properties) {
            return new TunnelStreamEvent(properties);
        };

        /**
         * Encodes the specified TunnelStreamEvent message. Does not implicitly {@link vtr.TunnelStreamEvent.verify|verify} messages.
         * @function encode
         * @memberof vtr.TunnelStreamEvent
         * @static
         * @param {vtr.ITunnelStreamEvent} message TunnelStreamEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelStreamEvent.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.payload);
            return writer;
        };

        /**
         * Encodes the specified TunnelStreamEvent message, length delimited. Does not implicitly {@link vtr.TunnelStreamEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.TunnelStreamEvent
         * @static
         * @param {vtr.ITunnelStreamEvent} message TunnelStreamEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelStreamEvent.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TunnelStreamEvent message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.TunnelStreamEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.TunnelStreamEvent} TunnelStreamEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelStreamEvent.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.TunnelStreamEvent();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.payload = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TunnelStreamEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.TunnelStreamEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.TunnelStreamEvent} TunnelStreamEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelStreamEvent.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TunnelStreamEvent message.
         * @function verify
         * @memberof vtr.TunnelStreamEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TunnelStreamEvent.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.payload != null && message.hasOwnProperty("payload"))
                if (!(message.payload && typeof message.payload.length === "number" || $util.isString(message.payload)))
                    return "payload: buffer expected";
            return null;
        };

        /**
         * Creates a TunnelStreamEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.TunnelStreamEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.TunnelStreamEvent} TunnelStreamEvent
         */
        TunnelStreamEvent.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.TunnelStreamEvent)
                return object;
            let message = new $root.vtr.TunnelStreamEvent();
            if (object.payload != null)
                if (typeof object.payload === "string")
                    $util.base64.decode(object.payload, message.payload = $util.newBuffer($util.base64.length(object.payload)), 0);
                else if (object.payload.length >= 0)
                    message.payload = object.payload;
            return message;
        };

        /**
         * Creates a plain object from a TunnelStreamEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.TunnelStreamEvent
         * @static
         * @param {vtr.TunnelStreamEvent} message TunnelStreamEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TunnelStreamEvent.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                if (options.bytes === String)
                    object.payload = "";
                else {
                    object.payload = [];
                    if (options.bytes !== Array)
                        object.payload = $util.newBuffer(object.payload);
                }
            if (message.payload != null && message.hasOwnProperty("payload"))
                object.payload = options.bytes === String ? $util.base64.encode(message.payload, 0, message.payload.length) : options.bytes === Array ? Array.prototype.slice.call(message.payload) : message.payload;
            return object;
        };

        /**
         * Converts this TunnelStreamEvent to JSON.
         * @function toJSON
         * @memberof vtr.TunnelStreamEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TunnelStreamEvent.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TunnelStreamEvent
         * @function getTypeUrl
         * @memberof vtr.TunnelStreamEvent
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TunnelStreamEvent.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.TunnelStreamEvent";
        };

        return TunnelStreamEvent;
    })();

    vtr.TunnelCancel = (function() {

        /**
         * Properties of a TunnelCancel.
         * @memberof vtr
         * @interface ITunnelCancel
         * @property {string|null} [reason] TunnelCancel reason
         */

        /**
         * Constructs a new TunnelCancel.
         * @memberof vtr
         * @classdesc Represents a TunnelCancel.
         * @implements ITunnelCancel
         * @constructor
         * @param {vtr.ITunnelCancel=} [properties] Properties to set
         */
        function TunnelCancel(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TunnelCancel reason.
         * @member {string} reason
         * @memberof vtr.TunnelCancel
         * @instance
         */
        TunnelCancel.prototype.reason = "";

        /**
         * Creates a new TunnelCancel instance using the specified properties.
         * @function create
         * @memberof vtr.TunnelCancel
         * @static
         * @param {vtr.ITunnelCancel=} [properties] Properties to set
         * @returns {vtr.TunnelCancel} TunnelCancel instance
         */
        TunnelCancel.create = function create(properties) {
            return new TunnelCancel(properties);
        };

        /**
         * Encodes the specified TunnelCancel message. Does not implicitly {@link vtr.TunnelCancel.verify|verify} messages.
         * @function encode
         * @memberof vtr.TunnelCancel
         * @static
         * @param {vtr.ITunnelCancel} message TunnelCancel message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelCancel.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.reason != null && Object.hasOwnProperty.call(message, "reason"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.reason);
            return writer;
        };

        /**
         * Encodes the specified TunnelCancel message, length delimited. Does not implicitly {@link vtr.TunnelCancel.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.TunnelCancel
         * @static
         * @param {vtr.ITunnelCancel} message TunnelCancel message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelCancel.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TunnelCancel message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.TunnelCancel
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.TunnelCancel} TunnelCancel
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelCancel.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.TunnelCancel();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.reason = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TunnelCancel message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.TunnelCancel
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.TunnelCancel} TunnelCancel
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelCancel.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TunnelCancel message.
         * @function verify
         * @memberof vtr.TunnelCancel
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TunnelCancel.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.reason != null && message.hasOwnProperty("reason"))
                if (!$util.isString(message.reason))
                    return "reason: string expected";
            return null;
        };

        /**
         * Creates a TunnelCancel message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.TunnelCancel
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.TunnelCancel} TunnelCancel
         */
        TunnelCancel.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.TunnelCancel)
                return object;
            let message = new $root.vtr.TunnelCancel();
            if (object.reason != null)
                message.reason = String(object.reason);
            return message;
        };

        /**
         * Creates a plain object from a TunnelCancel message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.TunnelCancel
         * @static
         * @param {vtr.TunnelCancel} message TunnelCancel
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TunnelCancel.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.reason = "";
            if (message.reason != null && message.hasOwnProperty("reason"))
                object.reason = message.reason;
            return object;
        };

        /**
         * Converts this TunnelCancel to JSON.
         * @function toJSON
         * @memberof vtr.TunnelCancel
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TunnelCancel.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TunnelCancel
         * @function getTypeUrl
         * @memberof vtr.TunnelCancel
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TunnelCancel.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.TunnelCancel";
        };

        return TunnelCancel;
    })();

    vtr.TunnelError = (function() {

        /**
         * Properties of a TunnelError.
         * @memberof vtr
         * @interface ITunnelError
         * @property {number|null} [code] TunnelError code
         * @property {string|null} [message] TunnelError message
         */

        /**
         * Constructs a new TunnelError.
         * @memberof vtr
         * @classdesc Represents a TunnelError.
         * @implements ITunnelError
         * @constructor
         * @param {vtr.ITunnelError=} [properties] Properties to set
         */
        function TunnelError(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TunnelError code.
         * @member {number} code
         * @memberof vtr.TunnelError
         * @instance
         */
        TunnelError.prototype.code = 0;

        /**
         * TunnelError message.
         * @member {string} message
         * @memberof vtr.TunnelError
         * @instance
         */
        TunnelError.prototype.message = "";

        /**
         * Creates a new TunnelError instance using the specified properties.
         * @function create
         * @memberof vtr.TunnelError
         * @static
         * @param {vtr.ITunnelError=} [properties] Properties to set
         * @returns {vtr.TunnelError} TunnelError instance
         */
        TunnelError.create = function create(properties) {
            return new TunnelError(properties);
        };

        /**
         * Encodes the specified TunnelError message. Does not implicitly {@link vtr.TunnelError.verify|verify} messages.
         * @function encode
         * @memberof vtr.TunnelError
         * @static
         * @param {vtr.ITunnelError} message TunnelError message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelError.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.message);
            return writer;
        };

        /**
         * Encodes the specified TunnelError message, length delimited. Does not implicitly {@link vtr.TunnelError.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.TunnelError
         * @static
         * @param {vtr.ITunnelError} message TunnelError message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelError.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TunnelError message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.TunnelError
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.TunnelError} TunnelError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelError.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.TunnelError();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.code = reader.int32();
                        break;
                    }
                case 2: {
                        message.message = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TunnelError message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.TunnelError
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.TunnelError} TunnelError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelError.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TunnelError message.
         * @function verify
         * @memberof vtr.TunnelError
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TunnelError.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.code != null && message.hasOwnProperty("code"))
                if (!$util.isInteger(message.code))
                    return "code: integer expected";
            if (message.message != null && message.hasOwnProperty("message"))
                if (!$util.isString(message.message))
                    return "message: string expected";
            return null;
        };

        /**
         * Creates a TunnelError message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.TunnelError
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.TunnelError} TunnelError
         */
        TunnelError.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.TunnelError)
                return object;
            let message = new $root.vtr.TunnelError();
            if (object.code != null)
                message.code = object.code | 0;
            if (object.message != null)
                message.message = String(object.message);
            return message;
        };

        /**
         * Creates a plain object from a TunnelError message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.TunnelError
         * @static
         * @param {vtr.TunnelError} message TunnelError
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TunnelError.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.code = 0;
                object.message = "";
            }
            if (message.code != null && message.hasOwnProperty("code"))
                object.code = message.code;
            if (message.message != null && message.hasOwnProperty("message"))
                object.message = message.message;
            return object;
        };

        /**
         * Converts this TunnelError to JSON.
         * @function toJSON
         * @memberof vtr.TunnelError
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TunnelError.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TunnelError
         * @function getTypeUrl
         * @memberof vtr.TunnelError
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TunnelError.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.TunnelError";
        };

        return TunnelError;
    })();

    vtr.TunnelTraceBatch = (function() {

        /**
         * Properties of a TunnelTraceBatch.
         * @memberof vtr
         * @interface ITunnelTraceBatch
         * @property {Uint8Array|null} [payload] TunnelTraceBatch payload
         */

        /**
         * Constructs a new TunnelTraceBatch.
         * @memberof vtr
         * @classdesc Represents a TunnelTraceBatch.
         * @implements ITunnelTraceBatch
         * @constructor
         * @param {vtr.ITunnelTraceBatch=} [properties] Properties to set
         */
        function TunnelTraceBatch(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TunnelTraceBatch payload.
         * @member {Uint8Array} payload
         * @memberof vtr.TunnelTraceBatch
         * @instance
         */
        TunnelTraceBatch.prototype.payload = $util.newBuffer([]);

        /**
         * Creates a new TunnelTraceBatch instance using the specified properties.
         * @function create
         * @memberof vtr.TunnelTraceBatch
         * @static
         * @param {vtr.ITunnelTraceBatch=} [properties] Properties to set
         * @returns {vtr.TunnelTraceBatch} TunnelTraceBatch instance
         */
        TunnelTraceBatch.create = function create(properties) {
            return new TunnelTraceBatch(properties);
        };

        /**
         * Encodes the specified TunnelTraceBatch message. Does not implicitly {@link vtr.TunnelTraceBatch.verify|verify} messages.
         * @function encode
         * @memberof vtr.TunnelTraceBatch
         * @static
         * @param {vtr.ITunnelTraceBatch} message TunnelTraceBatch message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelTraceBatch.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.payload);
            return writer;
        };

        /**
         * Encodes the specified TunnelTraceBatch message, length delimited. Does not implicitly {@link vtr.TunnelTraceBatch.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.TunnelTraceBatch
         * @static
         * @param {vtr.ITunnelTraceBatch} message TunnelTraceBatch message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TunnelTraceBatch.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TunnelTraceBatch message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.TunnelTraceBatch
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.TunnelTraceBatch} TunnelTraceBatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelTraceBatch.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.TunnelTraceBatch();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.payload = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TunnelTraceBatch message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.TunnelTraceBatch
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.TunnelTraceBatch} TunnelTraceBatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TunnelTraceBatch.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TunnelTraceBatch message.
         * @function verify
         * @memberof vtr.TunnelTraceBatch
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TunnelTraceBatch.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.payload != null && message.hasOwnProperty("payload"))
                if (!(message.payload && typeof message.payload.length === "number" || $util.isString(message.payload)))
                    return "payload: buffer expected";
            return null;
        };

        /**
         * Creates a TunnelTraceBatch message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.TunnelTraceBatch
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.TunnelTraceBatch} TunnelTraceBatch
         */
        TunnelTraceBatch.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.TunnelTraceBatch)
                return object;
            let message = new $root.vtr.TunnelTraceBatch();
            if (object.payload != null)
                if (typeof object.payload === "string")
                    $util.base64.decode(object.payload, message.payload = $util.newBuffer($util.base64.length(object.payload)), 0);
                else if (object.payload.length >= 0)
                    message.payload = object.payload;
            return message;
        };

        /**
         * Creates a plain object from a TunnelTraceBatch message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.TunnelTraceBatch
         * @static
         * @param {vtr.TunnelTraceBatch} message TunnelTraceBatch
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TunnelTraceBatch.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                if (options.bytes === String)
                    object.payload = "";
                else {
                    object.payload = [];
                    if (options.bytes !== Array)
                        object.payload = $util.newBuffer(object.payload);
                }
            if (message.payload != null && message.hasOwnProperty("payload"))
                object.payload = options.bytes === String ? $util.base64.encode(message.payload, 0, message.payload.length) : options.bytes === Array ? Array.prototype.slice.call(message.payload) : message.payload;
            return object;
        };

        /**
         * Converts this TunnelTraceBatch to JSON.
         * @function toJSON
         * @memberof vtr.TunnelTraceBatch
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TunnelTraceBatch.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TunnelTraceBatch
         * @function getTypeUrl
         * @memberof vtr.TunnelTraceBatch
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TunnelTraceBatch.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.TunnelTraceBatch";
        };

        return TunnelTraceBatch;
    })();

    vtr.CoordinatorSessions = (function() {

        /**
         * Properties of a CoordinatorSessions.
         * @memberof vtr
         * @interface ICoordinatorSessions
         * @property {string|null} [name] CoordinatorSessions name
         * @property {string|null} [path] CoordinatorSessions path
         * @property {Array.<vtr.ISession>|null} [sessions] CoordinatorSessions sessions
         * @property {string|null} [error] CoordinatorSessions error
         */

        /**
         * Constructs a new CoordinatorSessions.
         * @memberof vtr
         * @classdesc Represents a CoordinatorSessions.
         * @implements ICoordinatorSessions
         * @constructor
         * @param {vtr.ICoordinatorSessions=} [properties] Properties to set
         */
        function CoordinatorSessions(properties) {
            this.sessions = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * CoordinatorSessions name.
         * @member {string} name
         * @memberof vtr.CoordinatorSessions
         * @instance
         */
        CoordinatorSessions.prototype.name = "";

        /**
         * CoordinatorSessions path.
         * @member {string} path
         * @memberof vtr.CoordinatorSessions
         * @instance
         */
        CoordinatorSessions.prototype.path = "";

        /**
         * CoordinatorSessions sessions.
         * @member {Array.<vtr.ISession>} sessions
         * @memberof vtr.CoordinatorSessions
         * @instance
         */
        CoordinatorSessions.prototype.sessions = $util.emptyArray;

        /**
         * CoordinatorSessions error.
         * @member {string} error
         * @memberof vtr.CoordinatorSessions
         * @instance
         */
        CoordinatorSessions.prototype.error = "";

        /**
         * Creates a new CoordinatorSessions instance using the specified properties.
         * @function create
         * @memberof vtr.CoordinatorSessions
         * @static
         * @param {vtr.ICoordinatorSessions=} [properties] Properties to set
         * @returns {vtr.CoordinatorSessions} CoordinatorSessions instance
         */
        CoordinatorSessions.create = function create(properties) {
            return new CoordinatorSessions(properties);
        };

        /**
         * Encodes the specified CoordinatorSessions message. Does not implicitly {@link vtr.CoordinatorSessions.verify|verify} messages.
         * @function encode
         * @memberof vtr.CoordinatorSessions
         * @static
         * @param {vtr.ICoordinatorSessions} message CoordinatorSessions message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CoordinatorSessions.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
            if (message.path != null && Object.hasOwnProperty.call(message, "path"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.path);
            if (message.sessions != null && message.sessions.length)
                for (let i = 0; i < message.sessions.length; ++i)
                    $root.vtr.Session.encode(message.sessions[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.error != null && Object.hasOwnProperty.call(message, "error"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.error);
            return writer;
        };

        /**
         * Encodes the specified CoordinatorSessions message, length delimited. Does not implicitly {@link vtr.CoordinatorSessions.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.CoordinatorSessions
         * @static
         * @param {vtr.ICoordinatorSessions} message CoordinatorSessions message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CoordinatorSessions.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a CoordinatorSessions message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.CoordinatorSessions
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.CoordinatorSessions} CoordinatorSessions
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CoordinatorSessions.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.CoordinatorSessions();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.name = reader.string();
                        break;
                    }
                case 2: {
                        message.path = reader.string();
                        break;
                    }
                case 3: {
                        if (!(message.sessions && message.sessions.length))
                            message.sessions = [];
                        message.sessions.push($root.vtr.Session.decode(reader, reader.uint32()));
                        break;
                    }
                case 4: {
                        message.error = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a CoordinatorSessions message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.CoordinatorSessions
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.CoordinatorSessions} CoordinatorSessions
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CoordinatorSessions.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CoordinatorSessions message.
         * @function verify
         * @memberof vtr.CoordinatorSessions
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CoordinatorSessions.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            if (message.path != null && message.hasOwnProperty("path"))
                if (!$util.isString(message.path))
                    return "path: string expected";
            if (message.sessions != null && message.hasOwnProperty("sessions")) {
                if (!Array.isArray(message.sessions))
                    return "sessions: array expected";
                for (let i = 0; i < message.sessions.length; ++i) {
                    let error = $root.vtr.Session.verify(message.sessions[i]);
                    if (error)
                        return "sessions." + error;
                }
            }
            if (message.error != null && message.hasOwnProperty("error"))
                if (!$util.isString(message.error))
                    return "error: string expected";
            return null;
        };

        /**
         * Creates a CoordinatorSessions message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.CoordinatorSessions
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.CoordinatorSessions} CoordinatorSessions
         */
        CoordinatorSessions.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.CoordinatorSessions)
                return object;
            let message = new $root.vtr.CoordinatorSessions();
            if (object.name != null)
                message.name = String(object.name);
            if (object.path != null)
                message.path = String(object.path);
            if (object.sessions) {
                if (!Array.isArray(object.sessions))
                    throw TypeError(".vtr.CoordinatorSessions.sessions: array expected");
                message.sessions = [];
                for (let i = 0; i < object.sessions.length; ++i) {
                    if (typeof object.sessions[i] !== "object")
                        throw TypeError(".vtr.CoordinatorSessions.sessions: object expected");
                    message.sessions[i] = $root.vtr.Session.fromObject(object.sessions[i]);
                }
            }
            if (object.error != null)
                message.error = String(object.error);
            return message;
        };

        /**
         * Creates a plain object from a CoordinatorSessions message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.CoordinatorSessions
         * @static
         * @param {vtr.CoordinatorSessions} message CoordinatorSessions
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CoordinatorSessions.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.sessions = [];
            if (options.defaults) {
                object.name = "";
                object.path = "";
                object.error = "";
            }
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            if (message.path != null && message.hasOwnProperty("path"))
                object.path = message.path;
            if (message.sessions && message.sessions.length) {
                object.sessions = [];
                for (let j = 0; j < message.sessions.length; ++j)
                    object.sessions[j] = $root.vtr.Session.toObject(message.sessions[j], options);
            }
            if (message.error != null && message.hasOwnProperty("error"))
                object.error = message.error;
            return object;
        };

        /**
         * Converts this CoordinatorSessions to JSON.
         * @function toJSON
         * @memberof vtr.CoordinatorSessions
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CoordinatorSessions.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for CoordinatorSessions
         * @function getTypeUrl
         * @memberof vtr.CoordinatorSessions
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        CoordinatorSessions.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.CoordinatorSessions";
        };

        return CoordinatorSessions;
    })();

    vtr.SessionsSnapshot = (function() {

        /**
         * Properties of a SessionsSnapshot.
         * @memberof vtr
         * @interface ISessionsSnapshot
         * @property {Array.<vtr.ICoordinatorSessions>|null} [coordinators] SessionsSnapshot coordinators
         */

        /**
         * Constructs a new SessionsSnapshot.
         * @memberof vtr
         * @classdesc Represents a SessionsSnapshot.
         * @implements ISessionsSnapshot
         * @constructor
         * @param {vtr.ISessionsSnapshot=} [properties] Properties to set
         */
        function SessionsSnapshot(properties) {
            this.coordinators = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SessionsSnapshot coordinators.
         * @member {Array.<vtr.ICoordinatorSessions>} coordinators
         * @memberof vtr.SessionsSnapshot
         * @instance
         */
        SessionsSnapshot.prototype.coordinators = $util.emptyArray;

        /**
         * Creates a new SessionsSnapshot instance using the specified properties.
         * @function create
         * @memberof vtr.SessionsSnapshot
         * @static
         * @param {vtr.ISessionsSnapshot=} [properties] Properties to set
         * @returns {vtr.SessionsSnapshot} SessionsSnapshot instance
         */
        SessionsSnapshot.create = function create(properties) {
            return new SessionsSnapshot(properties);
        };

        /**
         * Encodes the specified SessionsSnapshot message. Does not implicitly {@link vtr.SessionsSnapshot.verify|verify} messages.
         * @function encode
         * @memberof vtr.SessionsSnapshot
         * @static
         * @param {vtr.ISessionsSnapshot} message SessionsSnapshot message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionsSnapshot.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.coordinators != null && message.coordinators.length)
                for (let i = 0; i < message.coordinators.length; ++i)
                    $root.vtr.CoordinatorSessions.encode(message.coordinators[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified SessionsSnapshot message, length delimited. Does not implicitly {@link vtr.SessionsSnapshot.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SessionsSnapshot
         * @static
         * @param {vtr.ISessionsSnapshot} message SessionsSnapshot message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionsSnapshot.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SessionsSnapshot message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SessionsSnapshot
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SessionsSnapshot} SessionsSnapshot
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionsSnapshot.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SessionsSnapshot();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.coordinators && message.coordinators.length))
                            message.coordinators = [];
                        message.coordinators.push($root.vtr.CoordinatorSessions.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SessionsSnapshot message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SessionsSnapshot
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SessionsSnapshot} SessionsSnapshot
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionsSnapshot.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SessionsSnapshot message.
         * @function verify
         * @memberof vtr.SessionsSnapshot
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SessionsSnapshot.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.coordinators != null && message.hasOwnProperty("coordinators")) {
                if (!Array.isArray(message.coordinators))
                    return "coordinators: array expected";
                for (let i = 0; i < message.coordinators.length; ++i) {
                    let error = $root.vtr.CoordinatorSessions.verify(message.coordinators[i]);
                    if (error)
                        return "coordinators." + error;
                }
            }
            return null;
        };

        /**
         * Creates a SessionsSnapshot message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SessionsSnapshot
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SessionsSnapshot} SessionsSnapshot
         */
        SessionsSnapshot.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SessionsSnapshot)
                return object;
            let message = new $root.vtr.SessionsSnapshot();
            if (object.coordinators) {
                if (!Array.isArray(object.coordinators))
                    throw TypeError(".vtr.SessionsSnapshot.coordinators: array expected");
                message.coordinators = [];
                for (let i = 0; i < object.coordinators.length; ++i) {
                    if (typeof object.coordinators[i] !== "object")
                        throw TypeError(".vtr.SessionsSnapshot.coordinators: object expected");
                    message.coordinators[i] = $root.vtr.CoordinatorSessions.fromObject(object.coordinators[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a SessionsSnapshot message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SessionsSnapshot
         * @static
         * @param {vtr.SessionsSnapshot} message SessionsSnapshot
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SessionsSnapshot.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.coordinators = [];
            if (message.coordinators && message.coordinators.length) {
                object.coordinators = [];
                for (let j = 0; j < message.coordinators.length; ++j)
                    object.coordinators[j] = $root.vtr.CoordinatorSessions.toObject(message.coordinators[j], options);
            }
            return object;
        };

        /**
         * Converts this SessionsSnapshot to JSON.
         * @function toJSON
         * @memberof vtr.SessionsSnapshot
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SessionsSnapshot.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SessionsSnapshot
         * @function getTypeUrl
         * @memberof vtr.SessionsSnapshot
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SessionsSnapshot.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SessionsSnapshot";
        };

        return SessionsSnapshot;
    })();

    vtr.InfoRequest = (function() {

        /**
         * Properties of an InfoRequest.
         * @memberof vtr
         * @interface IInfoRequest
         * @property {vtr.ISessionRef|null} [session] InfoRequest session
         */

        /**
         * Constructs a new InfoRequest.
         * @memberof vtr
         * @classdesc Represents an InfoRequest.
         * @implements IInfoRequest
         * @constructor
         * @param {vtr.IInfoRequest=} [properties] Properties to set
         */
        function InfoRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * InfoRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.InfoRequest
         * @instance
         */
        InfoRequest.prototype.session = null;

        /**
         * Creates a new InfoRequest instance using the specified properties.
         * @function create
         * @memberof vtr.InfoRequest
         * @static
         * @param {vtr.IInfoRequest=} [properties] Properties to set
         * @returns {vtr.InfoRequest} InfoRequest instance
         */
        InfoRequest.create = function create(properties) {
            return new InfoRequest(properties);
        };

        /**
         * Encodes the specified InfoRequest message. Does not implicitly {@link vtr.InfoRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.InfoRequest
         * @static
         * @param {vtr.IInfoRequest} message InfoRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        InfoRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified InfoRequest message, length delimited. Does not implicitly {@link vtr.InfoRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.InfoRequest
         * @static
         * @param {vtr.IInfoRequest} message InfoRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        InfoRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an InfoRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.InfoRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.InfoRequest} InfoRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        InfoRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.InfoRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an InfoRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.InfoRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.InfoRequest} InfoRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        InfoRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an InfoRequest message.
         * @function verify
         * @memberof vtr.InfoRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        InfoRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            return null;
        };

        /**
         * Creates an InfoRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.InfoRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.InfoRequest} InfoRequest
         */
        InfoRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.InfoRequest)
                return object;
            let message = new $root.vtr.InfoRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.InfoRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            return message;
        };

        /**
         * Creates a plain object from an InfoRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.InfoRequest
         * @static
         * @param {vtr.InfoRequest} message InfoRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        InfoRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.session = null;
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            return object;
        };

        /**
         * Converts this InfoRequest to JSON.
         * @function toJSON
         * @memberof vtr.InfoRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        InfoRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for InfoRequest
         * @function getTypeUrl
         * @memberof vtr.InfoRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        InfoRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.InfoRequest";
        };

        return InfoRequest;
    })();

    vtr.InfoResponse = (function() {

        /**
         * Properties of an InfoResponse.
         * @memberof vtr
         * @interface IInfoResponse
         * @property {vtr.ISession|null} [session] InfoResponse session
         */

        /**
         * Constructs a new InfoResponse.
         * @memberof vtr
         * @classdesc Represents an InfoResponse.
         * @implements IInfoResponse
         * @constructor
         * @param {vtr.IInfoResponse=} [properties] Properties to set
         */
        function InfoResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * InfoResponse session.
         * @member {vtr.ISession|null|undefined} session
         * @memberof vtr.InfoResponse
         * @instance
         */
        InfoResponse.prototype.session = null;

        /**
         * Creates a new InfoResponse instance using the specified properties.
         * @function create
         * @memberof vtr.InfoResponse
         * @static
         * @param {vtr.IInfoResponse=} [properties] Properties to set
         * @returns {vtr.InfoResponse} InfoResponse instance
         */
        InfoResponse.create = function create(properties) {
            return new InfoResponse(properties);
        };

        /**
         * Encodes the specified InfoResponse message. Does not implicitly {@link vtr.InfoResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.InfoResponse
         * @static
         * @param {vtr.IInfoResponse} message InfoResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        InfoResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.Session.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified InfoResponse message, length delimited. Does not implicitly {@link vtr.InfoResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.InfoResponse
         * @static
         * @param {vtr.IInfoResponse} message InfoResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        InfoResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an InfoResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.InfoResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.InfoResponse} InfoResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        InfoResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.InfoResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.Session.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an InfoResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.InfoResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.InfoResponse} InfoResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        InfoResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an InfoResponse message.
         * @function verify
         * @memberof vtr.InfoResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        InfoResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.Session.verify(message.session);
                if (error)
                    return "session." + error;
            }
            return null;
        };

        /**
         * Creates an InfoResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.InfoResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.InfoResponse} InfoResponse
         */
        InfoResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.InfoResponse)
                return object;
            let message = new $root.vtr.InfoResponse();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.InfoResponse.session: object expected");
                message.session = $root.vtr.Session.fromObject(object.session);
            }
            return message;
        };

        /**
         * Creates a plain object from an InfoResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.InfoResponse
         * @static
         * @param {vtr.InfoResponse} message InfoResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        InfoResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.session = null;
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.Session.toObject(message.session, options);
            return object;
        };

        /**
         * Converts this InfoResponse to JSON.
         * @function toJSON
         * @memberof vtr.InfoResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        InfoResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for InfoResponse
         * @function getTypeUrl
         * @memberof vtr.InfoResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        InfoResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.InfoResponse";
        };

        return InfoResponse;
    })();

    vtr.KillRequest = (function() {

        /**
         * Properties of a KillRequest.
         * @memberof vtr
         * @interface IKillRequest
         * @property {vtr.ISessionRef|null} [session] KillRequest session
         * @property {string|null} [signal] KillRequest signal
         */

        /**
         * Constructs a new KillRequest.
         * @memberof vtr
         * @classdesc Represents a KillRequest.
         * @implements IKillRequest
         * @constructor
         * @param {vtr.IKillRequest=} [properties] Properties to set
         */
        function KillRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * KillRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.KillRequest
         * @instance
         */
        KillRequest.prototype.session = null;

        /**
         * KillRequest signal.
         * @member {string} signal
         * @memberof vtr.KillRequest
         * @instance
         */
        KillRequest.prototype.signal = "";

        /**
         * Creates a new KillRequest instance using the specified properties.
         * @function create
         * @memberof vtr.KillRequest
         * @static
         * @param {vtr.IKillRequest=} [properties] Properties to set
         * @returns {vtr.KillRequest} KillRequest instance
         */
        KillRequest.create = function create(properties) {
            return new KillRequest(properties);
        };

        /**
         * Encodes the specified KillRequest message. Does not implicitly {@link vtr.KillRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.KillRequest
         * @static
         * @param {vtr.IKillRequest} message KillRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        KillRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.signal != null && Object.hasOwnProperty.call(message, "signal"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.signal);
            return writer;
        };

        /**
         * Encodes the specified KillRequest message, length delimited. Does not implicitly {@link vtr.KillRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.KillRequest
         * @static
         * @param {vtr.IKillRequest} message KillRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        KillRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a KillRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.KillRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.KillRequest} KillRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        KillRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.KillRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.signal = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a KillRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.KillRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.KillRequest} KillRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        KillRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a KillRequest message.
         * @function verify
         * @memberof vtr.KillRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        KillRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            if (message.signal != null && message.hasOwnProperty("signal"))
                if (!$util.isString(message.signal))
                    return "signal: string expected";
            return null;
        };

        /**
         * Creates a KillRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.KillRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.KillRequest} KillRequest
         */
        KillRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.KillRequest)
                return object;
            let message = new $root.vtr.KillRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.KillRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            if (object.signal != null)
                message.signal = String(object.signal);
            return message;
        };

        /**
         * Creates a plain object from a KillRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.KillRequest
         * @static
         * @param {vtr.KillRequest} message KillRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        KillRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.session = null;
                object.signal = "";
            }
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            if (message.signal != null && message.hasOwnProperty("signal"))
                object.signal = message.signal;
            return object;
        };

        /**
         * Converts this KillRequest to JSON.
         * @function toJSON
         * @memberof vtr.KillRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        KillRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for KillRequest
         * @function getTypeUrl
         * @memberof vtr.KillRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        KillRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.KillRequest";
        };

        return KillRequest;
    })();

    vtr.KillResponse = (function() {

        /**
         * Properties of a KillResponse.
         * @memberof vtr
         * @interface IKillResponse
         */

        /**
         * Constructs a new KillResponse.
         * @memberof vtr
         * @classdesc Represents a KillResponse.
         * @implements IKillResponse
         * @constructor
         * @param {vtr.IKillResponse=} [properties] Properties to set
         */
        function KillResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new KillResponse instance using the specified properties.
         * @function create
         * @memberof vtr.KillResponse
         * @static
         * @param {vtr.IKillResponse=} [properties] Properties to set
         * @returns {vtr.KillResponse} KillResponse instance
         */
        KillResponse.create = function create(properties) {
            return new KillResponse(properties);
        };

        /**
         * Encodes the specified KillResponse message. Does not implicitly {@link vtr.KillResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.KillResponse
         * @static
         * @param {vtr.IKillResponse} message KillResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        KillResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified KillResponse message, length delimited. Does not implicitly {@link vtr.KillResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.KillResponse
         * @static
         * @param {vtr.IKillResponse} message KillResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        KillResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a KillResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.KillResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.KillResponse} KillResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        KillResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.KillResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a KillResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.KillResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.KillResponse} KillResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        KillResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a KillResponse message.
         * @function verify
         * @memberof vtr.KillResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        KillResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates a KillResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.KillResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.KillResponse} KillResponse
         */
        KillResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.KillResponse)
                return object;
            return new $root.vtr.KillResponse();
        };

        /**
         * Creates a plain object from a KillResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.KillResponse
         * @static
         * @param {vtr.KillResponse} message KillResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        KillResponse.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this KillResponse to JSON.
         * @function toJSON
         * @memberof vtr.KillResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        KillResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for KillResponse
         * @function getTypeUrl
         * @memberof vtr.KillResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        KillResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.KillResponse";
        };

        return KillResponse;
    })();

    vtr.CloseRequest = (function() {

        /**
         * Properties of a CloseRequest.
         * @memberof vtr
         * @interface ICloseRequest
         * @property {vtr.ISessionRef|null} [session] CloseRequest session
         */

        /**
         * Constructs a new CloseRequest.
         * @memberof vtr
         * @classdesc Represents a CloseRequest.
         * @implements ICloseRequest
         * @constructor
         * @param {vtr.ICloseRequest=} [properties] Properties to set
         */
        function CloseRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * CloseRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.CloseRequest
         * @instance
         */
        CloseRequest.prototype.session = null;

        /**
         * Creates a new CloseRequest instance using the specified properties.
         * @function create
         * @memberof vtr.CloseRequest
         * @static
         * @param {vtr.ICloseRequest=} [properties] Properties to set
         * @returns {vtr.CloseRequest} CloseRequest instance
         */
        CloseRequest.create = function create(properties) {
            return new CloseRequest(properties);
        };

        /**
         * Encodes the specified CloseRequest message. Does not implicitly {@link vtr.CloseRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.CloseRequest
         * @static
         * @param {vtr.ICloseRequest} message CloseRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CloseRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified CloseRequest message, length delimited. Does not implicitly {@link vtr.CloseRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.CloseRequest
         * @static
         * @param {vtr.ICloseRequest} message CloseRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CloseRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a CloseRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.CloseRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.CloseRequest} CloseRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CloseRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.CloseRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a CloseRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.CloseRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.CloseRequest} CloseRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CloseRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CloseRequest message.
         * @function verify
         * @memberof vtr.CloseRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CloseRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            return null;
        };

        /**
         * Creates a CloseRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.CloseRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.CloseRequest} CloseRequest
         */
        CloseRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.CloseRequest)
                return object;
            let message = new $root.vtr.CloseRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.CloseRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            return message;
        };

        /**
         * Creates a plain object from a CloseRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.CloseRequest
         * @static
         * @param {vtr.CloseRequest} message CloseRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CloseRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.session = null;
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            return object;
        };

        /**
         * Converts this CloseRequest to JSON.
         * @function toJSON
         * @memberof vtr.CloseRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CloseRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for CloseRequest
         * @function getTypeUrl
         * @memberof vtr.CloseRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        CloseRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.CloseRequest";
        };

        return CloseRequest;
    })();

    vtr.CloseResponse = (function() {

        /**
         * Properties of a CloseResponse.
         * @memberof vtr
         * @interface ICloseResponse
         */

        /**
         * Constructs a new CloseResponse.
         * @memberof vtr
         * @classdesc Represents a CloseResponse.
         * @implements ICloseResponse
         * @constructor
         * @param {vtr.ICloseResponse=} [properties] Properties to set
         */
        function CloseResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new CloseResponse instance using the specified properties.
         * @function create
         * @memberof vtr.CloseResponse
         * @static
         * @param {vtr.ICloseResponse=} [properties] Properties to set
         * @returns {vtr.CloseResponse} CloseResponse instance
         */
        CloseResponse.create = function create(properties) {
            return new CloseResponse(properties);
        };

        /**
         * Encodes the specified CloseResponse message. Does not implicitly {@link vtr.CloseResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.CloseResponse
         * @static
         * @param {vtr.ICloseResponse} message CloseResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CloseResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified CloseResponse message, length delimited. Does not implicitly {@link vtr.CloseResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.CloseResponse
         * @static
         * @param {vtr.ICloseResponse} message CloseResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CloseResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a CloseResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.CloseResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.CloseResponse} CloseResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CloseResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.CloseResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a CloseResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.CloseResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.CloseResponse} CloseResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CloseResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CloseResponse message.
         * @function verify
         * @memberof vtr.CloseResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CloseResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates a CloseResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.CloseResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.CloseResponse} CloseResponse
         */
        CloseResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.CloseResponse)
                return object;
            return new $root.vtr.CloseResponse();
        };

        /**
         * Creates a plain object from a CloseResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.CloseResponse
         * @static
         * @param {vtr.CloseResponse} message CloseResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CloseResponse.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this CloseResponse to JSON.
         * @function toJSON
         * @memberof vtr.CloseResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CloseResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for CloseResponse
         * @function getTypeUrl
         * @memberof vtr.CloseResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        CloseResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.CloseResponse";
        };

        return CloseResponse;
    })();

    vtr.RemoveRequest = (function() {

        /**
         * Properties of a RemoveRequest.
         * @memberof vtr
         * @interface IRemoveRequest
         * @property {vtr.ISessionRef|null} [session] RemoveRequest session
         */

        /**
         * Constructs a new RemoveRequest.
         * @memberof vtr
         * @classdesc Represents a RemoveRequest.
         * @implements IRemoveRequest
         * @constructor
         * @param {vtr.IRemoveRequest=} [properties] Properties to set
         */
        function RemoveRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * RemoveRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.RemoveRequest
         * @instance
         */
        RemoveRequest.prototype.session = null;

        /**
         * Creates a new RemoveRequest instance using the specified properties.
         * @function create
         * @memberof vtr.RemoveRequest
         * @static
         * @param {vtr.IRemoveRequest=} [properties] Properties to set
         * @returns {vtr.RemoveRequest} RemoveRequest instance
         */
        RemoveRequest.create = function create(properties) {
            return new RemoveRequest(properties);
        };

        /**
         * Encodes the specified RemoveRequest message. Does not implicitly {@link vtr.RemoveRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.RemoveRequest
         * @static
         * @param {vtr.IRemoveRequest} message RemoveRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RemoveRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified RemoveRequest message, length delimited. Does not implicitly {@link vtr.RemoveRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.RemoveRequest
         * @static
         * @param {vtr.IRemoveRequest} message RemoveRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RemoveRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RemoveRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.RemoveRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.RemoveRequest} RemoveRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RemoveRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.RemoveRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a RemoveRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.RemoveRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.RemoveRequest} RemoveRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RemoveRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a RemoveRequest message.
         * @function verify
         * @memberof vtr.RemoveRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        RemoveRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            return null;
        };

        /**
         * Creates a RemoveRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.RemoveRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.RemoveRequest} RemoveRequest
         */
        RemoveRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.RemoveRequest)
                return object;
            let message = new $root.vtr.RemoveRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.RemoveRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            return message;
        };

        /**
         * Creates a plain object from a RemoveRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.RemoveRequest
         * @static
         * @param {vtr.RemoveRequest} message RemoveRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        RemoveRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.session = null;
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            return object;
        };

        /**
         * Converts this RemoveRequest to JSON.
         * @function toJSON
         * @memberof vtr.RemoveRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        RemoveRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for RemoveRequest
         * @function getTypeUrl
         * @memberof vtr.RemoveRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        RemoveRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.RemoveRequest";
        };

        return RemoveRequest;
    })();

    vtr.RemoveResponse = (function() {

        /**
         * Properties of a RemoveResponse.
         * @memberof vtr
         * @interface IRemoveResponse
         */

        /**
         * Constructs a new RemoveResponse.
         * @memberof vtr
         * @classdesc Represents a RemoveResponse.
         * @implements IRemoveResponse
         * @constructor
         * @param {vtr.IRemoveResponse=} [properties] Properties to set
         */
        function RemoveResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new RemoveResponse instance using the specified properties.
         * @function create
         * @memberof vtr.RemoveResponse
         * @static
         * @param {vtr.IRemoveResponse=} [properties] Properties to set
         * @returns {vtr.RemoveResponse} RemoveResponse instance
         */
        RemoveResponse.create = function create(properties) {
            return new RemoveResponse(properties);
        };

        /**
         * Encodes the specified RemoveResponse message. Does not implicitly {@link vtr.RemoveResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.RemoveResponse
         * @static
         * @param {vtr.IRemoveResponse} message RemoveResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RemoveResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified RemoveResponse message, length delimited. Does not implicitly {@link vtr.RemoveResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.RemoveResponse
         * @static
         * @param {vtr.IRemoveResponse} message RemoveResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RemoveResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RemoveResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.RemoveResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.RemoveResponse} RemoveResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RemoveResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.RemoveResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a RemoveResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.RemoveResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.RemoveResponse} RemoveResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RemoveResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a RemoveResponse message.
         * @function verify
         * @memberof vtr.RemoveResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        RemoveResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates a RemoveResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.RemoveResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.RemoveResponse} RemoveResponse
         */
        RemoveResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.RemoveResponse)
                return object;
            return new $root.vtr.RemoveResponse();
        };

        /**
         * Creates a plain object from a RemoveResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.RemoveResponse
         * @static
         * @param {vtr.RemoveResponse} message RemoveResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        RemoveResponse.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this RemoveResponse to JSON.
         * @function toJSON
         * @memberof vtr.RemoveResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        RemoveResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for RemoveResponse
         * @function getTypeUrl
         * @memberof vtr.RemoveResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        RemoveResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.RemoveResponse";
        };

        return RemoveResponse;
    })();

    vtr.RenameRequest = (function() {

        /**
         * Properties of a RenameRequest.
         * @memberof vtr
         * @interface IRenameRequest
         * @property {vtr.ISessionRef|null} [session] RenameRequest session
         * @property {string|null} [new_name] RenameRequest new_name
         */

        /**
         * Constructs a new RenameRequest.
         * @memberof vtr
         * @classdesc Represents a RenameRequest.
         * @implements IRenameRequest
         * @constructor
         * @param {vtr.IRenameRequest=} [properties] Properties to set
         */
        function RenameRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * RenameRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.RenameRequest
         * @instance
         */
        RenameRequest.prototype.session = null;

        /**
         * RenameRequest new_name.
         * @member {string} new_name
         * @memberof vtr.RenameRequest
         * @instance
         */
        RenameRequest.prototype.new_name = "";

        /**
         * Creates a new RenameRequest instance using the specified properties.
         * @function create
         * @memberof vtr.RenameRequest
         * @static
         * @param {vtr.IRenameRequest=} [properties] Properties to set
         * @returns {vtr.RenameRequest} RenameRequest instance
         */
        RenameRequest.create = function create(properties) {
            return new RenameRequest(properties);
        };

        /**
         * Encodes the specified RenameRequest message. Does not implicitly {@link vtr.RenameRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.RenameRequest
         * @static
         * @param {vtr.IRenameRequest} message RenameRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RenameRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.new_name != null && Object.hasOwnProperty.call(message, "new_name"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.new_name);
            return writer;
        };

        /**
         * Encodes the specified RenameRequest message, length delimited. Does not implicitly {@link vtr.RenameRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.RenameRequest
         * @static
         * @param {vtr.IRenameRequest} message RenameRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RenameRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RenameRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.RenameRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.RenameRequest} RenameRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RenameRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.RenameRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.new_name = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a RenameRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.RenameRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.RenameRequest} RenameRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RenameRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a RenameRequest message.
         * @function verify
         * @memberof vtr.RenameRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        RenameRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            if (message.new_name != null && message.hasOwnProperty("new_name"))
                if (!$util.isString(message.new_name))
                    return "new_name: string expected";
            return null;
        };

        /**
         * Creates a RenameRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.RenameRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.RenameRequest} RenameRequest
         */
        RenameRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.RenameRequest)
                return object;
            let message = new $root.vtr.RenameRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.RenameRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            if (object.new_name != null)
                message.new_name = String(object.new_name);
            return message;
        };

        /**
         * Creates a plain object from a RenameRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.RenameRequest
         * @static
         * @param {vtr.RenameRequest} message RenameRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        RenameRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.session = null;
                object.new_name = "";
            }
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            if (message.new_name != null && message.hasOwnProperty("new_name"))
                object.new_name = message.new_name;
            return object;
        };

        /**
         * Converts this RenameRequest to JSON.
         * @function toJSON
         * @memberof vtr.RenameRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        RenameRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for RenameRequest
         * @function getTypeUrl
         * @memberof vtr.RenameRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        RenameRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.RenameRequest";
        };

        return RenameRequest;
    })();

    vtr.RenameResponse = (function() {

        /**
         * Properties of a RenameResponse.
         * @memberof vtr
         * @interface IRenameResponse
         */

        /**
         * Constructs a new RenameResponse.
         * @memberof vtr
         * @classdesc Represents a RenameResponse.
         * @implements IRenameResponse
         * @constructor
         * @param {vtr.IRenameResponse=} [properties] Properties to set
         */
        function RenameResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new RenameResponse instance using the specified properties.
         * @function create
         * @memberof vtr.RenameResponse
         * @static
         * @param {vtr.IRenameResponse=} [properties] Properties to set
         * @returns {vtr.RenameResponse} RenameResponse instance
         */
        RenameResponse.create = function create(properties) {
            return new RenameResponse(properties);
        };

        /**
         * Encodes the specified RenameResponse message. Does not implicitly {@link vtr.RenameResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.RenameResponse
         * @static
         * @param {vtr.IRenameResponse} message RenameResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RenameResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified RenameResponse message, length delimited. Does not implicitly {@link vtr.RenameResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.RenameResponse
         * @static
         * @param {vtr.IRenameResponse} message RenameResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RenameResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RenameResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.RenameResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.RenameResponse} RenameResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RenameResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.RenameResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a RenameResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.RenameResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.RenameResponse} RenameResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RenameResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a RenameResponse message.
         * @function verify
         * @memberof vtr.RenameResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        RenameResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates a RenameResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.RenameResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.RenameResponse} RenameResponse
         */
        RenameResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.RenameResponse)
                return object;
            return new $root.vtr.RenameResponse();
        };

        /**
         * Creates a plain object from a RenameResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.RenameResponse
         * @static
         * @param {vtr.RenameResponse} message RenameResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        RenameResponse.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this RenameResponse to JSON.
         * @function toJSON
         * @memberof vtr.RenameResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        RenameResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for RenameResponse
         * @function getTypeUrl
         * @memberof vtr.RenameResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        RenameResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.RenameResponse";
        };

        return RenameResponse;
    })();

    vtr.GetScreenRequest = (function() {

        /**
         * Properties of a GetScreenRequest.
         * @memberof vtr
         * @interface IGetScreenRequest
         * @property {vtr.ISessionRef|null} [session] GetScreenRequest session
         */

        /**
         * Constructs a new GetScreenRequest.
         * @memberof vtr
         * @classdesc Represents a GetScreenRequest.
         * @implements IGetScreenRequest
         * @constructor
         * @param {vtr.IGetScreenRequest=} [properties] Properties to set
         */
        function GetScreenRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetScreenRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.GetScreenRequest
         * @instance
         */
        GetScreenRequest.prototype.session = null;

        /**
         * Creates a new GetScreenRequest instance using the specified properties.
         * @function create
         * @memberof vtr.GetScreenRequest
         * @static
         * @param {vtr.IGetScreenRequest=} [properties] Properties to set
         * @returns {vtr.GetScreenRequest} GetScreenRequest instance
         */
        GetScreenRequest.create = function create(properties) {
            return new GetScreenRequest(properties);
        };

        /**
         * Encodes the specified GetScreenRequest message. Does not implicitly {@link vtr.GetScreenRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.GetScreenRequest
         * @static
         * @param {vtr.IGetScreenRequest} message GetScreenRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetScreenRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetScreenRequest message, length delimited. Does not implicitly {@link vtr.GetScreenRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.GetScreenRequest
         * @static
         * @param {vtr.IGetScreenRequest} message GetScreenRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetScreenRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetScreenRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.GetScreenRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.GetScreenRequest} GetScreenRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetScreenRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.GetScreenRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetScreenRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.GetScreenRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.GetScreenRequest} GetScreenRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetScreenRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetScreenRequest message.
         * @function verify
         * @memberof vtr.GetScreenRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetScreenRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            return null;
        };

        /**
         * Creates a GetScreenRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.GetScreenRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.GetScreenRequest} GetScreenRequest
         */
        GetScreenRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.GetScreenRequest)
                return object;
            let message = new $root.vtr.GetScreenRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.GetScreenRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetScreenRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.GetScreenRequest
         * @static
         * @param {vtr.GetScreenRequest} message GetScreenRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetScreenRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.session = null;
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            return object;
        };

        /**
         * Converts this GetScreenRequest to JSON.
         * @function toJSON
         * @memberof vtr.GetScreenRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetScreenRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetScreenRequest
         * @function getTypeUrl
         * @memberof vtr.GetScreenRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetScreenRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.GetScreenRequest";
        };

        return GetScreenRequest;
    })();

    vtr.ScreenCell = (function() {

        /**
         * Properties of a ScreenCell.
         * @memberof vtr
         * @interface IScreenCell
         * @property {string|null} [char] ScreenCell char
         * @property {number|null} [fg_color] ScreenCell fg_color
         * @property {number|null} [bg_color] ScreenCell bg_color
         * @property {number|null} [attributes] ScreenCell attributes
         */

        /**
         * Constructs a new ScreenCell.
         * @memberof vtr
         * @classdesc Represents a ScreenCell.
         * @implements IScreenCell
         * @constructor
         * @param {vtr.IScreenCell=} [properties] Properties to set
         */
        function ScreenCell(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ScreenCell char.
         * @member {string} char
         * @memberof vtr.ScreenCell
         * @instance
         */
        ScreenCell.prototype.char = "";

        /**
         * ScreenCell fg_color.
         * @member {number} fg_color
         * @memberof vtr.ScreenCell
         * @instance
         */
        ScreenCell.prototype.fg_color = 0;

        /**
         * ScreenCell bg_color.
         * @member {number} bg_color
         * @memberof vtr.ScreenCell
         * @instance
         */
        ScreenCell.prototype.bg_color = 0;

        /**
         * ScreenCell attributes.
         * @member {number} attributes
         * @memberof vtr.ScreenCell
         * @instance
         */
        ScreenCell.prototype.attributes = 0;

        /**
         * Creates a new ScreenCell instance using the specified properties.
         * @function create
         * @memberof vtr.ScreenCell
         * @static
         * @param {vtr.IScreenCell=} [properties] Properties to set
         * @returns {vtr.ScreenCell} ScreenCell instance
         */
        ScreenCell.create = function create(properties) {
            return new ScreenCell(properties);
        };

        /**
         * Encodes the specified ScreenCell message. Does not implicitly {@link vtr.ScreenCell.verify|verify} messages.
         * @function encode
         * @memberof vtr.ScreenCell
         * @static
         * @param {vtr.IScreenCell} message ScreenCell message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ScreenCell.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.char != null && Object.hasOwnProperty.call(message, "char"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.char);
            if (message.fg_color != null && Object.hasOwnProperty.call(message, "fg_color"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.fg_color);
            if (message.bg_color != null && Object.hasOwnProperty.call(message, "bg_color"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.bg_color);
            if (message.attributes != null && Object.hasOwnProperty.call(message, "attributes"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.attributes);
            return writer;
        };

        /**
         * Encodes the specified ScreenCell message, length delimited. Does not implicitly {@link vtr.ScreenCell.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.ScreenCell
         * @static
         * @param {vtr.IScreenCell} message ScreenCell message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ScreenCell.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ScreenCell message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.ScreenCell
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.ScreenCell} ScreenCell
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ScreenCell.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.ScreenCell();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.char = reader.string();
                        break;
                    }
                case 2: {
                        message.fg_color = reader.int32();
                        break;
                    }
                case 3: {
                        message.bg_color = reader.int32();
                        break;
                    }
                case 4: {
                        message.attributes = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ScreenCell message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.ScreenCell
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.ScreenCell} ScreenCell
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ScreenCell.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ScreenCell message.
         * @function verify
         * @memberof vtr.ScreenCell
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ScreenCell.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.char != null && message.hasOwnProperty("char"))
                if (!$util.isString(message.char))
                    return "char: string expected";
            if (message.fg_color != null && message.hasOwnProperty("fg_color"))
                if (!$util.isInteger(message.fg_color))
                    return "fg_color: integer expected";
            if (message.bg_color != null && message.hasOwnProperty("bg_color"))
                if (!$util.isInteger(message.bg_color))
                    return "bg_color: integer expected";
            if (message.attributes != null && message.hasOwnProperty("attributes"))
                if (!$util.isInteger(message.attributes))
                    return "attributes: integer expected";
            return null;
        };

        /**
         * Creates a ScreenCell message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.ScreenCell
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.ScreenCell} ScreenCell
         */
        ScreenCell.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.ScreenCell)
                return object;
            let message = new $root.vtr.ScreenCell();
            if (object.char != null)
                message.char = String(object.char);
            if (object.fg_color != null)
                message.fg_color = object.fg_color | 0;
            if (object.bg_color != null)
                message.bg_color = object.bg_color | 0;
            if (object.attributes != null)
                message.attributes = object.attributes >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a ScreenCell message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.ScreenCell
         * @static
         * @param {vtr.ScreenCell} message ScreenCell
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ScreenCell.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.char = "";
                object.fg_color = 0;
                object.bg_color = 0;
                object.attributes = 0;
            }
            if (message.char != null && message.hasOwnProperty("char"))
                object.char = message.char;
            if (message.fg_color != null && message.hasOwnProperty("fg_color"))
                object.fg_color = message.fg_color;
            if (message.bg_color != null && message.hasOwnProperty("bg_color"))
                object.bg_color = message.bg_color;
            if (message.attributes != null && message.hasOwnProperty("attributes"))
                object.attributes = message.attributes;
            return object;
        };

        /**
         * Converts this ScreenCell to JSON.
         * @function toJSON
         * @memberof vtr.ScreenCell
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ScreenCell.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ScreenCell
         * @function getTypeUrl
         * @memberof vtr.ScreenCell
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ScreenCell.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.ScreenCell";
        };

        return ScreenCell;
    })();

    vtr.ScreenRow = (function() {

        /**
         * Properties of a ScreenRow.
         * @memberof vtr
         * @interface IScreenRow
         * @property {Array.<vtr.IScreenCell>|null} [cells] ScreenRow cells
         */

        /**
         * Constructs a new ScreenRow.
         * @memberof vtr
         * @classdesc Represents a ScreenRow.
         * @implements IScreenRow
         * @constructor
         * @param {vtr.IScreenRow=} [properties] Properties to set
         */
        function ScreenRow(properties) {
            this.cells = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ScreenRow cells.
         * @member {Array.<vtr.IScreenCell>} cells
         * @memberof vtr.ScreenRow
         * @instance
         */
        ScreenRow.prototype.cells = $util.emptyArray;

        /**
         * Creates a new ScreenRow instance using the specified properties.
         * @function create
         * @memberof vtr.ScreenRow
         * @static
         * @param {vtr.IScreenRow=} [properties] Properties to set
         * @returns {vtr.ScreenRow} ScreenRow instance
         */
        ScreenRow.create = function create(properties) {
            return new ScreenRow(properties);
        };

        /**
         * Encodes the specified ScreenRow message. Does not implicitly {@link vtr.ScreenRow.verify|verify} messages.
         * @function encode
         * @memberof vtr.ScreenRow
         * @static
         * @param {vtr.IScreenRow} message ScreenRow message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ScreenRow.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.cells != null && message.cells.length)
                for (let i = 0; i < message.cells.length; ++i)
                    $root.vtr.ScreenCell.encode(message.cells[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ScreenRow message, length delimited. Does not implicitly {@link vtr.ScreenRow.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.ScreenRow
         * @static
         * @param {vtr.IScreenRow} message ScreenRow message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ScreenRow.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ScreenRow message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.ScreenRow
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.ScreenRow} ScreenRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ScreenRow.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.ScreenRow();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.cells && message.cells.length))
                            message.cells = [];
                        message.cells.push($root.vtr.ScreenCell.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ScreenRow message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.ScreenRow
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.ScreenRow} ScreenRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ScreenRow.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ScreenRow message.
         * @function verify
         * @memberof vtr.ScreenRow
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ScreenRow.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.cells != null && message.hasOwnProperty("cells")) {
                if (!Array.isArray(message.cells))
                    return "cells: array expected";
                for (let i = 0; i < message.cells.length; ++i) {
                    let error = $root.vtr.ScreenCell.verify(message.cells[i]);
                    if (error)
                        return "cells." + error;
                }
            }
            return null;
        };

        /**
         * Creates a ScreenRow message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.ScreenRow
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.ScreenRow} ScreenRow
         */
        ScreenRow.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.ScreenRow)
                return object;
            let message = new $root.vtr.ScreenRow();
            if (object.cells) {
                if (!Array.isArray(object.cells))
                    throw TypeError(".vtr.ScreenRow.cells: array expected");
                message.cells = [];
                for (let i = 0; i < object.cells.length; ++i) {
                    if (typeof object.cells[i] !== "object")
                        throw TypeError(".vtr.ScreenRow.cells: object expected");
                    message.cells[i] = $root.vtr.ScreenCell.fromObject(object.cells[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a ScreenRow message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.ScreenRow
         * @static
         * @param {vtr.ScreenRow} message ScreenRow
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ScreenRow.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.cells = [];
            if (message.cells && message.cells.length) {
                object.cells = [];
                for (let j = 0; j < message.cells.length; ++j)
                    object.cells[j] = $root.vtr.ScreenCell.toObject(message.cells[j], options);
            }
            return object;
        };

        /**
         * Converts this ScreenRow to JSON.
         * @function toJSON
         * @memberof vtr.ScreenRow
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ScreenRow.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ScreenRow
         * @function getTypeUrl
         * @memberof vtr.ScreenRow
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ScreenRow.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.ScreenRow";
        };

        return ScreenRow;
    })();

    vtr.GetScreenResponse = (function() {

        /**
         * Properties of a GetScreenResponse.
         * @memberof vtr
         * @interface IGetScreenResponse
         * @property {string|null} [name] GetScreenResponse name
         * @property {number|null} [cols] GetScreenResponse cols
         * @property {number|null} [rows] GetScreenResponse rows
         * @property {number|null} [cursor_x] GetScreenResponse cursor_x
         * @property {number|null} [cursor_y] GetScreenResponse cursor_y
         * @property {Array.<vtr.IScreenRow>|null} [screen_rows] GetScreenResponse screen_rows
         * @property {string|null} [id] GetScreenResponse id
         */

        /**
         * Constructs a new GetScreenResponse.
         * @memberof vtr
         * @classdesc Represents a GetScreenResponse.
         * @implements IGetScreenResponse
         * @constructor
         * @param {vtr.IGetScreenResponse=} [properties] Properties to set
         */
        function GetScreenResponse(properties) {
            this.screen_rows = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetScreenResponse name.
         * @member {string} name
         * @memberof vtr.GetScreenResponse
         * @instance
         */
        GetScreenResponse.prototype.name = "";

        /**
         * GetScreenResponse cols.
         * @member {number} cols
         * @memberof vtr.GetScreenResponse
         * @instance
         */
        GetScreenResponse.prototype.cols = 0;

        /**
         * GetScreenResponse rows.
         * @member {number} rows
         * @memberof vtr.GetScreenResponse
         * @instance
         */
        GetScreenResponse.prototype.rows = 0;

        /**
         * GetScreenResponse cursor_x.
         * @member {number} cursor_x
         * @memberof vtr.GetScreenResponse
         * @instance
         */
        GetScreenResponse.prototype.cursor_x = 0;

        /**
         * GetScreenResponse cursor_y.
         * @member {number} cursor_y
         * @memberof vtr.GetScreenResponse
         * @instance
         */
        GetScreenResponse.prototype.cursor_y = 0;

        /**
         * GetScreenResponse screen_rows.
         * @member {Array.<vtr.IScreenRow>} screen_rows
         * @memberof vtr.GetScreenResponse
         * @instance
         */
        GetScreenResponse.prototype.screen_rows = $util.emptyArray;

        /**
         * GetScreenResponse id.
         * @member {string} id
         * @memberof vtr.GetScreenResponse
         * @instance
         */
        GetScreenResponse.prototype.id = "";

        /**
         * Creates a new GetScreenResponse instance using the specified properties.
         * @function create
         * @memberof vtr.GetScreenResponse
         * @static
         * @param {vtr.IGetScreenResponse=} [properties] Properties to set
         * @returns {vtr.GetScreenResponse} GetScreenResponse instance
         */
        GetScreenResponse.create = function create(properties) {
            return new GetScreenResponse(properties);
        };

        /**
         * Encodes the specified GetScreenResponse message. Does not implicitly {@link vtr.GetScreenResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.GetScreenResponse
         * @static
         * @param {vtr.IGetScreenResponse} message GetScreenResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetScreenResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
            if (message.cols != null && Object.hasOwnProperty.call(message, "cols"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.cols);
            if (message.rows != null && Object.hasOwnProperty.call(message, "rows"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.rows);
            if (message.cursor_x != null && Object.hasOwnProperty.call(message, "cursor_x"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.cursor_x);
            if (message.cursor_y != null && Object.hasOwnProperty.call(message, "cursor_y"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.cursor_y);
            if (message.screen_rows != null && message.screen_rows.length)
                for (let i = 0; i < message.screen_rows.length; ++i)
                    $root.vtr.ScreenRow.encode(message.screen_rows[i], writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.id);
            return writer;
        };

        /**
         * Encodes the specified GetScreenResponse message, length delimited. Does not implicitly {@link vtr.GetScreenResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.GetScreenResponse
         * @static
         * @param {vtr.IGetScreenResponse} message GetScreenResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetScreenResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetScreenResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.GetScreenResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.GetScreenResponse} GetScreenResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetScreenResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.GetScreenResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.name = reader.string();
                        break;
                    }
                case 2: {
                        message.cols = reader.int32();
                        break;
                    }
                case 3: {
                        message.rows = reader.int32();
                        break;
                    }
                case 4: {
                        message.cursor_x = reader.int32();
                        break;
                    }
                case 5: {
                        message.cursor_y = reader.int32();
                        break;
                    }
                case 6: {
                        if (!(message.screen_rows && message.screen_rows.length))
                            message.screen_rows = [];
                        message.screen_rows.push($root.vtr.ScreenRow.decode(reader, reader.uint32()));
                        break;
                    }
                case 7: {
                        message.id = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetScreenResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.GetScreenResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.GetScreenResponse} GetScreenResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetScreenResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetScreenResponse message.
         * @function verify
         * @memberof vtr.GetScreenResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetScreenResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            if (message.cols != null && message.hasOwnProperty("cols"))
                if (!$util.isInteger(message.cols))
                    return "cols: integer expected";
            if (message.rows != null && message.hasOwnProperty("rows"))
                if (!$util.isInteger(message.rows))
                    return "rows: integer expected";
            if (message.cursor_x != null && message.hasOwnProperty("cursor_x"))
                if (!$util.isInteger(message.cursor_x))
                    return "cursor_x: integer expected";
            if (message.cursor_y != null && message.hasOwnProperty("cursor_y"))
                if (!$util.isInteger(message.cursor_y))
                    return "cursor_y: integer expected";
            if (message.screen_rows != null && message.hasOwnProperty("screen_rows")) {
                if (!Array.isArray(message.screen_rows))
                    return "screen_rows: array expected";
                for (let i = 0; i < message.screen_rows.length; ++i) {
                    let error = $root.vtr.ScreenRow.verify(message.screen_rows[i]);
                    if (error)
                        return "screen_rows." + error;
                }
            }
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            return null;
        };

        /**
         * Creates a GetScreenResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.GetScreenResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.GetScreenResponse} GetScreenResponse
         */
        GetScreenResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.GetScreenResponse)
                return object;
            let message = new $root.vtr.GetScreenResponse();
            if (object.name != null)
                message.name = String(object.name);
            if (object.cols != null)
                message.cols = object.cols | 0;
            if (object.rows != null)
                message.rows = object.rows | 0;
            if (object.cursor_x != null)
                message.cursor_x = object.cursor_x | 0;
            if (object.cursor_y != null)
                message.cursor_y = object.cursor_y | 0;
            if (object.screen_rows) {
                if (!Array.isArray(object.screen_rows))
                    throw TypeError(".vtr.GetScreenResponse.screen_rows: array expected");
                message.screen_rows = [];
                for (let i = 0; i < object.screen_rows.length; ++i) {
                    if (typeof object.screen_rows[i] !== "object")
                        throw TypeError(".vtr.GetScreenResponse.screen_rows: object expected");
                    message.screen_rows[i] = $root.vtr.ScreenRow.fromObject(object.screen_rows[i]);
                }
            }
            if (object.id != null)
                message.id = String(object.id);
            return message;
        };

        /**
         * Creates a plain object from a GetScreenResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.GetScreenResponse
         * @static
         * @param {vtr.GetScreenResponse} message GetScreenResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetScreenResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.screen_rows = [];
            if (options.defaults) {
                object.name = "";
                object.cols = 0;
                object.rows = 0;
                object.cursor_x = 0;
                object.cursor_y = 0;
                object.id = "";
            }
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            if (message.cols != null && message.hasOwnProperty("cols"))
                object.cols = message.cols;
            if (message.rows != null && message.hasOwnProperty("rows"))
                object.rows = message.rows;
            if (message.cursor_x != null && message.hasOwnProperty("cursor_x"))
                object.cursor_x = message.cursor_x;
            if (message.cursor_y != null && message.hasOwnProperty("cursor_y"))
                object.cursor_y = message.cursor_y;
            if (message.screen_rows && message.screen_rows.length) {
                object.screen_rows = [];
                for (let j = 0; j < message.screen_rows.length; ++j)
                    object.screen_rows[j] = $root.vtr.ScreenRow.toObject(message.screen_rows[j], options);
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            return object;
        };

        /**
         * Converts this GetScreenResponse to JSON.
         * @function toJSON
         * @memberof vtr.GetScreenResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetScreenResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetScreenResponse
         * @function getTypeUrl
         * @memberof vtr.GetScreenResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetScreenResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.GetScreenResponse";
        };

        return GetScreenResponse;
    })();

    vtr.GrepRequest = (function() {

        /**
         * Properties of a GrepRequest.
         * @memberof vtr
         * @interface IGrepRequest
         * @property {vtr.ISessionRef|null} [session] GrepRequest session
         * @property {string|null} [pattern] GrepRequest pattern
         * @property {number|null} [context_before] GrepRequest context_before
         * @property {number|null} [context_after] GrepRequest context_after
         * @property {number|null} [max_matches] GrepRequest max_matches
         */

        /**
         * Constructs a new GrepRequest.
         * @memberof vtr
         * @classdesc Represents a GrepRequest.
         * @implements IGrepRequest
         * @constructor
         * @param {vtr.IGrepRequest=} [properties] Properties to set
         */
        function GrepRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GrepRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.GrepRequest
         * @instance
         */
        GrepRequest.prototype.session = null;

        /**
         * GrepRequest pattern.
         * @member {string} pattern
         * @memberof vtr.GrepRequest
         * @instance
         */
        GrepRequest.prototype.pattern = "";

        /**
         * GrepRequest context_before.
         * @member {number} context_before
         * @memberof vtr.GrepRequest
         * @instance
         */
        GrepRequest.prototype.context_before = 0;

        /**
         * GrepRequest context_after.
         * @member {number} context_after
         * @memberof vtr.GrepRequest
         * @instance
         */
        GrepRequest.prototype.context_after = 0;

        /**
         * GrepRequest max_matches.
         * @member {number} max_matches
         * @memberof vtr.GrepRequest
         * @instance
         */
        GrepRequest.prototype.max_matches = 0;

        /**
         * Creates a new GrepRequest instance using the specified properties.
         * @function create
         * @memberof vtr.GrepRequest
         * @static
         * @param {vtr.IGrepRequest=} [properties] Properties to set
         * @returns {vtr.GrepRequest} GrepRequest instance
         */
        GrepRequest.create = function create(properties) {
            return new GrepRequest(properties);
        };

        /**
         * Encodes the specified GrepRequest message. Does not implicitly {@link vtr.GrepRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.GrepRequest
         * @static
         * @param {vtr.IGrepRequest} message GrepRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GrepRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.pattern != null && Object.hasOwnProperty.call(message, "pattern"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.pattern);
            if (message.context_before != null && Object.hasOwnProperty.call(message, "context_before"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.context_before);
            if (message.context_after != null && Object.hasOwnProperty.call(message, "context_after"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.context_after);
            if (message.max_matches != null && Object.hasOwnProperty.call(message, "max_matches"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.max_matches);
            return writer;
        };

        /**
         * Encodes the specified GrepRequest message, length delimited. Does not implicitly {@link vtr.GrepRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.GrepRequest
         * @static
         * @param {vtr.IGrepRequest} message GrepRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GrepRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GrepRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.GrepRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.GrepRequest} GrepRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GrepRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.GrepRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.pattern = reader.string();
                        break;
                    }
                case 3: {
                        message.context_before = reader.int32();
                        break;
                    }
                case 4: {
                        message.context_after = reader.int32();
                        break;
                    }
                case 5: {
                        message.max_matches = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GrepRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.GrepRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.GrepRequest} GrepRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GrepRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GrepRequest message.
         * @function verify
         * @memberof vtr.GrepRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GrepRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            if (message.pattern != null && message.hasOwnProperty("pattern"))
                if (!$util.isString(message.pattern))
                    return "pattern: string expected";
            if (message.context_before != null && message.hasOwnProperty("context_before"))
                if (!$util.isInteger(message.context_before))
                    return "context_before: integer expected";
            if (message.context_after != null && message.hasOwnProperty("context_after"))
                if (!$util.isInteger(message.context_after))
                    return "context_after: integer expected";
            if (message.max_matches != null && message.hasOwnProperty("max_matches"))
                if (!$util.isInteger(message.max_matches))
                    return "max_matches: integer expected";
            return null;
        };

        /**
         * Creates a GrepRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.GrepRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.GrepRequest} GrepRequest
         */
        GrepRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.GrepRequest)
                return object;
            let message = new $root.vtr.GrepRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.GrepRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            if (object.pattern != null)
                message.pattern = String(object.pattern);
            if (object.context_before != null)
                message.context_before = object.context_before | 0;
            if (object.context_after != null)
                message.context_after = object.context_after | 0;
            if (object.max_matches != null)
                message.max_matches = object.max_matches | 0;
            return message;
        };

        /**
         * Creates a plain object from a GrepRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.GrepRequest
         * @static
         * @param {vtr.GrepRequest} message GrepRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GrepRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.session = null;
                object.pattern = "";
                object.context_before = 0;
                object.context_after = 0;
                object.max_matches = 0;
            }
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            if (message.pattern != null && message.hasOwnProperty("pattern"))
                object.pattern = message.pattern;
            if (message.context_before != null && message.hasOwnProperty("context_before"))
                object.context_before = message.context_before;
            if (message.context_after != null && message.hasOwnProperty("context_after"))
                object.context_after = message.context_after;
            if (message.max_matches != null && message.hasOwnProperty("max_matches"))
                object.max_matches = message.max_matches;
            return object;
        };

        /**
         * Converts this GrepRequest to JSON.
         * @function toJSON
         * @memberof vtr.GrepRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GrepRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GrepRequest
         * @function getTypeUrl
         * @memberof vtr.GrepRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GrepRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.GrepRequest";
        };

        return GrepRequest;
    })();

    vtr.GrepMatch = (function() {

        /**
         * Properties of a GrepMatch.
         * @memberof vtr
         * @interface IGrepMatch
         * @property {number|null} [line_number] GrepMatch line_number
         * @property {string|null} [line] GrepMatch line
         * @property {Array.<string>|null} [context_before] GrepMatch context_before
         * @property {Array.<string>|null} [context_after] GrepMatch context_after
         */

        /**
         * Constructs a new GrepMatch.
         * @memberof vtr
         * @classdesc Represents a GrepMatch.
         * @implements IGrepMatch
         * @constructor
         * @param {vtr.IGrepMatch=} [properties] Properties to set
         */
        function GrepMatch(properties) {
            this.context_before = [];
            this.context_after = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GrepMatch line_number.
         * @member {number} line_number
         * @memberof vtr.GrepMatch
         * @instance
         */
        GrepMatch.prototype.line_number = 0;

        /**
         * GrepMatch line.
         * @member {string} line
         * @memberof vtr.GrepMatch
         * @instance
         */
        GrepMatch.prototype.line = "";

        /**
         * GrepMatch context_before.
         * @member {Array.<string>} context_before
         * @memberof vtr.GrepMatch
         * @instance
         */
        GrepMatch.prototype.context_before = $util.emptyArray;

        /**
         * GrepMatch context_after.
         * @member {Array.<string>} context_after
         * @memberof vtr.GrepMatch
         * @instance
         */
        GrepMatch.prototype.context_after = $util.emptyArray;

        /**
         * Creates a new GrepMatch instance using the specified properties.
         * @function create
         * @memberof vtr.GrepMatch
         * @static
         * @param {vtr.IGrepMatch=} [properties] Properties to set
         * @returns {vtr.GrepMatch} GrepMatch instance
         */
        GrepMatch.create = function create(properties) {
            return new GrepMatch(properties);
        };

        /**
         * Encodes the specified GrepMatch message. Does not implicitly {@link vtr.GrepMatch.verify|verify} messages.
         * @function encode
         * @memberof vtr.GrepMatch
         * @static
         * @param {vtr.IGrepMatch} message GrepMatch message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GrepMatch.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.line_number != null && Object.hasOwnProperty.call(message, "line_number"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.line_number);
            if (message.line != null && Object.hasOwnProperty.call(message, "line"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.line);
            if (message.context_before != null && message.context_before.length)
                for (let i = 0; i < message.context_before.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.context_before[i]);
            if (message.context_after != null && message.context_after.length)
                for (let i = 0; i < message.context_after.length; ++i)
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.context_after[i]);
            return writer;
        };

        /**
         * Encodes the specified GrepMatch message, length delimited. Does not implicitly {@link vtr.GrepMatch.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.GrepMatch
         * @static
         * @param {vtr.IGrepMatch} message GrepMatch message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GrepMatch.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GrepMatch message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.GrepMatch
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.GrepMatch} GrepMatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GrepMatch.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.GrepMatch();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.line_number = reader.int32();
                        break;
                    }
                case 2: {
                        message.line = reader.string();
                        break;
                    }
                case 3: {
                        if (!(message.context_before && message.context_before.length))
                            message.context_before = [];
                        message.context_before.push(reader.string());
                        break;
                    }
                case 4: {
                        if (!(message.context_after && message.context_after.length))
                            message.context_after = [];
                        message.context_after.push(reader.string());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GrepMatch message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.GrepMatch
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.GrepMatch} GrepMatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GrepMatch.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GrepMatch message.
         * @function verify
         * @memberof vtr.GrepMatch
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GrepMatch.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.line_number != null && message.hasOwnProperty("line_number"))
                if (!$util.isInteger(message.line_number))
                    return "line_number: integer expected";
            if (message.line != null && message.hasOwnProperty("line"))
                if (!$util.isString(message.line))
                    return "line: string expected";
            if (message.context_before != null && message.hasOwnProperty("context_before")) {
                if (!Array.isArray(message.context_before))
                    return "context_before: array expected";
                for (let i = 0; i < message.context_before.length; ++i)
                    if (!$util.isString(message.context_before[i]))
                        return "context_before: string[] expected";
            }
            if (message.context_after != null && message.hasOwnProperty("context_after")) {
                if (!Array.isArray(message.context_after))
                    return "context_after: array expected";
                for (let i = 0; i < message.context_after.length; ++i)
                    if (!$util.isString(message.context_after[i]))
                        return "context_after: string[] expected";
            }
            return null;
        };

        /**
         * Creates a GrepMatch message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.GrepMatch
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.GrepMatch} GrepMatch
         */
        GrepMatch.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.GrepMatch)
                return object;
            let message = new $root.vtr.GrepMatch();
            if (object.line_number != null)
                message.line_number = object.line_number | 0;
            if (object.line != null)
                message.line = String(object.line);
            if (object.context_before) {
                if (!Array.isArray(object.context_before))
                    throw TypeError(".vtr.GrepMatch.context_before: array expected");
                message.context_before = [];
                for (let i = 0; i < object.context_before.length; ++i)
                    message.context_before[i] = String(object.context_before[i]);
            }
            if (object.context_after) {
                if (!Array.isArray(object.context_after))
                    throw TypeError(".vtr.GrepMatch.context_after: array expected");
                message.context_after = [];
                for (let i = 0; i < object.context_after.length; ++i)
                    message.context_after[i] = String(object.context_after[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a GrepMatch message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.GrepMatch
         * @static
         * @param {vtr.GrepMatch} message GrepMatch
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GrepMatch.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.context_before = [];
                object.context_after = [];
            }
            if (options.defaults) {
                object.line_number = 0;
                object.line = "";
            }
            if (message.line_number != null && message.hasOwnProperty("line_number"))
                object.line_number = message.line_number;
            if (message.line != null && message.hasOwnProperty("line"))
                object.line = message.line;
            if (message.context_before && message.context_before.length) {
                object.context_before = [];
                for (let j = 0; j < message.context_before.length; ++j)
                    object.context_before[j] = message.context_before[j];
            }
            if (message.context_after && message.context_after.length) {
                object.context_after = [];
                for (let j = 0; j < message.context_after.length; ++j)
                    object.context_after[j] = message.context_after[j];
            }
            return object;
        };

        /**
         * Converts this GrepMatch to JSON.
         * @function toJSON
         * @memberof vtr.GrepMatch
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GrepMatch.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GrepMatch
         * @function getTypeUrl
         * @memberof vtr.GrepMatch
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GrepMatch.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.GrepMatch";
        };

        return GrepMatch;
    })();

    vtr.GrepResponse = (function() {

        /**
         * Properties of a GrepResponse.
         * @memberof vtr
         * @interface IGrepResponse
         * @property {Array.<vtr.IGrepMatch>|null} [matches] GrepResponse matches
         */

        /**
         * Constructs a new GrepResponse.
         * @memberof vtr
         * @classdesc Represents a GrepResponse.
         * @implements IGrepResponse
         * @constructor
         * @param {vtr.IGrepResponse=} [properties] Properties to set
         */
        function GrepResponse(properties) {
            this.matches = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GrepResponse matches.
         * @member {Array.<vtr.IGrepMatch>} matches
         * @memberof vtr.GrepResponse
         * @instance
         */
        GrepResponse.prototype.matches = $util.emptyArray;

        /**
         * Creates a new GrepResponse instance using the specified properties.
         * @function create
         * @memberof vtr.GrepResponse
         * @static
         * @param {vtr.IGrepResponse=} [properties] Properties to set
         * @returns {vtr.GrepResponse} GrepResponse instance
         */
        GrepResponse.create = function create(properties) {
            return new GrepResponse(properties);
        };

        /**
         * Encodes the specified GrepResponse message. Does not implicitly {@link vtr.GrepResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.GrepResponse
         * @static
         * @param {vtr.IGrepResponse} message GrepResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GrepResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.matches != null && message.matches.length)
                for (let i = 0; i < message.matches.length; ++i)
                    $root.vtr.GrepMatch.encode(message.matches[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GrepResponse message, length delimited. Does not implicitly {@link vtr.GrepResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.GrepResponse
         * @static
         * @param {vtr.IGrepResponse} message GrepResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GrepResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GrepResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.GrepResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.GrepResponse} GrepResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GrepResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.GrepResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.matches && message.matches.length))
                            message.matches = [];
                        message.matches.push($root.vtr.GrepMatch.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GrepResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.GrepResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.GrepResponse} GrepResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GrepResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GrepResponse message.
         * @function verify
         * @memberof vtr.GrepResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GrepResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.matches != null && message.hasOwnProperty("matches")) {
                if (!Array.isArray(message.matches))
                    return "matches: array expected";
                for (let i = 0; i < message.matches.length; ++i) {
                    let error = $root.vtr.GrepMatch.verify(message.matches[i]);
                    if (error)
                        return "matches." + error;
                }
            }
            return null;
        };

        /**
         * Creates a GrepResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.GrepResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.GrepResponse} GrepResponse
         */
        GrepResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.GrepResponse)
                return object;
            let message = new $root.vtr.GrepResponse();
            if (object.matches) {
                if (!Array.isArray(object.matches))
                    throw TypeError(".vtr.GrepResponse.matches: array expected");
                message.matches = [];
                for (let i = 0; i < object.matches.length; ++i) {
                    if (typeof object.matches[i] !== "object")
                        throw TypeError(".vtr.GrepResponse.matches: object expected");
                    message.matches[i] = $root.vtr.GrepMatch.fromObject(object.matches[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a GrepResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.GrepResponse
         * @static
         * @param {vtr.GrepResponse} message GrepResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GrepResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.matches = [];
            if (message.matches && message.matches.length) {
                object.matches = [];
                for (let j = 0; j < message.matches.length; ++j)
                    object.matches[j] = $root.vtr.GrepMatch.toObject(message.matches[j], options);
            }
            return object;
        };

        /**
         * Converts this GrepResponse to JSON.
         * @function toJSON
         * @memberof vtr.GrepResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GrepResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GrepResponse
         * @function getTypeUrl
         * @memberof vtr.GrepResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GrepResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.GrepResponse";
        };

        return GrepResponse;
    })();

    vtr.SendTextRequest = (function() {

        /**
         * Properties of a SendTextRequest.
         * @memberof vtr
         * @interface ISendTextRequest
         * @property {vtr.ISessionRef|null} [session] SendTextRequest session
         * @property {string|null} [text] SendTextRequest text
         */

        /**
         * Constructs a new SendTextRequest.
         * @memberof vtr
         * @classdesc Represents a SendTextRequest.
         * @implements ISendTextRequest
         * @constructor
         * @param {vtr.ISendTextRequest=} [properties] Properties to set
         */
        function SendTextRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SendTextRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.SendTextRequest
         * @instance
         */
        SendTextRequest.prototype.session = null;

        /**
         * SendTextRequest text.
         * @member {string} text
         * @memberof vtr.SendTextRequest
         * @instance
         */
        SendTextRequest.prototype.text = "";

        /**
         * Creates a new SendTextRequest instance using the specified properties.
         * @function create
         * @memberof vtr.SendTextRequest
         * @static
         * @param {vtr.ISendTextRequest=} [properties] Properties to set
         * @returns {vtr.SendTextRequest} SendTextRequest instance
         */
        SendTextRequest.create = function create(properties) {
            return new SendTextRequest(properties);
        };

        /**
         * Encodes the specified SendTextRequest message. Does not implicitly {@link vtr.SendTextRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.SendTextRequest
         * @static
         * @param {vtr.ISendTextRequest} message SendTextRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendTextRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.text != null && Object.hasOwnProperty.call(message, "text"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.text);
            return writer;
        };

        /**
         * Encodes the specified SendTextRequest message, length delimited. Does not implicitly {@link vtr.SendTextRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SendTextRequest
         * @static
         * @param {vtr.ISendTextRequest} message SendTextRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendTextRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SendTextRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SendTextRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SendTextRequest} SendTextRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendTextRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SendTextRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.text = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SendTextRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SendTextRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SendTextRequest} SendTextRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendTextRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SendTextRequest message.
         * @function verify
         * @memberof vtr.SendTextRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SendTextRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            if (message.text != null && message.hasOwnProperty("text"))
                if (!$util.isString(message.text))
                    return "text: string expected";
            return null;
        };

        /**
         * Creates a SendTextRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SendTextRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SendTextRequest} SendTextRequest
         */
        SendTextRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SendTextRequest)
                return object;
            let message = new $root.vtr.SendTextRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.SendTextRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            if (object.text != null)
                message.text = String(object.text);
            return message;
        };

        /**
         * Creates a plain object from a SendTextRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SendTextRequest
         * @static
         * @param {vtr.SendTextRequest} message SendTextRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SendTextRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.session = null;
                object.text = "";
            }
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            if (message.text != null && message.hasOwnProperty("text"))
                object.text = message.text;
            return object;
        };

        /**
         * Converts this SendTextRequest to JSON.
         * @function toJSON
         * @memberof vtr.SendTextRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SendTextRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SendTextRequest
         * @function getTypeUrl
         * @memberof vtr.SendTextRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SendTextRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SendTextRequest";
        };

        return SendTextRequest;
    })();

    vtr.SendTextResponse = (function() {

        /**
         * Properties of a SendTextResponse.
         * @memberof vtr
         * @interface ISendTextResponse
         */

        /**
         * Constructs a new SendTextResponse.
         * @memberof vtr
         * @classdesc Represents a SendTextResponse.
         * @implements ISendTextResponse
         * @constructor
         * @param {vtr.ISendTextResponse=} [properties] Properties to set
         */
        function SendTextResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new SendTextResponse instance using the specified properties.
         * @function create
         * @memberof vtr.SendTextResponse
         * @static
         * @param {vtr.ISendTextResponse=} [properties] Properties to set
         * @returns {vtr.SendTextResponse} SendTextResponse instance
         */
        SendTextResponse.create = function create(properties) {
            return new SendTextResponse(properties);
        };

        /**
         * Encodes the specified SendTextResponse message. Does not implicitly {@link vtr.SendTextResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.SendTextResponse
         * @static
         * @param {vtr.ISendTextResponse} message SendTextResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendTextResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified SendTextResponse message, length delimited. Does not implicitly {@link vtr.SendTextResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SendTextResponse
         * @static
         * @param {vtr.ISendTextResponse} message SendTextResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendTextResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SendTextResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SendTextResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SendTextResponse} SendTextResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendTextResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SendTextResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SendTextResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SendTextResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SendTextResponse} SendTextResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendTextResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SendTextResponse message.
         * @function verify
         * @memberof vtr.SendTextResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SendTextResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates a SendTextResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SendTextResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SendTextResponse} SendTextResponse
         */
        SendTextResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SendTextResponse)
                return object;
            return new $root.vtr.SendTextResponse();
        };

        /**
         * Creates a plain object from a SendTextResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SendTextResponse
         * @static
         * @param {vtr.SendTextResponse} message SendTextResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SendTextResponse.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this SendTextResponse to JSON.
         * @function toJSON
         * @memberof vtr.SendTextResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SendTextResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SendTextResponse
         * @function getTypeUrl
         * @memberof vtr.SendTextResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SendTextResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SendTextResponse";
        };

        return SendTextResponse;
    })();

    vtr.SendKeyRequest = (function() {

        /**
         * Properties of a SendKeyRequest.
         * @memberof vtr
         * @interface ISendKeyRequest
         * @property {vtr.ISessionRef|null} [session] SendKeyRequest session
         * @property {string|null} [key] SendKeyRequest key
         */

        /**
         * Constructs a new SendKeyRequest.
         * @memberof vtr
         * @classdesc Represents a SendKeyRequest.
         * @implements ISendKeyRequest
         * @constructor
         * @param {vtr.ISendKeyRequest=} [properties] Properties to set
         */
        function SendKeyRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SendKeyRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.SendKeyRequest
         * @instance
         */
        SendKeyRequest.prototype.session = null;

        /**
         * SendKeyRequest key.
         * @member {string} key
         * @memberof vtr.SendKeyRequest
         * @instance
         */
        SendKeyRequest.prototype.key = "";

        /**
         * Creates a new SendKeyRequest instance using the specified properties.
         * @function create
         * @memberof vtr.SendKeyRequest
         * @static
         * @param {vtr.ISendKeyRequest=} [properties] Properties to set
         * @returns {vtr.SendKeyRequest} SendKeyRequest instance
         */
        SendKeyRequest.create = function create(properties) {
            return new SendKeyRequest(properties);
        };

        /**
         * Encodes the specified SendKeyRequest message. Does not implicitly {@link vtr.SendKeyRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.SendKeyRequest
         * @static
         * @param {vtr.ISendKeyRequest} message SendKeyRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendKeyRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.key != null && Object.hasOwnProperty.call(message, "key"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.key);
            return writer;
        };

        /**
         * Encodes the specified SendKeyRequest message, length delimited. Does not implicitly {@link vtr.SendKeyRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SendKeyRequest
         * @static
         * @param {vtr.ISendKeyRequest} message SendKeyRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendKeyRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SendKeyRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SendKeyRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SendKeyRequest} SendKeyRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendKeyRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SendKeyRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.key = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SendKeyRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SendKeyRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SendKeyRequest} SendKeyRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendKeyRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SendKeyRequest message.
         * @function verify
         * @memberof vtr.SendKeyRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SendKeyRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            if (message.key != null && message.hasOwnProperty("key"))
                if (!$util.isString(message.key))
                    return "key: string expected";
            return null;
        };

        /**
         * Creates a SendKeyRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SendKeyRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SendKeyRequest} SendKeyRequest
         */
        SendKeyRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SendKeyRequest)
                return object;
            let message = new $root.vtr.SendKeyRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.SendKeyRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            if (object.key != null)
                message.key = String(object.key);
            return message;
        };

        /**
         * Creates a plain object from a SendKeyRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SendKeyRequest
         * @static
         * @param {vtr.SendKeyRequest} message SendKeyRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SendKeyRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.session = null;
                object.key = "";
            }
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            if (message.key != null && message.hasOwnProperty("key"))
                object.key = message.key;
            return object;
        };

        /**
         * Converts this SendKeyRequest to JSON.
         * @function toJSON
         * @memberof vtr.SendKeyRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SendKeyRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SendKeyRequest
         * @function getTypeUrl
         * @memberof vtr.SendKeyRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SendKeyRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SendKeyRequest";
        };

        return SendKeyRequest;
    })();

    vtr.SendKeyResponse = (function() {

        /**
         * Properties of a SendKeyResponse.
         * @memberof vtr
         * @interface ISendKeyResponse
         */

        /**
         * Constructs a new SendKeyResponse.
         * @memberof vtr
         * @classdesc Represents a SendKeyResponse.
         * @implements ISendKeyResponse
         * @constructor
         * @param {vtr.ISendKeyResponse=} [properties] Properties to set
         */
        function SendKeyResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new SendKeyResponse instance using the specified properties.
         * @function create
         * @memberof vtr.SendKeyResponse
         * @static
         * @param {vtr.ISendKeyResponse=} [properties] Properties to set
         * @returns {vtr.SendKeyResponse} SendKeyResponse instance
         */
        SendKeyResponse.create = function create(properties) {
            return new SendKeyResponse(properties);
        };

        /**
         * Encodes the specified SendKeyResponse message. Does not implicitly {@link vtr.SendKeyResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.SendKeyResponse
         * @static
         * @param {vtr.ISendKeyResponse} message SendKeyResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendKeyResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified SendKeyResponse message, length delimited. Does not implicitly {@link vtr.SendKeyResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SendKeyResponse
         * @static
         * @param {vtr.ISendKeyResponse} message SendKeyResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendKeyResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SendKeyResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SendKeyResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SendKeyResponse} SendKeyResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendKeyResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SendKeyResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SendKeyResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SendKeyResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SendKeyResponse} SendKeyResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendKeyResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SendKeyResponse message.
         * @function verify
         * @memberof vtr.SendKeyResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SendKeyResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates a SendKeyResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SendKeyResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SendKeyResponse} SendKeyResponse
         */
        SendKeyResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SendKeyResponse)
                return object;
            return new $root.vtr.SendKeyResponse();
        };

        /**
         * Creates a plain object from a SendKeyResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SendKeyResponse
         * @static
         * @param {vtr.SendKeyResponse} message SendKeyResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SendKeyResponse.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this SendKeyResponse to JSON.
         * @function toJSON
         * @memberof vtr.SendKeyResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SendKeyResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SendKeyResponse
         * @function getTypeUrl
         * @memberof vtr.SendKeyResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SendKeyResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SendKeyResponse";
        };

        return SendKeyResponse;
    })();

    vtr.SendBytesRequest = (function() {

        /**
         * Properties of a SendBytesRequest.
         * @memberof vtr
         * @interface ISendBytesRequest
         * @property {vtr.ISessionRef|null} [session] SendBytesRequest session
         * @property {Uint8Array|null} [data] SendBytesRequest data
         */

        /**
         * Constructs a new SendBytesRequest.
         * @memberof vtr
         * @classdesc Represents a SendBytesRequest.
         * @implements ISendBytesRequest
         * @constructor
         * @param {vtr.ISendBytesRequest=} [properties] Properties to set
         */
        function SendBytesRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SendBytesRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.SendBytesRequest
         * @instance
         */
        SendBytesRequest.prototype.session = null;

        /**
         * SendBytesRequest data.
         * @member {Uint8Array} data
         * @memberof vtr.SendBytesRequest
         * @instance
         */
        SendBytesRequest.prototype.data = $util.newBuffer([]);

        /**
         * Creates a new SendBytesRequest instance using the specified properties.
         * @function create
         * @memberof vtr.SendBytesRequest
         * @static
         * @param {vtr.ISendBytesRequest=} [properties] Properties to set
         * @returns {vtr.SendBytesRequest} SendBytesRequest instance
         */
        SendBytesRequest.create = function create(properties) {
            return new SendBytesRequest(properties);
        };

        /**
         * Encodes the specified SendBytesRequest message. Does not implicitly {@link vtr.SendBytesRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.SendBytesRequest
         * @static
         * @param {vtr.ISendBytesRequest} message SendBytesRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendBytesRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.data);
            return writer;
        };

        /**
         * Encodes the specified SendBytesRequest message, length delimited. Does not implicitly {@link vtr.SendBytesRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SendBytesRequest
         * @static
         * @param {vtr.ISendBytesRequest} message SendBytesRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendBytesRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SendBytesRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SendBytesRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SendBytesRequest} SendBytesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendBytesRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SendBytesRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.data = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SendBytesRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SendBytesRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SendBytesRequest} SendBytesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendBytesRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SendBytesRequest message.
         * @function verify
         * @memberof vtr.SendBytesRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SendBytesRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            if (message.data != null && message.hasOwnProperty("data"))
                if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                    return "data: buffer expected";
            return null;
        };

        /**
         * Creates a SendBytesRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SendBytesRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SendBytesRequest} SendBytesRequest
         */
        SendBytesRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SendBytesRequest)
                return object;
            let message = new $root.vtr.SendBytesRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.SendBytesRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            if (object.data != null)
                if (typeof object.data === "string")
                    $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
                else if (object.data.length >= 0)
                    message.data = object.data;
            return message;
        };

        /**
         * Creates a plain object from a SendBytesRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SendBytesRequest
         * @static
         * @param {vtr.SendBytesRequest} message SendBytesRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SendBytesRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.session = null;
                if (options.bytes === String)
                    object.data = "";
                else {
                    object.data = [];
                    if (options.bytes !== Array)
                        object.data = $util.newBuffer(object.data);
                }
            }
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            if (message.data != null && message.hasOwnProperty("data"))
                object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
            return object;
        };

        /**
         * Converts this SendBytesRequest to JSON.
         * @function toJSON
         * @memberof vtr.SendBytesRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SendBytesRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SendBytesRequest
         * @function getTypeUrl
         * @memberof vtr.SendBytesRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SendBytesRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SendBytesRequest";
        };

        return SendBytesRequest;
    })();

    vtr.SendBytesResponse = (function() {

        /**
         * Properties of a SendBytesResponse.
         * @memberof vtr
         * @interface ISendBytesResponse
         */

        /**
         * Constructs a new SendBytesResponse.
         * @memberof vtr
         * @classdesc Represents a SendBytesResponse.
         * @implements ISendBytesResponse
         * @constructor
         * @param {vtr.ISendBytesResponse=} [properties] Properties to set
         */
        function SendBytesResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new SendBytesResponse instance using the specified properties.
         * @function create
         * @memberof vtr.SendBytesResponse
         * @static
         * @param {vtr.ISendBytesResponse=} [properties] Properties to set
         * @returns {vtr.SendBytesResponse} SendBytesResponse instance
         */
        SendBytesResponse.create = function create(properties) {
            return new SendBytesResponse(properties);
        };

        /**
         * Encodes the specified SendBytesResponse message. Does not implicitly {@link vtr.SendBytesResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.SendBytesResponse
         * @static
         * @param {vtr.ISendBytesResponse} message SendBytesResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendBytesResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified SendBytesResponse message, length delimited. Does not implicitly {@link vtr.SendBytesResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SendBytesResponse
         * @static
         * @param {vtr.ISendBytesResponse} message SendBytesResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendBytesResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SendBytesResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SendBytesResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SendBytesResponse} SendBytesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendBytesResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SendBytesResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SendBytesResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SendBytesResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SendBytesResponse} SendBytesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendBytesResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SendBytesResponse message.
         * @function verify
         * @memberof vtr.SendBytesResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SendBytesResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates a SendBytesResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SendBytesResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SendBytesResponse} SendBytesResponse
         */
        SendBytesResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SendBytesResponse)
                return object;
            return new $root.vtr.SendBytesResponse();
        };

        /**
         * Creates a plain object from a SendBytesResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SendBytesResponse
         * @static
         * @param {vtr.SendBytesResponse} message SendBytesResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SendBytesResponse.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this SendBytesResponse to JSON.
         * @function toJSON
         * @memberof vtr.SendBytesResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SendBytesResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SendBytesResponse
         * @function getTypeUrl
         * @memberof vtr.SendBytesResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SendBytesResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SendBytesResponse";
        };

        return SendBytesResponse;
    })();

    vtr.ResizeRequest = (function() {

        /**
         * Properties of a ResizeRequest.
         * @memberof vtr
         * @interface IResizeRequest
         * @property {vtr.ISessionRef|null} [session] ResizeRequest session
         * @property {number|null} [cols] ResizeRequest cols
         * @property {number|null} [rows] ResizeRequest rows
         */

        /**
         * Constructs a new ResizeRequest.
         * @memberof vtr
         * @classdesc Represents a ResizeRequest.
         * @implements IResizeRequest
         * @constructor
         * @param {vtr.IResizeRequest=} [properties] Properties to set
         */
        function ResizeRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ResizeRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.ResizeRequest
         * @instance
         */
        ResizeRequest.prototype.session = null;

        /**
         * ResizeRequest cols.
         * @member {number} cols
         * @memberof vtr.ResizeRequest
         * @instance
         */
        ResizeRequest.prototype.cols = 0;

        /**
         * ResizeRequest rows.
         * @member {number} rows
         * @memberof vtr.ResizeRequest
         * @instance
         */
        ResizeRequest.prototype.rows = 0;

        /**
         * Creates a new ResizeRequest instance using the specified properties.
         * @function create
         * @memberof vtr.ResizeRequest
         * @static
         * @param {vtr.IResizeRequest=} [properties] Properties to set
         * @returns {vtr.ResizeRequest} ResizeRequest instance
         */
        ResizeRequest.create = function create(properties) {
            return new ResizeRequest(properties);
        };

        /**
         * Encodes the specified ResizeRequest message. Does not implicitly {@link vtr.ResizeRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.ResizeRequest
         * @static
         * @param {vtr.IResizeRequest} message ResizeRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ResizeRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.cols != null && Object.hasOwnProperty.call(message, "cols"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.cols);
            if (message.rows != null && Object.hasOwnProperty.call(message, "rows"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.rows);
            return writer;
        };

        /**
         * Encodes the specified ResizeRequest message, length delimited. Does not implicitly {@link vtr.ResizeRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.ResizeRequest
         * @static
         * @param {vtr.IResizeRequest} message ResizeRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ResizeRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ResizeRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.ResizeRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.ResizeRequest} ResizeRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ResizeRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.ResizeRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.cols = reader.int32();
                        break;
                    }
                case 3: {
                        message.rows = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ResizeRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.ResizeRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.ResizeRequest} ResizeRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ResizeRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ResizeRequest message.
         * @function verify
         * @memberof vtr.ResizeRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ResizeRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            if (message.cols != null && message.hasOwnProperty("cols"))
                if (!$util.isInteger(message.cols))
                    return "cols: integer expected";
            if (message.rows != null && message.hasOwnProperty("rows"))
                if (!$util.isInteger(message.rows))
                    return "rows: integer expected";
            return null;
        };

        /**
         * Creates a ResizeRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.ResizeRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.ResizeRequest} ResizeRequest
         */
        ResizeRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.ResizeRequest)
                return object;
            let message = new $root.vtr.ResizeRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.ResizeRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            if (object.cols != null)
                message.cols = object.cols | 0;
            if (object.rows != null)
                message.rows = object.rows | 0;
            return message;
        };

        /**
         * Creates a plain object from a ResizeRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.ResizeRequest
         * @static
         * @param {vtr.ResizeRequest} message ResizeRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ResizeRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.session = null;
                object.cols = 0;
                object.rows = 0;
            }
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            if (message.cols != null && message.hasOwnProperty("cols"))
                object.cols = message.cols;
            if (message.rows != null && message.hasOwnProperty("rows"))
                object.rows = message.rows;
            return object;
        };

        /**
         * Converts this ResizeRequest to JSON.
         * @function toJSON
         * @memberof vtr.ResizeRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ResizeRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ResizeRequest
         * @function getTypeUrl
         * @memberof vtr.ResizeRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ResizeRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.ResizeRequest";
        };

        return ResizeRequest;
    })();

    vtr.ResizeResponse = (function() {

        /**
         * Properties of a ResizeResponse.
         * @memberof vtr
         * @interface IResizeResponse
         */

        /**
         * Constructs a new ResizeResponse.
         * @memberof vtr
         * @classdesc Represents a ResizeResponse.
         * @implements IResizeResponse
         * @constructor
         * @param {vtr.IResizeResponse=} [properties] Properties to set
         */
        function ResizeResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new ResizeResponse instance using the specified properties.
         * @function create
         * @memberof vtr.ResizeResponse
         * @static
         * @param {vtr.IResizeResponse=} [properties] Properties to set
         * @returns {vtr.ResizeResponse} ResizeResponse instance
         */
        ResizeResponse.create = function create(properties) {
            return new ResizeResponse(properties);
        };

        /**
         * Encodes the specified ResizeResponse message. Does not implicitly {@link vtr.ResizeResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.ResizeResponse
         * @static
         * @param {vtr.IResizeResponse} message ResizeResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ResizeResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified ResizeResponse message, length delimited. Does not implicitly {@link vtr.ResizeResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.ResizeResponse
         * @static
         * @param {vtr.IResizeResponse} message ResizeResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ResizeResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ResizeResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.ResizeResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.ResizeResponse} ResizeResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ResizeResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.ResizeResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ResizeResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.ResizeResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.ResizeResponse} ResizeResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ResizeResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ResizeResponse message.
         * @function verify
         * @memberof vtr.ResizeResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ResizeResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates a ResizeResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.ResizeResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.ResizeResponse} ResizeResponse
         */
        ResizeResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.ResizeResponse)
                return object;
            return new $root.vtr.ResizeResponse();
        };

        /**
         * Creates a plain object from a ResizeResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.ResizeResponse
         * @static
         * @param {vtr.ResizeResponse} message ResizeResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ResizeResponse.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this ResizeResponse to JSON.
         * @function toJSON
         * @memberof vtr.ResizeResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ResizeResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ResizeResponse
         * @function getTypeUrl
         * @memberof vtr.ResizeResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ResizeResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.ResizeResponse";
        };

        return ResizeResponse;
    })();

    vtr.WaitForRequest = (function() {

        /**
         * Properties of a WaitForRequest.
         * @memberof vtr
         * @interface IWaitForRequest
         * @property {vtr.ISessionRef|null} [session] WaitForRequest session
         * @property {string|null} [pattern] WaitForRequest pattern
         * @property {google.protobuf.IDuration|null} [timeout] WaitForRequest timeout
         */

        /**
         * Constructs a new WaitForRequest.
         * @memberof vtr
         * @classdesc Represents a WaitForRequest.
         * @implements IWaitForRequest
         * @constructor
         * @param {vtr.IWaitForRequest=} [properties] Properties to set
         */
        function WaitForRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * WaitForRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.WaitForRequest
         * @instance
         */
        WaitForRequest.prototype.session = null;

        /**
         * WaitForRequest pattern.
         * @member {string} pattern
         * @memberof vtr.WaitForRequest
         * @instance
         */
        WaitForRequest.prototype.pattern = "";

        /**
         * WaitForRequest timeout.
         * @member {google.protobuf.IDuration|null|undefined} timeout
         * @memberof vtr.WaitForRequest
         * @instance
         */
        WaitForRequest.prototype.timeout = null;

        /**
         * Creates a new WaitForRequest instance using the specified properties.
         * @function create
         * @memberof vtr.WaitForRequest
         * @static
         * @param {vtr.IWaitForRequest=} [properties] Properties to set
         * @returns {vtr.WaitForRequest} WaitForRequest instance
         */
        WaitForRequest.create = function create(properties) {
            return new WaitForRequest(properties);
        };

        /**
         * Encodes the specified WaitForRequest message. Does not implicitly {@link vtr.WaitForRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.WaitForRequest
         * @static
         * @param {vtr.IWaitForRequest} message WaitForRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        WaitForRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.pattern != null && Object.hasOwnProperty.call(message, "pattern"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.pattern);
            if (message.timeout != null && Object.hasOwnProperty.call(message, "timeout"))
                $root.google.protobuf.Duration.encode(message.timeout, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified WaitForRequest message, length delimited. Does not implicitly {@link vtr.WaitForRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.WaitForRequest
         * @static
         * @param {vtr.IWaitForRequest} message WaitForRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        WaitForRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a WaitForRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.WaitForRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.WaitForRequest} WaitForRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        WaitForRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.WaitForRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.pattern = reader.string();
                        break;
                    }
                case 3: {
                        message.timeout = $root.google.protobuf.Duration.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a WaitForRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.WaitForRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.WaitForRequest} WaitForRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        WaitForRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a WaitForRequest message.
         * @function verify
         * @memberof vtr.WaitForRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        WaitForRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            if (message.pattern != null && message.hasOwnProperty("pattern"))
                if (!$util.isString(message.pattern))
                    return "pattern: string expected";
            if (message.timeout != null && message.hasOwnProperty("timeout")) {
                let error = $root.google.protobuf.Duration.verify(message.timeout);
                if (error)
                    return "timeout." + error;
            }
            return null;
        };

        /**
         * Creates a WaitForRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.WaitForRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.WaitForRequest} WaitForRequest
         */
        WaitForRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.WaitForRequest)
                return object;
            let message = new $root.vtr.WaitForRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.WaitForRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            if (object.pattern != null)
                message.pattern = String(object.pattern);
            if (object.timeout != null) {
                if (typeof object.timeout !== "object")
                    throw TypeError(".vtr.WaitForRequest.timeout: object expected");
                message.timeout = $root.google.protobuf.Duration.fromObject(object.timeout);
            }
            return message;
        };

        /**
         * Creates a plain object from a WaitForRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.WaitForRequest
         * @static
         * @param {vtr.WaitForRequest} message WaitForRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        WaitForRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.session = null;
                object.pattern = "";
                object.timeout = null;
            }
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            if (message.pattern != null && message.hasOwnProperty("pattern"))
                object.pattern = message.pattern;
            if (message.timeout != null && message.hasOwnProperty("timeout"))
                object.timeout = $root.google.protobuf.Duration.toObject(message.timeout, options);
            return object;
        };

        /**
         * Converts this WaitForRequest to JSON.
         * @function toJSON
         * @memberof vtr.WaitForRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        WaitForRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for WaitForRequest
         * @function getTypeUrl
         * @memberof vtr.WaitForRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        WaitForRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.WaitForRequest";
        };

        return WaitForRequest;
    })();

    vtr.WaitForResponse = (function() {

        /**
         * Properties of a WaitForResponse.
         * @memberof vtr
         * @interface IWaitForResponse
         * @property {boolean|null} [matched] WaitForResponse matched
         * @property {string|null} [matched_line] WaitForResponse matched_line
         * @property {boolean|null} [timed_out] WaitForResponse timed_out
         */

        /**
         * Constructs a new WaitForResponse.
         * @memberof vtr
         * @classdesc Represents a WaitForResponse.
         * @implements IWaitForResponse
         * @constructor
         * @param {vtr.IWaitForResponse=} [properties] Properties to set
         */
        function WaitForResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * WaitForResponse matched.
         * @member {boolean} matched
         * @memberof vtr.WaitForResponse
         * @instance
         */
        WaitForResponse.prototype.matched = false;

        /**
         * WaitForResponse matched_line.
         * @member {string} matched_line
         * @memberof vtr.WaitForResponse
         * @instance
         */
        WaitForResponse.prototype.matched_line = "";

        /**
         * WaitForResponse timed_out.
         * @member {boolean} timed_out
         * @memberof vtr.WaitForResponse
         * @instance
         */
        WaitForResponse.prototype.timed_out = false;

        /**
         * Creates a new WaitForResponse instance using the specified properties.
         * @function create
         * @memberof vtr.WaitForResponse
         * @static
         * @param {vtr.IWaitForResponse=} [properties] Properties to set
         * @returns {vtr.WaitForResponse} WaitForResponse instance
         */
        WaitForResponse.create = function create(properties) {
            return new WaitForResponse(properties);
        };

        /**
         * Encodes the specified WaitForResponse message. Does not implicitly {@link vtr.WaitForResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.WaitForResponse
         * @static
         * @param {vtr.IWaitForResponse} message WaitForResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        WaitForResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.matched != null && Object.hasOwnProperty.call(message, "matched"))
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.matched);
            if (message.matched_line != null && Object.hasOwnProperty.call(message, "matched_line"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.matched_line);
            if (message.timed_out != null && Object.hasOwnProperty.call(message, "timed_out"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.timed_out);
            return writer;
        };

        /**
         * Encodes the specified WaitForResponse message, length delimited. Does not implicitly {@link vtr.WaitForResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.WaitForResponse
         * @static
         * @param {vtr.IWaitForResponse} message WaitForResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        WaitForResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a WaitForResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.WaitForResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.WaitForResponse} WaitForResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        WaitForResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.WaitForResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.matched = reader.bool();
                        break;
                    }
                case 2: {
                        message.matched_line = reader.string();
                        break;
                    }
                case 3: {
                        message.timed_out = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a WaitForResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.WaitForResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.WaitForResponse} WaitForResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        WaitForResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a WaitForResponse message.
         * @function verify
         * @memberof vtr.WaitForResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        WaitForResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.matched != null && message.hasOwnProperty("matched"))
                if (typeof message.matched !== "boolean")
                    return "matched: boolean expected";
            if (message.matched_line != null && message.hasOwnProperty("matched_line"))
                if (!$util.isString(message.matched_line))
                    return "matched_line: string expected";
            if (message.timed_out != null && message.hasOwnProperty("timed_out"))
                if (typeof message.timed_out !== "boolean")
                    return "timed_out: boolean expected";
            return null;
        };

        /**
         * Creates a WaitForResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.WaitForResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.WaitForResponse} WaitForResponse
         */
        WaitForResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.WaitForResponse)
                return object;
            let message = new $root.vtr.WaitForResponse();
            if (object.matched != null)
                message.matched = Boolean(object.matched);
            if (object.matched_line != null)
                message.matched_line = String(object.matched_line);
            if (object.timed_out != null)
                message.timed_out = Boolean(object.timed_out);
            return message;
        };

        /**
         * Creates a plain object from a WaitForResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.WaitForResponse
         * @static
         * @param {vtr.WaitForResponse} message WaitForResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        WaitForResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.matched = false;
                object.matched_line = "";
                object.timed_out = false;
            }
            if (message.matched != null && message.hasOwnProperty("matched"))
                object.matched = message.matched;
            if (message.matched_line != null && message.hasOwnProperty("matched_line"))
                object.matched_line = message.matched_line;
            if (message.timed_out != null && message.hasOwnProperty("timed_out"))
                object.timed_out = message.timed_out;
            return object;
        };

        /**
         * Converts this WaitForResponse to JSON.
         * @function toJSON
         * @memberof vtr.WaitForResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        WaitForResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for WaitForResponse
         * @function getTypeUrl
         * @memberof vtr.WaitForResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        WaitForResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.WaitForResponse";
        };

        return WaitForResponse;
    })();

    vtr.WaitForIdleRequest = (function() {

        /**
         * Properties of a WaitForIdleRequest.
         * @memberof vtr
         * @interface IWaitForIdleRequest
         * @property {vtr.ISessionRef|null} [session] WaitForIdleRequest session
         * @property {google.protobuf.IDuration|null} [idle_duration] WaitForIdleRequest idle_duration
         * @property {google.protobuf.IDuration|null} [timeout] WaitForIdleRequest timeout
         * @property {boolean|null} [include_screen] WaitForIdleRequest include_screen
         */

        /**
         * Constructs a new WaitForIdleRequest.
         * @memberof vtr
         * @classdesc Represents a WaitForIdleRequest.
         * @implements IWaitForIdleRequest
         * @constructor
         * @param {vtr.IWaitForIdleRequest=} [properties] Properties to set
         */
        function WaitForIdleRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * WaitForIdleRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.WaitForIdleRequest
         * @instance
         */
        WaitForIdleRequest.prototype.session = null;

        /**
         * WaitForIdleRequest idle_duration.
         * @member {google.protobuf.IDuration|null|undefined} idle_duration
         * @memberof vtr.WaitForIdleRequest
         * @instance
         */
        WaitForIdleRequest.prototype.idle_duration = null;

        /**
         * WaitForIdleRequest timeout.
         * @member {google.protobuf.IDuration|null|undefined} timeout
         * @memberof vtr.WaitForIdleRequest
         * @instance
         */
        WaitForIdleRequest.prototype.timeout = null;

        /**
         * WaitForIdleRequest include_screen.
         * @member {boolean} include_screen
         * @memberof vtr.WaitForIdleRequest
         * @instance
         */
        WaitForIdleRequest.prototype.include_screen = false;

        /**
         * Creates a new WaitForIdleRequest instance using the specified properties.
         * @function create
         * @memberof vtr.WaitForIdleRequest
         * @static
         * @param {vtr.IWaitForIdleRequest=} [properties] Properties to set
         * @returns {vtr.WaitForIdleRequest} WaitForIdleRequest instance
         */
        WaitForIdleRequest.create = function create(properties) {
            return new WaitForIdleRequest(properties);
        };

        /**
         * Encodes the specified WaitForIdleRequest message. Does not implicitly {@link vtr.WaitForIdleRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.WaitForIdleRequest
         * @static
         * @param {vtr.IWaitForIdleRequest} message WaitForIdleRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        WaitForIdleRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.idle_duration != null && Object.hasOwnProperty.call(message, "idle_duration"))
                $root.google.protobuf.Duration.encode(message.idle_duration, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.timeout != null && Object.hasOwnProperty.call(message, "timeout"))
                $root.google.protobuf.Duration.encode(message.timeout, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.include_screen != null && Object.hasOwnProperty.call(message, "include_screen"))
                writer.uint32(/* id 4, wireType 0 =*/32).bool(message.include_screen);
            return writer;
        };

        /**
         * Encodes the specified WaitForIdleRequest message, length delimited. Does not implicitly {@link vtr.WaitForIdleRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.WaitForIdleRequest
         * @static
         * @param {vtr.IWaitForIdleRequest} message WaitForIdleRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        WaitForIdleRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a WaitForIdleRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.WaitForIdleRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.WaitForIdleRequest} WaitForIdleRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        WaitForIdleRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.WaitForIdleRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.idle_duration = $root.google.protobuf.Duration.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.timeout = $root.google.protobuf.Duration.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.include_screen = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a WaitForIdleRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.WaitForIdleRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.WaitForIdleRequest} WaitForIdleRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        WaitForIdleRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a WaitForIdleRequest message.
         * @function verify
         * @memberof vtr.WaitForIdleRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        WaitForIdleRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            if (message.idle_duration != null && message.hasOwnProperty("idle_duration")) {
                let error = $root.google.protobuf.Duration.verify(message.idle_duration);
                if (error)
                    return "idle_duration." + error;
            }
            if (message.timeout != null && message.hasOwnProperty("timeout")) {
                let error = $root.google.protobuf.Duration.verify(message.timeout);
                if (error)
                    return "timeout." + error;
            }
            if (message.include_screen != null && message.hasOwnProperty("include_screen"))
                if (typeof message.include_screen !== "boolean")
                    return "include_screen: boolean expected";
            return null;
        };

        /**
         * Creates a WaitForIdleRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.WaitForIdleRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.WaitForIdleRequest} WaitForIdleRequest
         */
        WaitForIdleRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.WaitForIdleRequest)
                return object;
            let message = new $root.vtr.WaitForIdleRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.WaitForIdleRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            if (object.idle_duration != null) {
                if (typeof object.idle_duration !== "object")
                    throw TypeError(".vtr.WaitForIdleRequest.idle_duration: object expected");
                message.idle_duration = $root.google.protobuf.Duration.fromObject(object.idle_duration);
            }
            if (object.timeout != null) {
                if (typeof object.timeout !== "object")
                    throw TypeError(".vtr.WaitForIdleRequest.timeout: object expected");
                message.timeout = $root.google.protobuf.Duration.fromObject(object.timeout);
            }
            if (object.include_screen != null)
                message.include_screen = Boolean(object.include_screen);
            return message;
        };

        /**
         * Creates a plain object from a WaitForIdleRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.WaitForIdleRequest
         * @static
         * @param {vtr.WaitForIdleRequest} message WaitForIdleRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        WaitForIdleRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.session = null;
                object.idle_duration = null;
                object.timeout = null;
                object.include_screen = false;
            }
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            if (message.idle_duration != null && message.hasOwnProperty("idle_duration"))
                object.idle_duration = $root.google.protobuf.Duration.toObject(message.idle_duration, options);
            if (message.timeout != null && message.hasOwnProperty("timeout"))
                object.timeout = $root.google.protobuf.Duration.toObject(message.timeout, options);
            if (message.include_screen != null && message.hasOwnProperty("include_screen"))
                object.include_screen = message.include_screen;
            return object;
        };

        /**
         * Converts this WaitForIdleRequest to JSON.
         * @function toJSON
         * @memberof vtr.WaitForIdleRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        WaitForIdleRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for WaitForIdleRequest
         * @function getTypeUrl
         * @memberof vtr.WaitForIdleRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        WaitForIdleRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.WaitForIdleRequest";
        };

        return WaitForIdleRequest;
    })();

    vtr.WaitForIdleResponse = (function() {

        /**
         * Properties of a WaitForIdleResponse.
         * @memberof vtr
         * @interface IWaitForIdleResponse
         * @property {boolean|null} [idle] WaitForIdleResponse idle
         * @property {boolean|null} [timed_out] WaitForIdleResponse timed_out
         * @property {vtr.IGetScreenResponse|null} [screen] WaitForIdleResponse screen
         */

        /**
         * Constructs a new WaitForIdleResponse.
         * @memberof vtr
         * @classdesc Represents a WaitForIdleResponse.
         * @implements IWaitForIdleResponse
         * @constructor
         * @param {vtr.IWaitForIdleResponse=} [properties] Properties to set
         */
        function WaitForIdleResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * WaitForIdleResponse idle.
         * @member {boolean} idle
         * @memberof vtr.WaitForIdleResponse
         * @instance
         */
        WaitForIdleResponse.prototype.idle = false;

        /**
         * WaitForIdleResponse timed_out.
         * @member {boolean} timed_out
         * @memberof vtr.WaitForIdleResponse
         * @instance
         */
        WaitForIdleResponse.prototype.timed_out = false;

        /**
         * WaitForIdleResponse screen.
         * @member {vtr.IGetScreenResponse|null|undefined} screen
         * @memberof vtr.WaitForIdleResponse
         * @instance
         */
        WaitForIdleResponse.prototype.screen = null;

        /**
         * Creates a new WaitForIdleResponse instance using the specified properties.
         * @function create
         * @memberof vtr.WaitForIdleResponse
         * @static
         * @param {vtr.IWaitForIdleResponse=} [properties] Properties to set
         * @returns {vtr.WaitForIdleResponse} WaitForIdleResponse instance
         */
        WaitForIdleResponse.create = function create(properties) {
            return new WaitForIdleResponse(properties);
        };

        /**
         * Encodes the specified WaitForIdleResponse message. Does not implicitly {@link vtr.WaitForIdleResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.WaitForIdleResponse
         * @static
         * @param {vtr.IWaitForIdleResponse} message WaitForIdleResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        WaitForIdleResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.idle != null && Object.hasOwnProperty.call(message, "idle"))
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.idle);
            if (message.timed_out != null && Object.hasOwnProperty.call(message, "timed_out"))
                writer.uint32(/* id 2, wireType 0 =*/16).bool(message.timed_out);
            if (message.screen != null && Object.hasOwnProperty.call(message, "screen"))
                $root.vtr.GetScreenResponse.encode(message.screen, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified WaitForIdleResponse message, length delimited. Does not implicitly {@link vtr.WaitForIdleResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.WaitForIdleResponse
         * @static
         * @param {vtr.IWaitForIdleResponse} message WaitForIdleResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        WaitForIdleResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a WaitForIdleResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.WaitForIdleResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.WaitForIdleResponse} WaitForIdleResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        WaitForIdleResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.WaitForIdleResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.idle = reader.bool();
                        break;
                    }
                case 2: {
                        message.timed_out = reader.bool();
                        break;
                    }
                case 3: {
                        message.screen = $root.vtr.GetScreenResponse.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a WaitForIdleResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.WaitForIdleResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.WaitForIdleResponse} WaitForIdleResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        WaitForIdleResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a WaitForIdleResponse message.
         * @function verify
         * @memberof vtr.WaitForIdleResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        WaitForIdleResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.idle != null && message.hasOwnProperty("idle"))
                if (typeof message.idle !== "boolean")
                    return "idle: boolean expected";
            if (message.timed_out != null && message.hasOwnProperty("timed_out"))
                if (typeof message.timed_out !== "boolean")
                    return "timed_out: boolean expected";
            if (message.screen != null && message.hasOwnProperty("screen")) {
                let error = $root.vtr.GetScreenResponse.verify(message.screen);
                if (error)
                    return "screen." + error;
            }
            return null;
        };

        /**
         * Creates a WaitForIdleResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.WaitForIdleResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.WaitForIdleResponse} WaitForIdleResponse
         */
        WaitForIdleResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.WaitForIdleResponse)
                return object;
            let message = new $root.vtr.WaitForIdleResponse();
            if (object.idle != null)
                message.idle = Boolean(object.idle);
            if (object.timed_out != null)
                message.timed_out = Boolean(object.timed_out);
            if (object.screen != null) {
                if (typeof object.screen !== "object")
                    throw TypeError(".vtr.WaitForIdleResponse.screen: object expected");
                message.screen = $root.vtr.GetScreenResponse.fromObject(object.screen);
            }
            return message;
        };

        /**
         * Creates a plain object from a WaitForIdleResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.WaitForIdleResponse
         * @static
         * @param {vtr.WaitForIdleResponse} message WaitForIdleResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        WaitForIdleResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.idle = false;
                object.timed_out = false;
                object.screen = null;
            }
            if (message.idle != null && message.hasOwnProperty("idle"))
                object.idle = message.idle;
            if (message.timed_out != null && message.hasOwnProperty("timed_out"))
                object.timed_out = message.timed_out;
            if (message.screen != null && message.hasOwnProperty("screen"))
                object.screen = $root.vtr.GetScreenResponse.toObject(message.screen, options);
            return object;
        };

        /**
         * Converts this WaitForIdleResponse to JSON.
         * @function toJSON
         * @memberof vtr.WaitForIdleResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        WaitForIdleResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for WaitForIdleResponse
         * @function getTypeUrl
         * @memberof vtr.WaitForIdleResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        WaitForIdleResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.WaitForIdleResponse";
        };

        return WaitForIdleResponse;
    })();

    vtr.SubscribeRequest = (function() {

        /**
         * Properties of a SubscribeRequest.
         * @memberof vtr
         * @interface ISubscribeRequest
         * @property {vtr.ISessionRef|null} [session] SubscribeRequest session
         * @property {boolean|null} [include_screen_updates] SubscribeRequest include_screen_updates
         * @property {boolean|null} [include_raw_output] SubscribeRequest include_raw_output
         */

        /**
         * Constructs a new SubscribeRequest.
         * @memberof vtr
         * @classdesc Represents a SubscribeRequest.
         * @implements ISubscribeRequest
         * @constructor
         * @param {vtr.ISubscribeRequest=} [properties] Properties to set
         */
        function SubscribeRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SubscribeRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.SubscribeRequest
         * @instance
         */
        SubscribeRequest.prototype.session = null;

        /**
         * SubscribeRequest include_screen_updates.
         * @member {boolean} include_screen_updates
         * @memberof vtr.SubscribeRequest
         * @instance
         */
        SubscribeRequest.prototype.include_screen_updates = false;

        /**
         * SubscribeRequest include_raw_output.
         * @member {boolean} include_raw_output
         * @memberof vtr.SubscribeRequest
         * @instance
         */
        SubscribeRequest.prototype.include_raw_output = false;

        /**
         * Creates a new SubscribeRequest instance using the specified properties.
         * @function create
         * @memberof vtr.SubscribeRequest
         * @static
         * @param {vtr.ISubscribeRequest=} [properties] Properties to set
         * @returns {vtr.SubscribeRequest} SubscribeRequest instance
         */
        SubscribeRequest.create = function create(properties) {
            return new SubscribeRequest(properties);
        };

        /**
         * Encodes the specified SubscribeRequest message. Does not implicitly {@link vtr.SubscribeRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.SubscribeRequest
         * @static
         * @param {vtr.ISubscribeRequest} message SubscribeRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SubscribeRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.include_screen_updates != null && Object.hasOwnProperty.call(message, "include_screen_updates"))
                writer.uint32(/* id 2, wireType 0 =*/16).bool(message.include_screen_updates);
            if (message.include_raw_output != null && Object.hasOwnProperty.call(message, "include_raw_output"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.include_raw_output);
            return writer;
        };

        /**
         * Encodes the specified SubscribeRequest message, length delimited. Does not implicitly {@link vtr.SubscribeRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SubscribeRequest
         * @static
         * @param {vtr.ISubscribeRequest} message SubscribeRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SubscribeRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SubscribeRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SubscribeRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SubscribeRequest} SubscribeRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SubscribeRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SubscribeRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.include_screen_updates = reader.bool();
                        break;
                    }
                case 3: {
                        message.include_raw_output = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SubscribeRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SubscribeRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SubscribeRequest} SubscribeRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SubscribeRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SubscribeRequest message.
         * @function verify
         * @memberof vtr.SubscribeRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SubscribeRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            if (message.include_screen_updates != null && message.hasOwnProperty("include_screen_updates"))
                if (typeof message.include_screen_updates !== "boolean")
                    return "include_screen_updates: boolean expected";
            if (message.include_raw_output != null && message.hasOwnProperty("include_raw_output"))
                if (typeof message.include_raw_output !== "boolean")
                    return "include_raw_output: boolean expected";
            return null;
        };

        /**
         * Creates a SubscribeRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SubscribeRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SubscribeRequest} SubscribeRequest
         */
        SubscribeRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SubscribeRequest)
                return object;
            let message = new $root.vtr.SubscribeRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.SubscribeRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            if (object.include_screen_updates != null)
                message.include_screen_updates = Boolean(object.include_screen_updates);
            if (object.include_raw_output != null)
                message.include_raw_output = Boolean(object.include_raw_output);
            return message;
        };

        /**
         * Creates a plain object from a SubscribeRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SubscribeRequest
         * @static
         * @param {vtr.SubscribeRequest} message SubscribeRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SubscribeRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.session = null;
                object.include_screen_updates = false;
                object.include_raw_output = false;
            }
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            if (message.include_screen_updates != null && message.hasOwnProperty("include_screen_updates"))
                object.include_screen_updates = message.include_screen_updates;
            if (message.include_raw_output != null && message.hasOwnProperty("include_raw_output"))
                object.include_raw_output = message.include_raw_output;
            return object;
        };

        /**
         * Converts this SubscribeRequest to JSON.
         * @function toJSON
         * @memberof vtr.SubscribeRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SubscribeRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SubscribeRequest
         * @function getTypeUrl
         * @memberof vtr.SubscribeRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SubscribeRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SubscribeRequest";
        };

        return SubscribeRequest;
    })();

    vtr.ScreenUpdate = (function() {

        /**
         * Properties of a ScreenUpdate.
         * @memberof vtr
         * @interface IScreenUpdate
         * @property {number|Long|null} [frame_id] ScreenUpdate frame_id
         * @property {number|Long|null} [base_frame_id] ScreenUpdate base_frame_id
         * @property {boolean|null} [is_keyframe] ScreenUpdate is_keyframe
         * @property {vtr.IGetScreenResponse|null} [screen] ScreenUpdate screen
         * @property {vtr.IScreenDelta|null} [delta] ScreenUpdate delta
         */

        /**
         * Constructs a new ScreenUpdate.
         * @memberof vtr
         * @classdesc Represents a ScreenUpdate.
         * @implements IScreenUpdate
         * @constructor
         * @param {vtr.IScreenUpdate=} [properties] Properties to set
         */
        function ScreenUpdate(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ScreenUpdate frame_id.
         * @member {number|Long} frame_id
         * @memberof vtr.ScreenUpdate
         * @instance
         */
        ScreenUpdate.prototype.frame_id = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * ScreenUpdate base_frame_id.
         * @member {number|Long} base_frame_id
         * @memberof vtr.ScreenUpdate
         * @instance
         */
        ScreenUpdate.prototype.base_frame_id = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * ScreenUpdate is_keyframe.
         * @member {boolean} is_keyframe
         * @memberof vtr.ScreenUpdate
         * @instance
         */
        ScreenUpdate.prototype.is_keyframe = false;

        /**
         * ScreenUpdate screen.
         * @member {vtr.IGetScreenResponse|null|undefined} screen
         * @memberof vtr.ScreenUpdate
         * @instance
         */
        ScreenUpdate.prototype.screen = null;

        /**
         * ScreenUpdate delta.
         * @member {vtr.IScreenDelta|null|undefined} delta
         * @memberof vtr.ScreenUpdate
         * @instance
         */
        ScreenUpdate.prototype.delta = null;

        /**
         * Creates a new ScreenUpdate instance using the specified properties.
         * @function create
         * @memberof vtr.ScreenUpdate
         * @static
         * @param {vtr.IScreenUpdate=} [properties] Properties to set
         * @returns {vtr.ScreenUpdate} ScreenUpdate instance
         */
        ScreenUpdate.create = function create(properties) {
            return new ScreenUpdate(properties);
        };

        /**
         * Encodes the specified ScreenUpdate message. Does not implicitly {@link vtr.ScreenUpdate.verify|verify} messages.
         * @function encode
         * @memberof vtr.ScreenUpdate
         * @static
         * @param {vtr.IScreenUpdate} message ScreenUpdate message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ScreenUpdate.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.frame_id != null && Object.hasOwnProperty.call(message, "frame_id"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.frame_id);
            if (message.base_frame_id != null && Object.hasOwnProperty.call(message, "base_frame_id"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.base_frame_id);
            if (message.is_keyframe != null && Object.hasOwnProperty.call(message, "is_keyframe"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.is_keyframe);
            if (message.screen != null && Object.hasOwnProperty.call(message, "screen"))
                $root.vtr.GetScreenResponse.encode(message.screen, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.delta != null && Object.hasOwnProperty.call(message, "delta"))
                $root.vtr.ScreenDelta.encode(message.delta, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ScreenUpdate message, length delimited. Does not implicitly {@link vtr.ScreenUpdate.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.ScreenUpdate
         * @static
         * @param {vtr.IScreenUpdate} message ScreenUpdate message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ScreenUpdate.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ScreenUpdate message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.ScreenUpdate
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.ScreenUpdate} ScreenUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ScreenUpdate.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.ScreenUpdate();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.frame_id = reader.uint64();
                        break;
                    }
                case 2: {
                        message.base_frame_id = reader.uint64();
                        break;
                    }
                case 3: {
                        message.is_keyframe = reader.bool();
                        break;
                    }
                case 4: {
                        message.screen = $root.vtr.GetScreenResponse.decode(reader, reader.uint32());
                        break;
                    }
                case 5: {
                        message.delta = $root.vtr.ScreenDelta.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ScreenUpdate message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.ScreenUpdate
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.ScreenUpdate} ScreenUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ScreenUpdate.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ScreenUpdate message.
         * @function verify
         * @memberof vtr.ScreenUpdate
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ScreenUpdate.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.frame_id != null && message.hasOwnProperty("frame_id"))
                if (!$util.isInteger(message.frame_id) && !(message.frame_id && $util.isInteger(message.frame_id.low) && $util.isInteger(message.frame_id.high)))
                    return "frame_id: integer|Long expected";
            if (message.base_frame_id != null && message.hasOwnProperty("base_frame_id"))
                if (!$util.isInteger(message.base_frame_id) && !(message.base_frame_id && $util.isInteger(message.base_frame_id.low) && $util.isInteger(message.base_frame_id.high)))
                    return "base_frame_id: integer|Long expected";
            if (message.is_keyframe != null && message.hasOwnProperty("is_keyframe"))
                if (typeof message.is_keyframe !== "boolean")
                    return "is_keyframe: boolean expected";
            if (message.screen != null && message.hasOwnProperty("screen")) {
                let error = $root.vtr.GetScreenResponse.verify(message.screen);
                if (error)
                    return "screen." + error;
            }
            if (message.delta != null && message.hasOwnProperty("delta")) {
                let error = $root.vtr.ScreenDelta.verify(message.delta);
                if (error)
                    return "delta." + error;
            }
            return null;
        };

        /**
         * Creates a ScreenUpdate message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.ScreenUpdate
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.ScreenUpdate} ScreenUpdate
         */
        ScreenUpdate.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.ScreenUpdate)
                return object;
            let message = new $root.vtr.ScreenUpdate();
            if (object.frame_id != null)
                if ($util.Long)
                    (message.frame_id = $util.Long.fromValue(object.frame_id)).unsigned = true;
                else if (typeof object.frame_id === "string")
                    message.frame_id = parseInt(object.frame_id, 10);
                else if (typeof object.frame_id === "number")
                    message.frame_id = object.frame_id;
                else if (typeof object.frame_id === "object")
                    message.frame_id = new $util.LongBits(object.frame_id.low >>> 0, object.frame_id.high >>> 0).toNumber(true);
            if (object.base_frame_id != null)
                if ($util.Long)
                    (message.base_frame_id = $util.Long.fromValue(object.base_frame_id)).unsigned = true;
                else if (typeof object.base_frame_id === "string")
                    message.base_frame_id = parseInt(object.base_frame_id, 10);
                else if (typeof object.base_frame_id === "number")
                    message.base_frame_id = object.base_frame_id;
                else if (typeof object.base_frame_id === "object")
                    message.base_frame_id = new $util.LongBits(object.base_frame_id.low >>> 0, object.base_frame_id.high >>> 0).toNumber(true);
            if (object.is_keyframe != null)
                message.is_keyframe = Boolean(object.is_keyframe);
            if (object.screen != null) {
                if (typeof object.screen !== "object")
                    throw TypeError(".vtr.ScreenUpdate.screen: object expected");
                message.screen = $root.vtr.GetScreenResponse.fromObject(object.screen);
            }
            if (object.delta != null) {
                if (typeof object.delta !== "object")
                    throw TypeError(".vtr.ScreenUpdate.delta: object expected");
                message.delta = $root.vtr.ScreenDelta.fromObject(object.delta);
            }
            return message;
        };

        /**
         * Creates a plain object from a ScreenUpdate message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.ScreenUpdate
         * @static
         * @param {vtr.ScreenUpdate} message ScreenUpdate
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ScreenUpdate.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                if ($util.Long) {
                    let long = new $util.Long(0, 0, true);
                    object.frame_id = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.frame_id = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, true);
                    object.base_frame_id = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.base_frame_id = options.longs === String ? "0" : 0;
                object.is_keyframe = false;
                object.screen = null;
                object.delta = null;
            }
            if (message.frame_id != null && message.hasOwnProperty("frame_id"))
                if (typeof message.frame_id === "number")
                    object.frame_id = options.longs === String ? String(message.frame_id) : message.frame_id;
                else
                    object.frame_id = options.longs === String ? $util.Long.prototype.toString.call(message.frame_id) : options.longs === Number ? new $util.LongBits(message.frame_id.low >>> 0, message.frame_id.high >>> 0).toNumber(true) : message.frame_id;
            if (message.base_frame_id != null && message.hasOwnProperty("base_frame_id"))
                if (typeof message.base_frame_id === "number")
                    object.base_frame_id = options.longs === String ? String(message.base_frame_id) : message.base_frame_id;
                else
                    object.base_frame_id = options.longs === String ? $util.Long.prototype.toString.call(message.base_frame_id) : options.longs === Number ? new $util.LongBits(message.base_frame_id.low >>> 0, message.base_frame_id.high >>> 0).toNumber(true) : message.base_frame_id;
            if (message.is_keyframe != null && message.hasOwnProperty("is_keyframe"))
                object.is_keyframe = message.is_keyframe;
            if (message.screen != null && message.hasOwnProperty("screen"))
                object.screen = $root.vtr.GetScreenResponse.toObject(message.screen, options);
            if (message.delta != null && message.hasOwnProperty("delta"))
                object.delta = $root.vtr.ScreenDelta.toObject(message.delta, options);
            return object;
        };

        /**
         * Converts this ScreenUpdate to JSON.
         * @function toJSON
         * @memberof vtr.ScreenUpdate
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ScreenUpdate.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ScreenUpdate
         * @function getTypeUrl
         * @memberof vtr.ScreenUpdate
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ScreenUpdate.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.ScreenUpdate";
        };

        return ScreenUpdate;
    })();

    vtr.ScreenDelta = (function() {

        /**
         * Properties of a ScreenDelta.
         * @memberof vtr
         * @interface IScreenDelta
         * @property {number|null} [cols] ScreenDelta cols
         * @property {number|null} [rows] ScreenDelta rows
         * @property {number|null} [cursor_x] ScreenDelta cursor_x
         * @property {number|null} [cursor_y] ScreenDelta cursor_y
         * @property {Array.<vtr.IRowDelta>|null} [row_deltas] ScreenDelta row_deltas
         */

        /**
         * Constructs a new ScreenDelta.
         * @memberof vtr
         * @classdesc Represents a ScreenDelta.
         * @implements IScreenDelta
         * @constructor
         * @param {vtr.IScreenDelta=} [properties] Properties to set
         */
        function ScreenDelta(properties) {
            this.row_deltas = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ScreenDelta cols.
         * @member {number} cols
         * @memberof vtr.ScreenDelta
         * @instance
         */
        ScreenDelta.prototype.cols = 0;

        /**
         * ScreenDelta rows.
         * @member {number} rows
         * @memberof vtr.ScreenDelta
         * @instance
         */
        ScreenDelta.prototype.rows = 0;

        /**
         * ScreenDelta cursor_x.
         * @member {number} cursor_x
         * @memberof vtr.ScreenDelta
         * @instance
         */
        ScreenDelta.prototype.cursor_x = 0;

        /**
         * ScreenDelta cursor_y.
         * @member {number} cursor_y
         * @memberof vtr.ScreenDelta
         * @instance
         */
        ScreenDelta.prototype.cursor_y = 0;

        /**
         * ScreenDelta row_deltas.
         * @member {Array.<vtr.IRowDelta>} row_deltas
         * @memberof vtr.ScreenDelta
         * @instance
         */
        ScreenDelta.prototype.row_deltas = $util.emptyArray;

        /**
         * Creates a new ScreenDelta instance using the specified properties.
         * @function create
         * @memberof vtr.ScreenDelta
         * @static
         * @param {vtr.IScreenDelta=} [properties] Properties to set
         * @returns {vtr.ScreenDelta} ScreenDelta instance
         */
        ScreenDelta.create = function create(properties) {
            return new ScreenDelta(properties);
        };

        /**
         * Encodes the specified ScreenDelta message. Does not implicitly {@link vtr.ScreenDelta.verify|verify} messages.
         * @function encode
         * @memberof vtr.ScreenDelta
         * @static
         * @param {vtr.IScreenDelta} message ScreenDelta message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ScreenDelta.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.cols != null && Object.hasOwnProperty.call(message, "cols"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.cols);
            if (message.rows != null && Object.hasOwnProperty.call(message, "rows"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.rows);
            if (message.cursor_x != null && Object.hasOwnProperty.call(message, "cursor_x"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.cursor_x);
            if (message.cursor_y != null && Object.hasOwnProperty.call(message, "cursor_y"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.cursor_y);
            if (message.row_deltas != null && message.row_deltas.length)
                for (let i = 0; i < message.row_deltas.length; ++i)
                    $root.vtr.RowDelta.encode(message.row_deltas[i], writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ScreenDelta message, length delimited. Does not implicitly {@link vtr.ScreenDelta.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.ScreenDelta
         * @static
         * @param {vtr.IScreenDelta} message ScreenDelta message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ScreenDelta.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ScreenDelta message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.ScreenDelta
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.ScreenDelta} ScreenDelta
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ScreenDelta.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.ScreenDelta();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.cols = reader.int32();
                        break;
                    }
                case 2: {
                        message.rows = reader.int32();
                        break;
                    }
                case 3: {
                        message.cursor_x = reader.int32();
                        break;
                    }
                case 4: {
                        message.cursor_y = reader.int32();
                        break;
                    }
                case 5: {
                        if (!(message.row_deltas && message.row_deltas.length))
                            message.row_deltas = [];
                        message.row_deltas.push($root.vtr.RowDelta.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ScreenDelta message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.ScreenDelta
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.ScreenDelta} ScreenDelta
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ScreenDelta.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ScreenDelta message.
         * @function verify
         * @memberof vtr.ScreenDelta
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ScreenDelta.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.cols != null && message.hasOwnProperty("cols"))
                if (!$util.isInteger(message.cols))
                    return "cols: integer expected";
            if (message.rows != null && message.hasOwnProperty("rows"))
                if (!$util.isInteger(message.rows))
                    return "rows: integer expected";
            if (message.cursor_x != null && message.hasOwnProperty("cursor_x"))
                if (!$util.isInteger(message.cursor_x))
                    return "cursor_x: integer expected";
            if (message.cursor_y != null && message.hasOwnProperty("cursor_y"))
                if (!$util.isInteger(message.cursor_y))
                    return "cursor_y: integer expected";
            if (message.row_deltas != null && message.hasOwnProperty("row_deltas")) {
                if (!Array.isArray(message.row_deltas))
                    return "row_deltas: array expected";
                for (let i = 0; i < message.row_deltas.length; ++i) {
                    let error = $root.vtr.RowDelta.verify(message.row_deltas[i]);
                    if (error)
                        return "row_deltas." + error;
                }
            }
            return null;
        };

        /**
         * Creates a ScreenDelta message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.ScreenDelta
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.ScreenDelta} ScreenDelta
         */
        ScreenDelta.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.ScreenDelta)
                return object;
            let message = new $root.vtr.ScreenDelta();
            if (object.cols != null)
                message.cols = object.cols | 0;
            if (object.rows != null)
                message.rows = object.rows | 0;
            if (object.cursor_x != null)
                message.cursor_x = object.cursor_x | 0;
            if (object.cursor_y != null)
                message.cursor_y = object.cursor_y | 0;
            if (object.row_deltas) {
                if (!Array.isArray(object.row_deltas))
                    throw TypeError(".vtr.ScreenDelta.row_deltas: array expected");
                message.row_deltas = [];
                for (let i = 0; i < object.row_deltas.length; ++i) {
                    if (typeof object.row_deltas[i] !== "object")
                        throw TypeError(".vtr.ScreenDelta.row_deltas: object expected");
                    message.row_deltas[i] = $root.vtr.RowDelta.fromObject(object.row_deltas[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a ScreenDelta message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.ScreenDelta
         * @static
         * @param {vtr.ScreenDelta} message ScreenDelta
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ScreenDelta.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.row_deltas = [];
            if (options.defaults) {
                object.cols = 0;
                object.rows = 0;
                object.cursor_x = 0;
                object.cursor_y = 0;
            }
            if (message.cols != null && message.hasOwnProperty("cols"))
                object.cols = message.cols;
            if (message.rows != null && message.hasOwnProperty("rows"))
                object.rows = message.rows;
            if (message.cursor_x != null && message.hasOwnProperty("cursor_x"))
                object.cursor_x = message.cursor_x;
            if (message.cursor_y != null && message.hasOwnProperty("cursor_y"))
                object.cursor_y = message.cursor_y;
            if (message.row_deltas && message.row_deltas.length) {
                object.row_deltas = [];
                for (let j = 0; j < message.row_deltas.length; ++j)
                    object.row_deltas[j] = $root.vtr.RowDelta.toObject(message.row_deltas[j], options);
            }
            return object;
        };

        /**
         * Converts this ScreenDelta to JSON.
         * @function toJSON
         * @memberof vtr.ScreenDelta
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ScreenDelta.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ScreenDelta
         * @function getTypeUrl
         * @memberof vtr.ScreenDelta
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ScreenDelta.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.ScreenDelta";
        };

        return ScreenDelta;
    })();

    vtr.RowDelta = (function() {

        /**
         * Properties of a RowDelta.
         * @memberof vtr
         * @interface IRowDelta
         * @property {number|null} [row] RowDelta row
         * @property {vtr.IScreenRow|null} [row_data] RowDelta row_data
         */

        /**
         * Constructs a new RowDelta.
         * @memberof vtr
         * @classdesc Represents a RowDelta.
         * @implements IRowDelta
         * @constructor
         * @param {vtr.IRowDelta=} [properties] Properties to set
         */
        function RowDelta(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * RowDelta row.
         * @member {number} row
         * @memberof vtr.RowDelta
         * @instance
         */
        RowDelta.prototype.row = 0;

        /**
         * RowDelta row_data.
         * @member {vtr.IScreenRow|null|undefined} row_data
         * @memberof vtr.RowDelta
         * @instance
         */
        RowDelta.prototype.row_data = null;

        /**
         * Creates a new RowDelta instance using the specified properties.
         * @function create
         * @memberof vtr.RowDelta
         * @static
         * @param {vtr.IRowDelta=} [properties] Properties to set
         * @returns {vtr.RowDelta} RowDelta instance
         */
        RowDelta.create = function create(properties) {
            return new RowDelta(properties);
        };

        /**
         * Encodes the specified RowDelta message. Does not implicitly {@link vtr.RowDelta.verify|verify} messages.
         * @function encode
         * @memberof vtr.RowDelta
         * @static
         * @param {vtr.IRowDelta} message RowDelta message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RowDelta.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.row != null && Object.hasOwnProperty.call(message, "row"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.row);
            if (message.row_data != null && Object.hasOwnProperty.call(message, "row_data"))
                $root.vtr.ScreenRow.encode(message.row_data, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified RowDelta message, length delimited. Does not implicitly {@link vtr.RowDelta.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.RowDelta
         * @static
         * @param {vtr.IRowDelta} message RowDelta message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RowDelta.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RowDelta message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.RowDelta
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.RowDelta} RowDelta
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RowDelta.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.RowDelta();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.row = reader.int32();
                        break;
                    }
                case 2: {
                        message.row_data = $root.vtr.ScreenRow.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a RowDelta message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.RowDelta
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.RowDelta} RowDelta
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RowDelta.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a RowDelta message.
         * @function verify
         * @memberof vtr.RowDelta
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        RowDelta.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.row != null && message.hasOwnProperty("row"))
                if (!$util.isInteger(message.row))
                    return "row: integer expected";
            if (message.row_data != null && message.hasOwnProperty("row_data")) {
                let error = $root.vtr.ScreenRow.verify(message.row_data);
                if (error)
                    return "row_data." + error;
            }
            return null;
        };

        /**
         * Creates a RowDelta message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.RowDelta
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.RowDelta} RowDelta
         */
        RowDelta.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.RowDelta)
                return object;
            let message = new $root.vtr.RowDelta();
            if (object.row != null)
                message.row = object.row | 0;
            if (object.row_data != null) {
                if (typeof object.row_data !== "object")
                    throw TypeError(".vtr.RowDelta.row_data: object expected");
                message.row_data = $root.vtr.ScreenRow.fromObject(object.row_data);
            }
            return message;
        };

        /**
         * Creates a plain object from a RowDelta message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.RowDelta
         * @static
         * @param {vtr.RowDelta} message RowDelta
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        RowDelta.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.row = 0;
                object.row_data = null;
            }
            if (message.row != null && message.hasOwnProperty("row"))
                object.row = message.row;
            if (message.row_data != null && message.hasOwnProperty("row_data"))
                object.row_data = $root.vtr.ScreenRow.toObject(message.row_data, options);
            return object;
        };

        /**
         * Converts this RowDelta to JSON.
         * @function toJSON
         * @memberof vtr.RowDelta
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        RowDelta.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for RowDelta
         * @function getTypeUrl
         * @memberof vtr.RowDelta
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        RowDelta.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.RowDelta";
        };

        return RowDelta;
    })();

    vtr.SessionExited = (function() {

        /**
         * Properties of a SessionExited.
         * @memberof vtr
         * @interface ISessionExited
         * @property {number|null} [exit_code] SessionExited exit_code
         * @property {string|null} [id] SessionExited id
         */

        /**
         * Constructs a new SessionExited.
         * @memberof vtr
         * @classdesc Represents a SessionExited.
         * @implements ISessionExited
         * @constructor
         * @param {vtr.ISessionExited=} [properties] Properties to set
         */
        function SessionExited(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SessionExited exit_code.
         * @member {number} exit_code
         * @memberof vtr.SessionExited
         * @instance
         */
        SessionExited.prototype.exit_code = 0;

        /**
         * SessionExited id.
         * @member {string} id
         * @memberof vtr.SessionExited
         * @instance
         */
        SessionExited.prototype.id = "";

        /**
         * Creates a new SessionExited instance using the specified properties.
         * @function create
         * @memberof vtr.SessionExited
         * @static
         * @param {vtr.ISessionExited=} [properties] Properties to set
         * @returns {vtr.SessionExited} SessionExited instance
         */
        SessionExited.create = function create(properties) {
            return new SessionExited(properties);
        };

        /**
         * Encodes the specified SessionExited message. Does not implicitly {@link vtr.SessionExited.verify|verify} messages.
         * @function encode
         * @memberof vtr.SessionExited
         * @static
         * @param {vtr.ISessionExited} message SessionExited message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionExited.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.exit_code != null && Object.hasOwnProperty.call(message, "exit_code"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.exit_code);
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.id);
            return writer;
        };

        /**
         * Encodes the specified SessionExited message, length delimited. Does not implicitly {@link vtr.SessionExited.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SessionExited
         * @static
         * @param {vtr.ISessionExited} message SessionExited message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionExited.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SessionExited message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SessionExited
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SessionExited} SessionExited
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionExited.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SessionExited();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.exit_code = reader.int32();
                        break;
                    }
                case 2: {
                        message.id = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SessionExited message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SessionExited
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SessionExited} SessionExited
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionExited.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SessionExited message.
         * @function verify
         * @memberof vtr.SessionExited
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SessionExited.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.exit_code != null && message.hasOwnProperty("exit_code"))
                if (!$util.isInteger(message.exit_code))
                    return "exit_code: integer expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            return null;
        };

        /**
         * Creates a SessionExited message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SessionExited
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SessionExited} SessionExited
         */
        SessionExited.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SessionExited)
                return object;
            let message = new $root.vtr.SessionExited();
            if (object.exit_code != null)
                message.exit_code = object.exit_code | 0;
            if (object.id != null)
                message.id = String(object.id);
            return message;
        };

        /**
         * Creates a plain object from a SessionExited message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SessionExited
         * @static
         * @param {vtr.SessionExited} message SessionExited
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SessionExited.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.exit_code = 0;
                object.id = "";
            }
            if (message.exit_code != null && message.hasOwnProperty("exit_code"))
                object.exit_code = message.exit_code;
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            return object;
        };

        /**
         * Converts this SessionExited to JSON.
         * @function toJSON
         * @memberof vtr.SessionExited
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SessionExited.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SessionExited
         * @function getTypeUrl
         * @memberof vtr.SessionExited
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SessionExited.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SessionExited";
        };

        return SessionExited;
    })();

    vtr.SessionIdle = (function() {

        /**
         * Properties of a SessionIdle.
         * @memberof vtr
         * @interface ISessionIdle
         * @property {string|null} [name] SessionIdle name
         * @property {boolean|null} [idle] SessionIdle idle
         * @property {string|null} [id] SessionIdle id
         */

        /**
         * Constructs a new SessionIdle.
         * @memberof vtr
         * @classdesc Represents a SessionIdle.
         * @implements ISessionIdle
         * @constructor
         * @param {vtr.ISessionIdle=} [properties] Properties to set
         */
        function SessionIdle(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SessionIdle name.
         * @member {string} name
         * @memberof vtr.SessionIdle
         * @instance
         */
        SessionIdle.prototype.name = "";

        /**
         * SessionIdle idle.
         * @member {boolean} idle
         * @memberof vtr.SessionIdle
         * @instance
         */
        SessionIdle.prototype.idle = false;

        /**
         * SessionIdle id.
         * @member {string} id
         * @memberof vtr.SessionIdle
         * @instance
         */
        SessionIdle.prototype.id = "";

        /**
         * Creates a new SessionIdle instance using the specified properties.
         * @function create
         * @memberof vtr.SessionIdle
         * @static
         * @param {vtr.ISessionIdle=} [properties] Properties to set
         * @returns {vtr.SessionIdle} SessionIdle instance
         */
        SessionIdle.create = function create(properties) {
            return new SessionIdle(properties);
        };

        /**
         * Encodes the specified SessionIdle message. Does not implicitly {@link vtr.SessionIdle.verify|verify} messages.
         * @function encode
         * @memberof vtr.SessionIdle
         * @static
         * @param {vtr.ISessionIdle} message SessionIdle message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionIdle.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
            if (message.idle != null && Object.hasOwnProperty.call(message, "idle"))
                writer.uint32(/* id 2, wireType 0 =*/16).bool(message.idle);
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.id);
            return writer;
        };

        /**
         * Encodes the specified SessionIdle message, length delimited. Does not implicitly {@link vtr.SessionIdle.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SessionIdle
         * @static
         * @param {vtr.ISessionIdle} message SessionIdle message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionIdle.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SessionIdle message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SessionIdle
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SessionIdle} SessionIdle
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionIdle.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SessionIdle();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.name = reader.string();
                        break;
                    }
                case 2: {
                        message.idle = reader.bool();
                        break;
                    }
                case 3: {
                        message.id = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SessionIdle message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SessionIdle
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SessionIdle} SessionIdle
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionIdle.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SessionIdle message.
         * @function verify
         * @memberof vtr.SessionIdle
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SessionIdle.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            if (message.idle != null && message.hasOwnProperty("idle"))
                if (typeof message.idle !== "boolean")
                    return "idle: boolean expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            return null;
        };

        /**
         * Creates a SessionIdle message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SessionIdle
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SessionIdle} SessionIdle
         */
        SessionIdle.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SessionIdle)
                return object;
            let message = new $root.vtr.SessionIdle();
            if (object.name != null)
                message.name = String(object.name);
            if (object.idle != null)
                message.idle = Boolean(object.idle);
            if (object.id != null)
                message.id = String(object.id);
            return message;
        };

        /**
         * Creates a plain object from a SessionIdle message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SessionIdle
         * @static
         * @param {vtr.SessionIdle} message SessionIdle
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SessionIdle.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.name = "";
                object.idle = false;
                object.id = "";
            }
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            if (message.idle != null && message.hasOwnProperty("idle"))
                object.idle = message.idle;
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            return object;
        };

        /**
         * Converts this SessionIdle to JSON.
         * @function toJSON
         * @memberof vtr.SessionIdle
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SessionIdle.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SessionIdle
         * @function getTypeUrl
         * @memberof vtr.SessionIdle
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SessionIdle.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SessionIdle";
        };

        return SessionIdle;
    })();

    vtr.SubscribeEvent = (function() {

        /**
         * Properties of a SubscribeEvent.
         * @memberof vtr
         * @interface ISubscribeEvent
         * @property {vtr.IScreenUpdate|null} [screen_update] SubscribeEvent screen_update
         * @property {Uint8Array|null} [raw_output] SubscribeEvent raw_output
         * @property {vtr.ISessionExited|null} [session_exited] SubscribeEvent session_exited
         * @property {vtr.ISessionIdle|null} [session_idle] SubscribeEvent session_idle
         */

        /**
         * Constructs a new SubscribeEvent.
         * @memberof vtr
         * @classdesc Represents a SubscribeEvent.
         * @implements ISubscribeEvent
         * @constructor
         * @param {vtr.ISubscribeEvent=} [properties] Properties to set
         */
        function SubscribeEvent(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SubscribeEvent screen_update.
         * @member {vtr.IScreenUpdate|null|undefined} screen_update
         * @memberof vtr.SubscribeEvent
         * @instance
         */
        SubscribeEvent.prototype.screen_update = null;

        /**
         * SubscribeEvent raw_output.
         * @member {Uint8Array|null|undefined} raw_output
         * @memberof vtr.SubscribeEvent
         * @instance
         */
        SubscribeEvent.prototype.raw_output = null;

        /**
         * SubscribeEvent session_exited.
         * @member {vtr.ISessionExited|null|undefined} session_exited
         * @memberof vtr.SubscribeEvent
         * @instance
         */
        SubscribeEvent.prototype.session_exited = null;

        /**
         * SubscribeEvent session_idle.
         * @member {vtr.ISessionIdle|null|undefined} session_idle
         * @memberof vtr.SubscribeEvent
         * @instance
         */
        SubscribeEvent.prototype.session_idle = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * SubscribeEvent event.
         * @member {"screen_update"|"raw_output"|"session_exited"|"session_idle"|undefined} event
         * @memberof vtr.SubscribeEvent
         * @instance
         */
        Object.defineProperty(SubscribeEvent.prototype, "event", {
            get: $util.oneOfGetter($oneOfFields = ["screen_update", "raw_output", "session_exited", "session_idle"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new SubscribeEvent instance using the specified properties.
         * @function create
         * @memberof vtr.SubscribeEvent
         * @static
         * @param {vtr.ISubscribeEvent=} [properties] Properties to set
         * @returns {vtr.SubscribeEvent} SubscribeEvent instance
         */
        SubscribeEvent.create = function create(properties) {
            return new SubscribeEvent(properties);
        };

        /**
         * Encodes the specified SubscribeEvent message. Does not implicitly {@link vtr.SubscribeEvent.verify|verify} messages.
         * @function encode
         * @memberof vtr.SubscribeEvent
         * @static
         * @param {vtr.ISubscribeEvent} message SubscribeEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SubscribeEvent.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.screen_update != null && Object.hasOwnProperty.call(message, "screen_update"))
                $root.vtr.ScreenUpdate.encode(message.screen_update, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.raw_output != null && Object.hasOwnProperty.call(message, "raw_output"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.raw_output);
            if (message.session_exited != null && Object.hasOwnProperty.call(message, "session_exited"))
                $root.vtr.SessionExited.encode(message.session_exited, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.session_idle != null && Object.hasOwnProperty.call(message, "session_idle"))
                $root.vtr.SessionIdle.encode(message.session_idle, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified SubscribeEvent message, length delimited. Does not implicitly {@link vtr.SubscribeEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.SubscribeEvent
         * @static
         * @param {vtr.ISubscribeEvent} message SubscribeEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SubscribeEvent.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SubscribeEvent message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.SubscribeEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.SubscribeEvent} SubscribeEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SubscribeEvent.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.SubscribeEvent();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.screen_update = $root.vtr.ScreenUpdate.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.raw_output = reader.bytes();
                        break;
                    }
                case 3: {
                        message.session_exited = $root.vtr.SessionExited.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.session_idle = $root.vtr.SessionIdle.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SubscribeEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.SubscribeEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.SubscribeEvent} SubscribeEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SubscribeEvent.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SubscribeEvent message.
         * @function verify
         * @memberof vtr.SubscribeEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SubscribeEvent.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.screen_update != null && message.hasOwnProperty("screen_update")) {
                properties.event = 1;
                {
                    let error = $root.vtr.ScreenUpdate.verify(message.screen_update);
                    if (error)
                        return "screen_update." + error;
                }
            }
            if (message.raw_output != null && message.hasOwnProperty("raw_output")) {
                if (properties.event === 1)
                    return "event: multiple values";
                properties.event = 1;
                if (!(message.raw_output && typeof message.raw_output.length === "number" || $util.isString(message.raw_output)))
                    return "raw_output: buffer expected";
            }
            if (message.session_exited != null && message.hasOwnProperty("session_exited")) {
                if (properties.event === 1)
                    return "event: multiple values";
                properties.event = 1;
                {
                    let error = $root.vtr.SessionExited.verify(message.session_exited);
                    if (error)
                        return "session_exited." + error;
                }
            }
            if (message.session_idle != null && message.hasOwnProperty("session_idle")) {
                if (properties.event === 1)
                    return "event: multiple values";
                properties.event = 1;
                {
                    let error = $root.vtr.SessionIdle.verify(message.session_idle);
                    if (error)
                        return "session_idle." + error;
                }
            }
            return null;
        };

        /**
         * Creates a SubscribeEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.SubscribeEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.SubscribeEvent} SubscribeEvent
         */
        SubscribeEvent.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.SubscribeEvent)
                return object;
            let message = new $root.vtr.SubscribeEvent();
            if (object.screen_update != null) {
                if (typeof object.screen_update !== "object")
                    throw TypeError(".vtr.SubscribeEvent.screen_update: object expected");
                message.screen_update = $root.vtr.ScreenUpdate.fromObject(object.screen_update);
            }
            if (object.raw_output != null)
                if (typeof object.raw_output === "string")
                    $util.base64.decode(object.raw_output, message.raw_output = $util.newBuffer($util.base64.length(object.raw_output)), 0);
                else if (object.raw_output.length >= 0)
                    message.raw_output = object.raw_output;
            if (object.session_exited != null) {
                if (typeof object.session_exited !== "object")
                    throw TypeError(".vtr.SubscribeEvent.session_exited: object expected");
                message.session_exited = $root.vtr.SessionExited.fromObject(object.session_exited);
            }
            if (object.session_idle != null) {
                if (typeof object.session_idle !== "object")
                    throw TypeError(".vtr.SubscribeEvent.session_idle: object expected");
                message.session_idle = $root.vtr.SessionIdle.fromObject(object.session_idle);
            }
            return message;
        };

        /**
         * Creates a plain object from a SubscribeEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.SubscribeEvent
         * @static
         * @param {vtr.SubscribeEvent} message SubscribeEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SubscribeEvent.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (message.screen_update != null && message.hasOwnProperty("screen_update")) {
                object.screen_update = $root.vtr.ScreenUpdate.toObject(message.screen_update, options);
                if (options.oneofs)
                    object.event = "screen_update";
            }
            if (message.raw_output != null && message.hasOwnProperty("raw_output")) {
                object.raw_output = options.bytes === String ? $util.base64.encode(message.raw_output, 0, message.raw_output.length) : options.bytes === Array ? Array.prototype.slice.call(message.raw_output) : message.raw_output;
                if (options.oneofs)
                    object.event = "raw_output";
            }
            if (message.session_exited != null && message.hasOwnProperty("session_exited")) {
                object.session_exited = $root.vtr.SessionExited.toObject(message.session_exited, options);
                if (options.oneofs)
                    object.event = "session_exited";
            }
            if (message.session_idle != null && message.hasOwnProperty("session_idle")) {
                object.session_idle = $root.vtr.SessionIdle.toObject(message.session_idle, options);
                if (options.oneofs)
                    object.event = "session_idle";
            }
            return object;
        };

        /**
         * Converts this SubscribeEvent to JSON.
         * @function toJSON
         * @memberof vtr.SubscribeEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SubscribeEvent.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SubscribeEvent
         * @function getTypeUrl
         * @memberof vtr.SubscribeEvent
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SubscribeEvent.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.SubscribeEvent";
        };

        return SubscribeEvent;
    })();

    vtr.DumpAsciinemaRequest = (function() {

        /**
         * Properties of a DumpAsciinemaRequest.
         * @memberof vtr
         * @interface IDumpAsciinemaRequest
         * @property {vtr.ISessionRef|null} [session] DumpAsciinemaRequest session
         */

        /**
         * Constructs a new DumpAsciinemaRequest.
         * @memberof vtr
         * @classdesc Represents a DumpAsciinemaRequest.
         * @implements IDumpAsciinemaRequest
         * @constructor
         * @param {vtr.IDumpAsciinemaRequest=} [properties] Properties to set
         */
        function DumpAsciinemaRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DumpAsciinemaRequest session.
         * @member {vtr.ISessionRef|null|undefined} session
         * @memberof vtr.DumpAsciinemaRequest
         * @instance
         */
        DumpAsciinemaRequest.prototype.session = null;

        /**
         * Creates a new DumpAsciinemaRequest instance using the specified properties.
         * @function create
         * @memberof vtr.DumpAsciinemaRequest
         * @static
         * @param {vtr.IDumpAsciinemaRequest=} [properties] Properties to set
         * @returns {vtr.DumpAsciinemaRequest} DumpAsciinemaRequest instance
         */
        DumpAsciinemaRequest.create = function create(properties) {
            return new DumpAsciinemaRequest(properties);
        };

        /**
         * Encodes the specified DumpAsciinemaRequest message. Does not implicitly {@link vtr.DumpAsciinemaRequest.verify|verify} messages.
         * @function encode
         * @memberof vtr.DumpAsciinemaRequest
         * @static
         * @param {vtr.IDumpAsciinemaRequest} message DumpAsciinemaRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DumpAsciinemaRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                $root.vtr.SessionRef.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified DumpAsciinemaRequest message, length delimited. Does not implicitly {@link vtr.DumpAsciinemaRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.DumpAsciinemaRequest
         * @static
         * @param {vtr.IDumpAsciinemaRequest} message DumpAsciinemaRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DumpAsciinemaRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DumpAsciinemaRequest message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.DumpAsciinemaRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.DumpAsciinemaRequest} DumpAsciinemaRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DumpAsciinemaRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.DumpAsciinemaRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.session = $root.vtr.SessionRef.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DumpAsciinemaRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.DumpAsciinemaRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.DumpAsciinemaRequest} DumpAsciinemaRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DumpAsciinemaRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DumpAsciinemaRequest message.
         * @function verify
         * @memberof vtr.DumpAsciinemaRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DumpAsciinemaRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.session != null && message.hasOwnProperty("session")) {
                let error = $root.vtr.SessionRef.verify(message.session);
                if (error)
                    return "session." + error;
            }
            return null;
        };

        /**
         * Creates a DumpAsciinemaRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.DumpAsciinemaRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.DumpAsciinemaRequest} DumpAsciinemaRequest
         */
        DumpAsciinemaRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.DumpAsciinemaRequest)
                return object;
            let message = new $root.vtr.DumpAsciinemaRequest();
            if (object.session != null) {
                if (typeof object.session !== "object")
                    throw TypeError(".vtr.DumpAsciinemaRequest.session: object expected");
                message.session = $root.vtr.SessionRef.fromObject(object.session);
            }
            return message;
        };

        /**
         * Creates a plain object from a DumpAsciinemaRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.DumpAsciinemaRequest
         * @static
         * @param {vtr.DumpAsciinemaRequest} message DumpAsciinemaRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DumpAsciinemaRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.session = null;
            if (message.session != null && message.hasOwnProperty("session"))
                object.session = $root.vtr.SessionRef.toObject(message.session, options);
            return object;
        };

        /**
         * Converts this DumpAsciinemaRequest to JSON.
         * @function toJSON
         * @memberof vtr.DumpAsciinemaRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DumpAsciinemaRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DumpAsciinemaRequest
         * @function getTypeUrl
         * @memberof vtr.DumpAsciinemaRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DumpAsciinemaRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.DumpAsciinemaRequest";
        };

        return DumpAsciinemaRequest;
    })();

    vtr.DumpAsciinemaResponse = (function() {

        /**
         * Properties of a DumpAsciinemaResponse.
         * @memberof vtr
         * @interface IDumpAsciinemaResponse
         * @property {Uint8Array|null} [data] DumpAsciinemaResponse data
         */

        /**
         * Constructs a new DumpAsciinemaResponse.
         * @memberof vtr
         * @classdesc Represents a DumpAsciinemaResponse.
         * @implements IDumpAsciinemaResponse
         * @constructor
         * @param {vtr.IDumpAsciinemaResponse=} [properties] Properties to set
         */
        function DumpAsciinemaResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DumpAsciinemaResponse data.
         * @member {Uint8Array} data
         * @memberof vtr.DumpAsciinemaResponse
         * @instance
         */
        DumpAsciinemaResponse.prototype.data = $util.newBuffer([]);

        /**
         * Creates a new DumpAsciinemaResponse instance using the specified properties.
         * @function create
         * @memberof vtr.DumpAsciinemaResponse
         * @static
         * @param {vtr.IDumpAsciinemaResponse=} [properties] Properties to set
         * @returns {vtr.DumpAsciinemaResponse} DumpAsciinemaResponse instance
         */
        DumpAsciinemaResponse.create = function create(properties) {
            return new DumpAsciinemaResponse(properties);
        };

        /**
         * Encodes the specified DumpAsciinemaResponse message. Does not implicitly {@link vtr.DumpAsciinemaResponse.verify|verify} messages.
         * @function encode
         * @memberof vtr.DumpAsciinemaResponse
         * @static
         * @param {vtr.IDumpAsciinemaResponse} message DumpAsciinemaResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DumpAsciinemaResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.data);
            return writer;
        };

        /**
         * Encodes the specified DumpAsciinemaResponse message, length delimited. Does not implicitly {@link vtr.DumpAsciinemaResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof vtr.DumpAsciinemaResponse
         * @static
         * @param {vtr.IDumpAsciinemaResponse} message DumpAsciinemaResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DumpAsciinemaResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DumpAsciinemaResponse message from the specified reader or buffer.
         * @function decode
         * @memberof vtr.DumpAsciinemaResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {vtr.DumpAsciinemaResponse} DumpAsciinemaResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DumpAsciinemaResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.vtr.DumpAsciinemaResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.data = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DumpAsciinemaResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof vtr.DumpAsciinemaResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {vtr.DumpAsciinemaResponse} DumpAsciinemaResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DumpAsciinemaResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DumpAsciinemaResponse message.
         * @function verify
         * @memberof vtr.DumpAsciinemaResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DumpAsciinemaResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.data != null && message.hasOwnProperty("data"))
                if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                    return "data: buffer expected";
            return null;
        };

        /**
         * Creates a DumpAsciinemaResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof vtr.DumpAsciinemaResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {vtr.DumpAsciinemaResponse} DumpAsciinemaResponse
         */
        DumpAsciinemaResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.vtr.DumpAsciinemaResponse)
                return object;
            let message = new $root.vtr.DumpAsciinemaResponse();
            if (object.data != null)
                if (typeof object.data === "string")
                    $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
                else if (object.data.length >= 0)
                    message.data = object.data;
            return message;
        };

        /**
         * Creates a plain object from a DumpAsciinemaResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof vtr.DumpAsciinemaResponse
         * @static
         * @param {vtr.DumpAsciinemaResponse} message DumpAsciinemaResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DumpAsciinemaResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                if (options.bytes === String)
                    object.data = "";
                else {
                    object.data = [];
                    if (options.bytes !== Array)
                        object.data = $util.newBuffer(object.data);
                }
            if (message.data != null && message.hasOwnProperty("data"))
                object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
            return object;
        };

        /**
         * Converts this DumpAsciinemaResponse to JSON.
         * @function toJSON
         * @memberof vtr.DumpAsciinemaResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DumpAsciinemaResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DumpAsciinemaResponse
         * @function getTypeUrl
         * @memberof vtr.DumpAsciinemaResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DumpAsciinemaResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vtr.DumpAsciinemaResponse";
        };

        return DumpAsciinemaResponse;
    })();

    return vtr;
})();

export const google = $root.google = (() => {

    /**
     * Namespace google.
     * @exports google
     * @namespace
     */
    const google = {};

    google.protobuf = (function() {

        /**
         * Namespace protobuf.
         * @memberof google
         * @namespace
         */
        const protobuf = {};

        protobuf.Timestamp = (function() {

            /**
             * Properties of a Timestamp.
             * @memberof google.protobuf
             * @interface ITimestamp
             * @property {number|Long|null} [seconds] Timestamp seconds
             * @property {number|null} [nanos] Timestamp nanos
             */

            /**
             * Constructs a new Timestamp.
             * @memberof google.protobuf
             * @classdesc Represents a Timestamp.
             * @implements ITimestamp
             * @constructor
             * @param {google.protobuf.ITimestamp=} [properties] Properties to set
             */
            function Timestamp(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Timestamp seconds.
             * @member {number|Long} seconds
             * @memberof google.protobuf.Timestamp
             * @instance
             */
            Timestamp.prototype.seconds = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Timestamp nanos.
             * @member {number} nanos
             * @memberof google.protobuf.Timestamp
             * @instance
             */
            Timestamp.prototype.nanos = 0;

            /**
             * Creates a new Timestamp instance using the specified properties.
             * @function create
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp=} [properties] Properties to set
             * @returns {google.protobuf.Timestamp} Timestamp instance
             */
            Timestamp.create = function create(properties) {
                return new Timestamp(properties);
            };

            /**
             * Encodes the specified Timestamp message. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @function encode
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp} message Timestamp message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Timestamp.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.seconds != null && Object.hasOwnProperty.call(message, "seconds"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.seconds);
                if (message.nanos != null && Object.hasOwnProperty.call(message, "nanos"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.nanos);
                return writer;
            };

            /**
             * Encodes the specified Timestamp message, length delimited. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @function encodeDelimited
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp} message Timestamp message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Timestamp.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Timestamp message from the specified reader or buffer.
             * @function decode
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {google.protobuf.Timestamp} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Timestamp.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.google.protobuf.Timestamp();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.seconds = reader.int64();
                            break;
                        }
                    case 2: {
                            message.nanos = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Timestamp message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {google.protobuf.Timestamp} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Timestamp.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Timestamp message.
             * @function verify
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Timestamp.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.seconds != null && message.hasOwnProperty("seconds"))
                    if (!$util.isInteger(message.seconds) && !(message.seconds && $util.isInteger(message.seconds.low) && $util.isInteger(message.seconds.high)))
                        return "seconds: integer|Long expected";
                if (message.nanos != null && message.hasOwnProperty("nanos"))
                    if (!$util.isInteger(message.nanos))
                        return "nanos: integer expected";
                return null;
            };

            /**
             * Creates a Timestamp message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {google.protobuf.Timestamp} Timestamp
             */
            Timestamp.fromObject = function fromObject(object) {
                if (object instanceof $root.google.protobuf.Timestamp)
                    return object;
                let message = new $root.google.protobuf.Timestamp();
                if (object.seconds != null)
                    if ($util.Long)
                        (message.seconds = $util.Long.fromValue(object.seconds)).unsigned = false;
                    else if (typeof object.seconds === "string")
                        message.seconds = parseInt(object.seconds, 10);
                    else if (typeof object.seconds === "number")
                        message.seconds = object.seconds;
                    else if (typeof object.seconds === "object")
                        message.seconds = new $util.LongBits(object.seconds.low >>> 0, object.seconds.high >>> 0).toNumber();
                if (object.nanos != null)
                    message.nanos = object.nanos | 0;
                return message;
            };

            /**
             * Creates a plain object from a Timestamp message. Also converts values to other types if specified.
             * @function toObject
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.Timestamp} message Timestamp
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Timestamp.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                let object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        let long = new $util.Long(0, 0, false);
                        object.seconds = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                    } else
                        object.seconds = options.longs === String ? "0" : 0;
                    object.nanos = 0;
                }
                if (message.seconds != null && message.hasOwnProperty("seconds"))
                    if (typeof message.seconds === "number")
                        object.seconds = options.longs === String ? String(message.seconds) : message.seconds;
                    else
                        object.seconds = options.longs === String ? $util.Long.prototype.toString.call(message.seconds) : options.longs === Number ? new $util.LongBits(message.seconds.low >>> 0, message.seconds.high >>> 0).toNumber() : message.seconds;
                if (message.nanos != null && message.hasOwnProperty("nanos"))
                    object.nanos = message.nanos;
                return object;
            };

            /**
             * Converts this Timestamp to JSON.
             * @function toJSON
             * @memberof google.protobuf.Timestamp
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Timestamp.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Timestamp
             * @function getTypeUrl
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Timestamp.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/google.protobuf.Timestamp";
            };

            return Timestamp;
        })();

        protobuf.Duration = (function() {

            /**
             * Properties of a Duration.
             * @memberof google.protobuf
             * @interface IDuration
             * @property {number|Long|null} [seconds] Duration seconds
             * @property {number|null} [nanos] Duration nanos
             */

            /**
             * Constructs a new Duration.
             * @memberof google.protobuf
             * @classdesc Represents a Duration.
             * @implements IDuration
             * @constructor
             * @param {google.protobuf.IDuration=} [properties] Properties to set
             */
            function Duration(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Duration seconds.
             * @member {number|Long} seconds
             * @memberof google.protobuf.Duration
             * @instance
             */
            Duration.prototype.seconds = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Duration nanos.
             * @member {number} nanos
             * @memberof google.protobuf.Duration
             * @instance
             */
            Duration.prototype.nanos = 0;

            /**
             * Creates a new Duration instance using the specified properties.
             * @function create
             * @memberof google.protobuf.Duration
             * @static
             * @param {google.protobuf.IDuration=} [properties] Properties to set
             * @returns {google.protobuf.Duration} Duration instance
             */
            Duration.create = function create(properties) {
                return new Duration(properties);
            };

            /**
             * Encodes the specified Duration message. Does not implicitly {@link google.protobuf.Duration.verify|verify} messages.
             * @function encode
             * @memberof google.protobuf.Duration
             * @static
             * @param {google.protobuf.IDuration} message Duration message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Duration.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.seconds != null && Object.hasOwnProperty.call(message, "seconds"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.seconds);
                if (message.nanos != null && Object.hasOwnProperty.call(message, "nanos"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.nanos);
                return writer;
            };

            /**
             * Encodes the specified Duration message, length delimited. Does not implicitly {@link google.protobuf.Duration.verify|verify} messages.
             * @function encodeDelimited
             * @memberof google.protobuf.Duration
             * @static
             * @param {google.protobuf.IDuration} message Duration message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Duration.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Duration message from the specified reader or buffer.
             * @function decode
             * @memberof google.protobuf.Duration
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {google.protobuf.Duration} Duration
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Duration.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.google.protobuf.Duration();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.seconds = reader.int64();
                            break;
                        }
                    case 2: {
                            message.nanos = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Duration message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof google.protobuf.Duration
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {google.protobuf.Duration} Duration
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Duration.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Duration message.
             * @function verify
             * @memberof google.protobuf.Duration
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Duration.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.seconds != null && message.hasOwnProperty("seconds"))
                    if (!$util.isInteger(message.seconds) && !(message.seconds && $util.isInteger(message.seconds.low) && $util.isInteger(message.seconds.high)))
                        return "seconds: integer|Long expected";
                if (message.nanos != null && message.hasOwnProperty("nanos"))
                    if (!$util.isInteger(message.nanos))
                        return "nanos: integer expected";
                return null;
            };

            /**
             * Creates a Duration message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof google.protobuf.Duration
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {google.protobuf.Duration} Duration
             */
            Duration.fromObject = function fromObject(object) {
                if (object instanceof $root.google.protobuf.Duration)
                    return object;
                let message = new $root.google.protobuf.Duration();
                if (object.seconds != null)
                    if ($util.Long)
                        (message.seconds = $util.Long.fromValue(object.seconds)).unsigned = false;
                    else if (typeof object.seconds === "string")
                        message.seconds = parseInt(object.seconds, 10);
                    else if (typeof object.seconds === "number")
                        message.seconds = object.seconds;
                    else if (typeof object.seconds === "object")
                        message.seconds = new $util.LongBits(object.seconds.low >>> 0, object.seconds.high >>> 0).toNumber();
                if (object.nanos != null)
                    message.nanos = object.nanos | 0;
                return message;
            };

            /**
             * Creates a plain object from a Duration message. Also converts values to other types if specified.
             * @function toObject
             * @memberof google.protobuf.Duration
             * @static
             * @param {google.protobuf.Duration} message Duration
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Duration.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                let object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        let long = new $util.Long(0, 0, false);
                        object.seconds = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                    } else
                        object.seconds = options.longs === String ? "0" : 0;
                    object.nanos = 0;
                }
                if (message.seconds != null && message.hasOwnProperty("seconds"))
                    if (typeof message.seconds === "number")
                        object.seconds = options.longs === String ? String(message.seconds) : message.seconds;
                    else
                        object.seconds = options.longs === String ? $util.Long.prototype.toString.call(message.seconds) : options.longs === Number ? new $util.LongBits(message.seconds.low >>> 0, message.seconds.high >>> 0).toNumber() : message.seconds;
                if (message.nanos != null && message.hasOwnProperty("nanos"))
                    object.nanos = message.nanos;
                return object;
            };

            /**
             * Converts this Duration to JSON.
             * @function toJSON
             * @memberof google.protobuf.Duration
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Duration.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Duration
             * @function getTypeUrl
             * @memberof google.protobuf.Duration
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Duration.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/google.protobuf.Duration";
            };

            return Duration;
        })();

        protobuf.Any = (function() {

            /**
             * Properties of an Any.
             * @memberof google.protobuf
             * @interface IAny
             * @property {string|null} [type_url] Any type_url
             * @property {Uint8Array|null} [value] Any value
             */

            /**
             * Constructs a new Any.
             * @memberof google.protobuf
             * @classdesc Represents an Any.
             * @implements IAny
             * @constructor
             * @param {google.protobuf.IAny=} [properties] Properties to set
             */
            function Any(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Any type_url.
             * @member {string} type_url
             * @memberof google.protobuf.Any
             * @instance
             */
            Any.prototype.type_url = "";

            /**
             * Any value.
             * @member {Uint8Array} value
             * @memberof google.protobuf.Any
             * @instance
             */
            Any.prototype.value = $util.newBuffer([]);

            /**
             * Creates a new Any instance using the specified properties.
             * @function create
             * @memberof google.protobuf.Any
             * @static
             * @param {google.protobuf.IAny=} [properties] Properties to set
             * @returns {google.protobuf.Any} Any instance
             */
            Any.create = function create(properties) {
                return new Any(properties);
            };

            /**
             * Encodes the specified Any message. Does not implicitly {@link google.protobuf.Any.verify|verify} messages.
             * @function encode
             * @memberof google.protobuf.Any
             * @static
             * @param {google.protobuf.IAny} message Any message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Any.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.type_url != null && Object.hasOwnProperty.call(message, "type_url"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.type_url);
                if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.value);
                return writer;
            };

            /**
             * Encodes the specified Any message, length delimited. Does not implicitly {@link google.protobuf.Any.verify|verify} messages.
             * @function encodeDelimited
             * @memberof google.protobuf.Any
             * @static
             * @param {google.protobuf.IAny} message Any message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Any.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an Any message from the specified reader or buffer.
             * @function decode
             * @memberof google.protobuf.Any
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {google.protobuf.Any} Any
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Any.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.google.protobuf.Any();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.type_url = reader.string();
                            break;
                        }
                    case 2: {
                            message.value = reader.bytes();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an Any message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof google.protobuf.Any
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {google.protobuf.Any} Any
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Any.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an Any message.
             * @function verify
             * @memberof google.protobuf.Any
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Any.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.type_url != null && message.hasOwnProperty("type_url"))
                    if (!$util.isString(message.type_url))
                        return "type_url: string expected";
                if (message.value != null && message.hasOwnProperty("value"))
                    if (!(message.value && typeof message.value.length === "number" || $util.isString(message.value)))
                        return "value: buffer expected";
                return null;
            };

            /**
             * Creates an Any message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof google.protobuf.Any
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {google.protobuf.Any} Any
             */
            Any.fromObject = function fromObject(object) {
                if (object instanceof $root.google.protobuf.Any)
                    return object;
                let message = new $root.google.protobuf.Any();
                if (object.type_url != null)
                    message.type_url = String(object.type_url);
                if (object.value != null)
                    if (typeof object.value === "string")
                        $util.base64.decode(object.value, message.value = $util.newBuffer($util.base64.length(object.value)), 0);
                    else if (object.value.length >= 0)
                        message.value = object.value;
                return message;
            };

            /**
             * Creates a plain object from an Any message. Also converts values to other types if specified.
             * @function toObject
             * @memberof google.protobuf.Any
             * @static
             * @param {google.protobuf.Any} message Any
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Any.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                let object = {};
                if (options.defaults) {
                    object.type_url = "";
                    if (options.bytes === String)
                        object.value = "";
                    else {
                        object.value = [];
                        if (options.bytes !== Array)
                            object.value = $util.newBuffer(object.value);
                    }
                }
                if (message.type_url != null && message.hasOwnProperty("type_url"))
                    object.type_url = message.type_url;
                if (message.value != null && message.hasOwnProperty("value"))
                    object.value = options.bytes === String ? $util.base64.encode(message.value, 0, message.value.length) : options.bytes === Array ? Array.prototype.slice.call(message.value) : message.value;
                return object;
            };

            /**
             * Converts this Any to JSON.
             * @function toJSON
             * @memberof google.protobuf.Any
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Any.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Any
             * @function getTypeUrl
             * @memberof google.protobuf.Any
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Any.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/google.protobuf.Any";
            };

            return Any;
        })();

        return protobuf;
    })();

    google.rpc = (function() {

        /**
         * Namespace rpc.
         * @memberof google
         * @namespace
         */
        const rpc = {};

        rpc.Status = (function() {

            /**
             * Properties of a Status.
             * @memberof google.rpc
             * @interface IStatus
             * @property {number|null} [code] Status code
             * @property {string|null} [message] Status message
             * @property {Array.<google.protobuf.IAny>|null} [details] Status details
             */

            /**
             * Constructs a new Status.
             * @memberof google.rpc
             * @classdesc Represents a Status.
             * @implements IStatus
             * @constructor
             * @param {google.rpc.IStatus=} [properties] Properties to set
             */
            function Status(properties) {
                this.details = [];
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Status code.
             * @member {number} code
             * @memberof google.rpc.Status
             * @instance
             */
            Status.prototype.code = 0;

            /**
             * Status message.
             * @member {string} message
             * @memberof google.rpc.Status
             * @instance
             */
            Status.prototype.message = "";

            /**
             * Status details.
             * @member {Array.<google.protobuf.IAny>} details
             * @memberof google.rpc.Status
             * @instance
             */
            Status.prototype.details = $util.emptyArray;

            /**
             * Creates a new Status instance using the specified properties.
             * @function create
             * @memberof google.rpc.Status
             * @static
             * @param {google.rpc.IStatus=} [properties] Properties to set
             * @returns {google.rpc.Status} Status instance
             */
            Status.create = function create(properties) {
                return new Status(properties);
            };

            /**
             * Encodes the specified Status message. Does not implicitly {@link google.rpc.Status.verify|verify} messages.
             * @function encode
             * @memberof google.rpc.Status
             * @static
             * @param {google.rpc.IStatus} message Status message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Status.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.message);
                if (message.details != null && message.details.length)
                    for (let i = 0; i < message.details.length; ++i)
                        $root.google.protobuf.Any.encode(message.details[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified Status message, length delimited. Does not implicitly {@link google.rpc.Status.verify|verify} messages.
             * @function encodeDelimited
             * @memberof google.rpc.Status
             * @static
             * @param {google.rpc.IStatus} message Status message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Status.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Status message from the specified reader or buffer.
             * @function decode
             * @memberof google.rpc.Status
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {google.rpc.Status} Status
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Status.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.google.rpc.Status();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.message = reader.string();
                            break;
                        }
                    case 3: {
                            if (!(message.details && message.details.length))
                                message.details = [];
                            message.details.push($root.google.protobuf.Any.decode(reader, reader.uint32()));
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Status message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof google.rpc.Status
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {google.rpc.Status} Status
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Status.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Status message.
             * @function verify
             * @memberof google.rpc.Status
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Status.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.code != null && message.hasOwnProperty("code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.message != null && message.hasOwnProperty("message"))
                    if (!$util.isString(message.message))
                        return "message: string expected";
                if (message.details != null && message.hasOwnProperty("details")) {
                    if (!Array.isArray(message.details))
                        return "details: array expected";
                    for (let i = 0; i < message.details.length; ++i) {
                        let error = $root.google.protobuf.Any.verify(message.details[i]);
                        if (error)
                            return "details." + error;
                    }
                }
                return null;
            };

            /**
             * Creates a Status message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof google.rpc.Status
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {google.rpc.Status} Status
             */
            Status.fromObject = function fromObject(object) {
                if (object instanceof $root.google.rpc.Status)
                    return object;
                let message = new $root.google.rpc.Status();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.message != null)
                    message.message = String(object.message);
                if (object.details) {
                    if (!Array.isArray(object.details))
                        throw TypeError(".google.rpc.Status.details: array expected");
                    message.details = [];
                    for (let i = 0; i < object.details.length; ++i) {
                        if (typeof object.details[i] !== "object")
                            throw TypeError(".google.rpc.Status.details: object expected");
                        message.details[i] = $root.google.protobuf.Any.fromObject(object.details[i]);
                    }
                }
                return message;
            };

            /**
             * Creates a plain object from a Status message. Also converts values to other types if specified.
             * @function toObject
             * @memberof google.rpc.Status
             * @static
             * @param {google.rpc.Status} message Status
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Status.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                let object = {};
                if (options.arrays || options.defaults)
                    object.details = [];
                if (options.defaults) {
                    object.code = 0;
                    object.message = "";
                }
                if (message.code != null && message.hasOwnProperty("code"))
                    object.code = message.code;
                if (message.message != null && message.hasOwnProperty("message"))
                    object.message = message.message;
                if (message.details && message.details.length) {
                    object.details = [];
                    for (let j = 0; j < message.details.length; ++j)
                        object.details[j] = $root.google.protobuf.Any.toObject(message.details[j], options);
                }
                return object;
            };

            /**
             * Converts this Status to JSON.
             * @function toJSON
             * @memberof google.rpc.Status
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Status.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Status
             * @function getTypeUrl
             * @memberof google.rpc.Status
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Status.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/google.rpc.Status";
            };

            return Status;
        })();

        return rpc;
    })();

    return google;
})();

export { $root as default };

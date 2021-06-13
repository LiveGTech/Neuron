/*
    Neuron
  
    Copyright (C) LiveG. All Rights Reserved.
  
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const PeerJsPeer = require("peerjs");

var common = require("./common");
var config = require("./config");
var requests = require("./requests");
var crypto = require("./crypto");

exports.host = "0.peerjs.com";
exports.port = 443;
exports.path = "/";
exports.myPeer = null;
exports.iceServers = [];
exports.discoveredNodes = [];

exports.ConnectionError = class extends Error {
    constructor(message) {
        super(message);

        this.name = "ConnectionError";
    }
};

exports.IceServer = class {
    constructor(url, secret = null) {
        this.url = url;
        this.secret = secret;
    }

    get json() {
        return {
            url: this.url,
            credential: this.secret || undefined
        };
    }
};

exports.Node = class {
    constructor(id, publicKey) {
        this.id = id;
        this.publicKey = publicKey;

        this.connection = null;
        this.connected = false;
        this.receiveQueue = {};
        this.listeningReceivers = {};
    }

    connect() {
        return new Promise(function(resolve, reject) {
            this.connection = exports.myPeer.connect(this.id, {
                reliable: true
            });

            this.connection.on("data", function(data) {
                if (typeof(data) != "object") {
                    return; // Ignore this
                }

                if (data.in == undefined) {
                    return; // Again, ignore this
                }

                if (this.receiveQueue.hasOwnProperty(data.in)) {
                    return; // Could be a duplicate of an already-received message, or a malformed message
                }

                this.receiveQueue[data.in] = data;

                if (this.listeningReceivers.hasOwnProperty(data.in)) {
                    this.listeningReceivers[data.in](data);
                }
            });

            this.connection.on("open", function() {
                this.connected = true;

                resolve();
            });
        });
    }

    ensureConnection() {
        if (!this.connected) {
            throw new exports.ConnectionError(`Node with ID \`${this.id}\` is not connected`);
        }
    }

    sendAndReceive(data) {
        return new Promise(function(resolve, reject) {
            this.ensureConnection();

            data.out = common.generateKey(16, common.HEX_DIGITS);
            this.listeningReceivers[data.out] = function(rxData) {
                resolve(rxData);
            };

            this.connection.send(data);

            return data;
        });
    }

    request(data) {
        var thisScope = this;

        return this.sendAndReceive({
            type: "open",
            self: "node"
        }).then(function(rxData) {
            if (typeof(rxData.in) != "string" || typeof(rxData.out) != "string" || typeof(rxData.signature) != "string") {
                return Promise.reject(`Node with ID \`${thisScope.id}\` sent a malformed message`);
            }

            if (!crypto.verifySignature(rxData.in, rxData.signature, thisScope.publicKey)) {
                return Promise.reject(`The authenticity of node with ID \`${thisScope.id}\` could not be verified`);
            }

            return this.sendAndReceive({
                type: "request",
                in: rxData.out,
                self: "node",
                data,
                signature: crypto.sign(rxData.out)
            });
        }).then(function(rxData) {
            if (typeof(rxData.in) != "string") {
                return Promise.reject(`Node with ID \`${thisScope.id}\` sent a malformed message`);
            }

            if (!crypto.verifySignature(rxData.in, rxData.signature, thisScope.publicKey)) {
                return Promise.reject(`The authenticity of node with ID \`${thisScope.id}\` could not be verified`);
            }

            return Promise.resolve(rxData);
        });
    }
};

exports.handleRequest = function(request) {
    return null;
};

exports.handleMessage = function(id, data) {
    if (data.type == "open") {
        return Promise.resolve({
            type: "response",
            in: data.out,
            out: common.generateKey(16, common.HEX_DIGITS),
            signature: crypto.sign(data.out)
        });
    }

    if (data.type == "request" && data.self == "node") {
        for (var i = 0; i < exports.nodes.length; i++) {
            if (exports.nodes[i].id == id && crypto.verifySignature(data.in, data.signature, exports.nodes[i].publicKey)) {
                return Promise.resolve({
                    type: "response",
                    in: data.out,
                    data: exports.handleRequest(data),
                    signature: crypto.sign(data.out)
                });
            }
        }
    }

    return Promise.resolve(null);
};

exports.discoverNodes = function(discoveryUrl = config.data.discoveryUrl || "https://liveg.tech/nodes.json") {
    return requests.getJson(discoveryUrl).then(function(data) {
        if (typeof(data.iceServers) == "object") {
            for (var i = 0; i < data.iceServers.length; i++) {
                exports.iceServers.push(data.iceServers[i].url, data.iceServers[i].secret || null);
            }
        }

        if (typeof(data.host) == "string") {
            exports.host = data.host;
        }

        if (typeof(data.port) == "number") {
            exports.port = data.port;
        }

        if (typeof(data.path) == "string") {
            exports.path = data.path;
        }

        exports.iceServers = typeof(data.iceServers) == "object" ? data.iceServers.map(function(server) {
            return new exports.IceServer(server.url, server.secret);
        }) : [];

        exports.nodes = typeof(data.nodes) == "object" ? data.nodes.map(function(server) {
            return new exports.Node(server.id, server.publicKey);
        }) : [];
    });
};

exports.connect = function() {
    return new Promise(function(resolve, reject) {
        exports.myPeer = new PeerJsPeer(config.data.fixedName, {
            host: exports.host,
            port: exports.port,
            path: exports.path,
            iceServers: exports.iceServers.map((i) => i.json)
        });
    
        exports.myPeer.on("open", function() {
            resolve();
        });

        exports.myPeer.on("connection", function(connection) {
            connection.on("data", function(data) {
                if (typeof(data) != "object") {
                    return; // Ignore this
                }

                if (typeof(data.out) != "string") {
                    return; // Again, ignore this
                }

                exports.handleMessage(connection.id, data).then(function(txData) {
                    if (txData != null) {
                        connection.send({
                            ...txData,
                            in: data.out
                        });
                    }
                });
            });
        });
    });
};
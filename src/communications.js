/*
    Neuron
  
    Copyright (C) LiveG. All Rights Reserved.
  
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const PeerJsPeer = require("peerjs");

var config = require("./config");
var requests = require("./requests");

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
        this.verified = false;
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

                if (data.out == undefined) {
                    return; // Again, ignore this
                }

                if (this.receiveQueue.hasOwnProperty(data.out)) {
                    return; // Could be a duplicate of an already-received message, or a malformed message
                }

                this.receiveQueue[data.out] = data;

                if (this.listeningReceivers.hasOwnProperty(data.out)) {
                    this.listeningReceivers[data.out](data);
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

    verify() {
        this.ensureConnection();

        // TODO: Perform verification process
    }
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
    });
};
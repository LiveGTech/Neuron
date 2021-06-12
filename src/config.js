/*
    Neuron
  
    Copyright (C) LiveG. All Rights Reserved.
  
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/
 
const fs = require("fs-extra");
const mkdirp = require("mkdirp");
const os = require("os");
const path = require("path");

var common = require("./common");
var crypto = require("./crypto");
 
const CONFIG_PATH = path.join(os.homedir(), ".config", "neuron", "config.json");
const CONFIG_DEFAULT_PATH = path.join(__dirname, "..", "defaultconfig.json");
 
exports.data = {};
 
exports.create = function(file = CONFIG_PATH) {
    var defaultConfig;
 
    try {
        mkdirp.sync(path.dirname(file));
    } catch (e) {
        throw new ReferenceError("Couldn't create config directory");
    }
 
    try {
        defaultConfig = fs.readFileSync(CONFIG_DEFAULT_PATH);
    } catch (e) {
        throw new ReferenceError("Couldn't read default configuration data");
    }
 
    try {
        fs.writeFileSync(file, defaultConfig);
    } catch (e) {
        throw new ReferenceError("Couldn't write new configuration file");
    }
 
    console.log("Configuration created");
};
 
exports.load = function(file = CONFIG_PATH) {
    if (!fs.existsSync(file)) {
        throw new ReferenceError("No configuration file found, please create one");
    }
 
    try {
        exports.data = JSON.parse(fs.readFileSync(file));
    } catch (e) {
        throw new SyntaxError("Couldn't to parse configuration file; ensure that format is correct");
    }
 
    console.log("Configuration loaded");
};

exports.save = function(file = CONFIG_PATH) {
    if (!fs.existsSync(file)) {
        throw new ReferenceError("No configuration file found, please create one");
    }

    try {
        fs.writeFileSync(file, JSON.stringify(exports.data, null, 4));
    } catch (e) {
        throw new ReferenceError("Couldn't write new configuration file");
    }

    console.log("Configuration saved");
}
 
exports.init = function(file = CONFIG_PATH) {
    if (!fs.existsSync(file)) {
        exports.create(file);
    }
 
    exports.load(file);
};

exports.performPropertyGeneration = function() {
    var promises = [];

    if (typeof(exports.data.fixedName) != "string") {
        exports.data.fixedName = `neuron_${exports.data.nodeOperator || "liveg"}_${exports.data.nodeIdentifier || "xx-test1"}_${common.generateKey()}`;

        console.log("Generated node fixed name");
    }

    if (typeof(exports.data.keys?.public) != "string" || typeof(exports.data.keys?.private) != "string") {
        promises.push(crypto.generateKeyPair().then(function(keypair) {
            exports.data.keys = {
                public: keypair.publicKey,
                private: keypair.privateKey
            };

            console.log("Generated public and private keys");

            return Promise.resolve();
        }));
    }

    return Promise.all(promises).then(function() {
        exports.save();

        console.log("Configuration is now in valid state");

        return Promise.resolve();
    });
};
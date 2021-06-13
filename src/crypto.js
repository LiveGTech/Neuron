/*
    Neuron
  
    Copyright (C) LiveG. All Rights Reserved.
  
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const crypto = require("crypto");

var config = require("./config");

exports.generateKeyPair = function() {
    return new Promise(function(resolve, reject) {
        crypto.generateKeyPair("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: "spki",
                format: "der"
            },
            privateKeyEncoding: {
                type: "pkcs8",
                format: "der",
                cipher: "aes-256-cbc",
                passphrase: ""
            }
        }, function(error, publicKey, privateKey) {
            resolve({publicKey: publicKey.toString("base64"), privateKey: privateKey.toString("base64")});
        });
    });
};

exports.sign = function(data, privateKey = config.data.keys.private) {
    var signer = crypto.createSign("SHA256");

    signer.update(data);

    return signer.sign({
        key: Buffer.from(privateKey, "base64"),
        type: "pkcs8",
        format: "der",
        passphrase: ""
    }).toString("hex");
};

exports.verifySignature = function(data, signature, publicKey) {
    var verifier = crypto.createVerify("RSA-SHA256");

    verifier.update(data);

    return verifier.verify({
        key: Buffer.from(publicKey, "base64"),
        type: "spki",
        format: "der"
    }, signature, "hex");
};
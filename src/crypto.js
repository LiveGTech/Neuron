/*
    Neuron
  
    Copyright (C) LiveG. All Rights Reserved.
  
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const crypto = require("crypto");

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
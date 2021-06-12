/*
    Neuron
  
    Copyright (C) LiveG. All Rights Reserved.
  
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const http = require("http");
const https = require("https");

exports.get = function(url) {
    return new Promise(function(resolve, reject) {
        (url.startsWith("https://") ? https : http).get(url, function(response) {
            var body = "";

            response.on("data", function(chunk) {
                body += chunk;
            });

            response.on("end", function() {
                resolve({
                    status: response.statusCode,
                    body
                });
            });
        });
    });
};

exports.getJson = function(url) {
    return exports.get(url).then(function(response) {
        try {
            return Promise.resolve(JSON.parse(response.body));
        } catch (e) {
            return Promise.reject(e);
        }
    });
}
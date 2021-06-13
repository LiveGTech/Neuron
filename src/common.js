/*
    Neuron
  
    Copyright (C) LiveG. All Rights Reserved.
  
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

exports.HEX_DIGITS = "0123456789abcdef";

exports.generateKey = function(length = 16, digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_") {
    var id = "";

    for (var i = 0; i < length; i++) {
        id += digits.charAt(Math.floor(Math.random() * digits.length));
    }

    return id;
};
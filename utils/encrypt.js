const CryptoJS = require("crypto-js");
require("dotenv").config();

const SECRET = CryptoJS.SHA256(process.env.SECRET_KEY).toString();

function encryptText(text) {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(text, SECRET, { iv });
    return CryptoJS.enc.Base64.stringify(iv.concat(encrypted.ciphertext))
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

module.exports = { encryptText };

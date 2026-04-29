const CryptoJS = require("crypto-js");
require("dotenv").config();

const SECRET = CryptoJS.SHA256(process.env.SECRET_KEY).toString();

function decryptText(encoded) {
    try {
        const data = CryptoJS.enc.Base64.parse(
            encoded.replace(/-/g, "+").replace(/_/g, "/")
        );
        const iv = CryptoJS.lib.WordArray.create(data.words.slice(0, 4), 16);
        const ciphertext = CryptoJS.lib.WordArray.create(data.words.slice(4));
        const decrypted = CryptoJS.AES.decrypt({ ciphertext }, SECRET, { iv });
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error("Decrypt Error:", e.message);
        return null;
    }
}

module.exports = { decryptText };

const express = require("express");
const https = require("https");
const http = require("http");
const crypto = require("crypto");
const fs = require('fs');
const path = require('path');
const { URL } = require("url");
require("dotenv").config();

const app = express();
app.use(express.json());

const STREAMS_FILE = path.join(__dirname, "all_streams.json");

// --- ১. সিকিউরিটি (Encryption/Decryption Logic) ---
// আপনার আগের এনক্রিপশন সিস্টেমের মতই হেক্স এনকোডিং ব্যবহার করছি যা ডাইনামিক ইউআরএল হ্যান্ডেল করবে
const encryptData = (text) => Buffer.from(text).toString('hex');
const decryptData = (hex) => Buffer.from(hex, 'hex').toString();

// --- ২. হেল্পার ফাংশন ---
function getBaseServer(channelId) {
    try {
        if (!fs.existsSync(STREAMS_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(STREAMS_FILE, "utf-8"));
        const channel = data.channels.find(c => c.id === channelId);
        return channel ? channel.stream : null;
    } catch (e) { return null; }
}

function curlRequest(url, headers) {
    return new Promise((resolve) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === "https:" ? https : http;
        const options = { headers, rejectUnauthorized: false };

        const req = client.request(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(curlRequest(new URL(res.headers.location, url).href, headers));
            }
            resolve(res);
        });
        req.on("error", () => resolve(false));
        req.end();
    });
}

// --- ৩. রাউটস (Routes) ---

// (ক) ইনডেক্স পেজ
app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTT - KING | Secure Proxy</title>
        <style>
            body { font-family: sans-serif; background: #080808; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { text-align: center; padding: 40px; background: #141414; border-radius: 20px; border: 1px solid #333; box-shadow: 0 0 20px rgba(229,9,20,0.2); }
            h1 { color: #e50914; margin: 0; font-size: 2.5rem; }
            .status { color: #28a745; font-weight: bold; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>OTT - KING</h1>
            <p>Premium IPTV Proxy System v2.0</p>
            <div class="status">● SERVER ONLINE</div>
            <p style="font-size: 10px; color: #555; margin-top: 20px;">© 2026 AnirbanSumon | Secure AES-128 Proxy</p>
        </div>
    </body>
    </html>`);
});

// (খ) প্লেলিস্ট প্রক্সি (AES-128 সাপোর্ট সহ)
app.get("/tracks-v1a1/:id/:file.m3u8", async (req, res) => {
    const { id } = req.params;
    const baseServer = getBaseServer(id);
    if (!baseServer) return res.status(404).send("#ID NOT FOUND");

    const baseUrl = baseServer.substring(0, baseServer.lastIndexOf("/") + 1);
    const response = await curlRequest(baseServer, { "User-Agent": "Mozilla/5.0" });

    if (!response || response.statusCode !== 200) return res.status(500).send("#SOURCE ERROR");

    let data = "";
    response.on("data", chunk => data += chunk);
    response.on("end", () => {
        let output = "";
        const lines = data.split("\n");

        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith("#EXT-X-KEY")) {
                const keyMatch = line.match(/URI=["']?(.*?)["']?($|,)/);
                if (keyMatch) {
                    const absKey = new URL(keyMatch[1], baseUrl).href;
                    line = line.replace(keyMatch[1], `/tracks-v1a1/${id}/_key_${encryptData(absKey)}.key`);
                }
                output += line + "\n";
            } else if (line.startsWith("#") || !line) {
                output += line + "\n";
            } else {
                const absSeg = new URL(line, baseUrl).href;
                output += `/tracks-v1a1/${id}/_ts_${encryptData(absSeg)}.ts\n`;
            }
        });

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.send(output);
    });
});

// (গ) সেগমেন্ট ও কী প্রক্সি (ডিক্রিপশন সহ)
app.get("/tracks-v1a1/:id/:file", async (req, res) => {
    const { file } = req.params;
    let targetUrl = "";

    try {
        if (file.startsWith("_ts_")) {
            targetUrl = decryptData(file.replace("_ts_", "").replace(".ts", ""));
        } else if (file.startsWith("_key_")) {
            targetUrl = decryptData(file.replace("_key_", "").replace(".key", ""));
        } else { return res.status(404).end(); }

        const stream = await curlRequest(targetUrl, { 
            "User-Agent": "Mozilla/5.0",
            "Referer": new URL(targetUrl).origin 
        });

        if (!stream) return res.status(500).end();

        res.setHeader("Content-Type", file.endsWith(".key") ? "application/octet-stream" : "video/mp2t");
        res.setHeader("Access-Control-Allow-Origin", "*");
        stream.pipe(res);
    } catch (e) { res.status(500).end(); }
});

// সার্ভার স্টার্ট
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[OTTKing] Proxy active on port ${PORT}`));

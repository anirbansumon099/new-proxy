const express = require("express");
const https = require("https");
const http = require("http");
const crypto = require("crypto");
const fs = require('fs');
require("dotenv").config();
const path = require('path');
const { URL } = require("url");

const app = express();
app.use(express.json());

// JSON ফাইল পাথ
const STREAMS_FILE = path.join(__dirname, "all_streams.json");

// --- Helper Functions ---

function getBaseServer(channelId) {
    try {
        if (!fs.existsSync(STREAMS_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(STREAMS_FILE, "utf-8"));
        const channel = data.channels.find(c => c.id === channelId);
        return channel ? channel.stream : null;
    } catch (e) {
        return null;
    }
}

function generateToken() {
    return crypto.createHash("md5").update(Date.now().toString()).digest("hex");
}

function curlRequest(url, headers) {
    return new Promise((resolve) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === "https:" ? https : http;
        const req = client.request(url, { headers, rejectUnauthorized: false }, (res) => {
            if (res.statusCode === 200) resolve(res);
            else resolve(false);
        });
        req.on("error", () => resolve(false));
        req.end();
    });
}

// --- Routes ---

// ১. ইনডেক্স পেজ (সিম্পল ডিজাইন)
app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTTKing Proxy System</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f0f0f; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .container { text-align: center; padding: 40px; background: #1a1a1a; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #333; }
            h1 { color: #e50914; margin-bottom: 10px; font-size: 2.5rem; }
            p { color: #aaa; margin-bottom: 25px; }
            .status { display: inline-block; padding: 8px 20px; background: #28a745; border-radius: 20px; font-size: 0.9rem; font-weight: bold; }
            .footer { margin-top: 30px; font-size: 0.8rem; color: #555; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>OTT - KING</h1>
            <p>Premium IPTV Proxy Server is Active</p>
            <div class="status">● SERVER ONLINE</div>
            <div class="footer">© 2026 AnirbanSumon | Secure Streaming Proxy</div>
        </div>
    </body>
    </html>
    `);
});

// ২. প্লেলিস্ট প্রক্সি রাউট
app.get("/tracks-v1a1/:id/:file.m3u8", async (req, res) => {
    const { id } = req.params;
    const baseServer = getBaseServer(id);
    if (!baseServer) return res.status(404).send("#ID NOT FOUND");

    const target = `${baseServer}?id=${id}&token=${generateToken()}`;
    const headers = { "User-Agent": "Mozilla/5.0", "Host": new URL(baseServer).hostname };

    const response = await curlRequest(target, headers);
    if (!response) return res.status(500).send("#SOURCE ERROR");

    let data = "";
    response.on("data", chunk => data += chunk);
    response.on("end", () => {
        const lines = data.split("\n").map(line => {
            if (line.includes("?file=")) {
                const segName = new URL(line, "http://x").searchParams.get("file");
                return `/tracks-v1a1/${id}/_${segName}.ts`;
            }
            return line;
        }).join("\n");
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.send(lines);
    });
});

// ৩. সেগমেন্ট প্রক্সি রাউট
app.get("/tracks-v1a1/:id/_:seg.ts", async (req, res) => {
    const { id, seg } = req.params;
    const baseServer = getBaseServer(id);
    if (!baseServer) return res.status(404).end();

    const urlParts = new URL(baseServer);
    const targetTs = `${urlParts.origin}${urlParts.pathname}?file=${seg}&token=${generateToken()}`;
    
    const stream = await curlRequest(targetTs, { "Host": urlParts.hostname });
    if (!stream) return res.status(500).end();

    res.setHeader("Content-Type", "video/mp2t");
    stream.pipe(res);
});

// ৪. ৪-০-৪ হ্যান্ডলার
app.use((req, res) => {
    res.status(404).send("Invalid Route");
});

// সার্ভার স্টার্ট
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));

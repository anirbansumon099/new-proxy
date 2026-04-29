const express = require("express");
const https = require("https");
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const router = express.Router();

// JSON ফাইল পাথ
const STREAMS_FILE = path.join(__dirname, "../all_streams.json");

const headerVariants = [
    [
        "Mozilla/5.0 (Linux; Android 12; SM-A505F) AppleWebKit/537.36 Chrome/118.0 Mobile Safari/537.36",
        "Sec-Fetch-Mode: navigate",
        "Sec-Fetch-Site: same-origin",
        "Sec-Fetch-Dest: empty"
    ],
    [
        "Mozilla/5.0 (Windows NT 10.0; Win64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        "Sec-Fetch-Mode: no-cors",
        "Sec-Fetch-Site: same-origin",
        "Sec-Fetch-Dest: empty"
    ]
];

// JSON থেকে সার্ভার ইউআরএল খোঁজার ফাংশন
function getBaseServer(channelId) {
    try {
        if (!fs.existsSync(STREAMS_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(STREAMS_FILE, "utf-8"));
        const channel = data.channels.find(c => c.id === channelId);
        return channel ? channel.stream : null;
    } catch (e) {
        console.error("JSON Read Error in Segment:", e.message);
        return null;
    }
}

function generateToken() {
    const seed = (Date.now() + Math.floor(Math.random() * 10000)).toString();
    return crypto.createHash("md5").update(seed).digest("hex");
}

// Stream fetch (Pipe friendly)
function curlRequest(url, headers, retry = 3) {
    return new Promise((resolve) => {
        let attempts = 0;
        const requestOnce = () => {
            attempts++;
            const urlObj = new URL(url);
            const lib = urlObj.protocol === "https:" ? https : http;
            const options = { 
                method: "GET", 
                headers, 
                rejectUnauthorized: false 
            };
            
            const req = lib.request(urlObj, options, res => {
                // স্ট্রিমিং সার্ভার রিডাইরেক্ট করলে সেটা হ্যান্ডেল করা
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return resolve(curlRequest(res.headers.location, headers, retry));
                }
                
                if (res.statusCode === 200) return resolve(res);
                
                if (attempts < retry) return setTimeout(requestOnce, 200);
                resolve(false);
            });

            req.on("error", () => {
                if (attempts < retry) return setTimeout(requestOnce, 200);
                resolve(false);
            });
            req.end();
        };
        requestOnce();
    });
}

// Segment route (ডাইনামিক ID সহ)
// URL Format: /tracks-v1a1/CHANNEL_ID/_SEGMENT_NAME.ts
router.get("/tracks-v1a1/:id/_:seg.ts", async (req, res) => {
    const { id, seg } = req.params;

    // ১. JSON থেকে অরিজিনাল সার্ভার ইউআরএল নেওয়া
    const baseServer = getBaseServer(id);
    if (!baseServer) {
        return res.status(404).end();
    }

    // CORS Headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

    const token = generateToken();
    
    // ২. অরিজিনাল সেগমেন্ট ইউআরএল তৈরি (যেমন: live3.php?file=...)
    // আমরা ধরে নিচ্ছি live3.php ওই একই ডোমেইনের ডিরেক্টরিতে আছে
    const urlParts = new URL(baseServer);
    const targetSegURL = `${urlParts.origin}${urlParts.pathname}?file=${encodeURIComponent(seg)}&token=${token}`;

    const headers = { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        "Host": urlParts.hostname,
        "Referer": urlParts.origin,
        "Connection": "keep-alive"
    };

    const stream = await curlRequest(targetSegURL, headers, 3);
    
    if (!stream) {
        console.error(`[SEGMENT] Fetch failed for ID: ${id}, Seg: ${seg}`);
        return res.status(500).send("");
    }

    // ৩. রেসপন্স পাঠানো
    res.setHeader("Content-Type", "video/mp2t");
    stream.pipe(res);
});

module.exports = router;

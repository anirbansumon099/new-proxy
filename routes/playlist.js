const express = require("express");
const https = require("https");
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { encryptNumber, decryptNumber } = require("../utils/encryptor");

const router = express.Router();

// JSON ফাইল পাথ
const STREAMS_FILE = path.join(__dirname, "../all_streams.json");

// হেডার ভেরিয়েন্ট (বট ডিটেকশন এড়াতে)
const headerVariants = [
    ["Mozilla/5.0 (Windows NT 10.0; Win64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36", "cors"],
    ["Mozilla/5.0 (Android 13; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0", "no-cors"],
    ["Mozilla/5.0 (Linux; Android 12; SM-A505F) AppleWebKit/537.36 Chrome/118.0 Mobile Safari/537.36", "navigate"]
];

// JSON থেকে সার্ভার ইউআরএল খোঁজার ফাংশন
function getBaseServer(channelId) {
    try {
        if (!fs.existsSync(STREAMS_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(STREAMS_FILE, "utf-8"));
        const channel = data.channels.find(c => c.id === channelId);
        return channel ? channel.stream : null;
    } catch (e) {
        console.error("JSON Read Error:", e.message);
        return null;
    }
}

// টোকেন জেনারেটর
function generateToken() {
    const seed = (Date.now() + Math.floor(Math.random() * 10000)).toString();
    return crypto.createHash("md5").update(seed).digest("hex");
}

// কাস্টম ফেচ ফাংশন (cURL এর মতো)
function curlRequest(url, headers) {
    return new Promise((resolve) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === "https:" ? https : http;
        
        const options = {
            method: "GET",
            headers: headers,
            rejectUnauthorized: false
        };

        const req = client.request(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(curlRequest(res.headers.location, headers)); // হ্যান্ডেল রিডাইরেক্ট
            }
            let data = Buffer.alloc(0);
            res.on("data", chunk => data = Buffer.concat([data, chunk]));
            res.on("end", () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });

        req.on("error", () => resolve(null));
        req.end();
    });
}

// ১. প্লেলিস্ট রাউট (index.m3u8 / mono.m3u8)
router.get("/tracks-v1a1/:id/:filename.m3u8", async (req, res) => {
    const { id } = req.params;
    const baseServer = getBaseServer(id);

    if (!baseServer) {
        return res.status(404).send("#ERROR: Channel Not Found In JSON\n");
    }

    const token = generateToken();
    const targetUrl = `${baseServer}?id=${encodeURIComponent(id)}&token=${token}`;
    
    const randHeader = headerVariants[Math.floor(Math.random() * headerVariants.length)];
    const fetchHeaders = {
        "User-Agent": randHeader[0],
        "Referer": "https://allinonereborn.xyz/",
        "Host": new URL(baseServer).hostname
    };

    console.log(`[PLAYLIST] ID: ${id} | Fetching: ${targetUrl}`);

    const response = await curlRequest(targetUrl, fetchHeaders);
    if (!response || response.status !== 200) {
        return res.status(500).send("#ERROR: Source Server Down\n");
    }

    const content = response.body.toString();
    const lines = content.split("\n");
    let output = "";

    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith("#")) {
            output += line + "\n";
        } else if (line.includes("?file=")) {
            const urlObj = new URL(line, "http://localhost");
            const fileName = urlObj.searchParams.get("file");
            // .ts ফাইলের লিংকে ID পাস করছি যেন পরেরবার প্রক্সি সার্ভার বুঝতে পারে কোন মেইন সার্ভারে হিট করতে হবে
            output += `/tracks-v1a1/${id}/_${encodeURIComponent(fileName)}.ts\n`;
        } else if (line.length > 0) {
            output += line + "\n";
        }
    });

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(output);
});

// ২. ভিডিও সেগমেন্ট রাউট (.ts প্রক্সি)
router.get("/tracks-v1a1/:id/_:tsfile.ts", async (req, res) => {
    const { id, tsfile } = req.params;
    const baseServer = getBaseServer(id);

    if (!baseServer) return res.status(404).end();

    // সেগমেন্টের অরিজিনাল ইউআরএল তৈরি
    // সাধারণত লাইভ স্ট্রিমে সেগমেন্টগুলো একই বেস ইউআরএলে থাকে
    const baseUrl = baseServer.substring(0, baseServer.lastIndexOf("/") + 1);
    const targetTsUrl = `${baseUrl}live3.php?file=${tsfile}`;

    const fetchHeaders = {
        "User-Agent": headerVariants[0][0],
        "Host": new URL(baseServer).hostname
    };

    const response = await curlRequest(targetTsUrl, fetchHeaders);
    
    if (!response || response.status !== 200) {
        return res.status(500).end();
    }

    res.setHeader("Content-Type", "video/mp2t");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(response.body);
});

module.exports = router;

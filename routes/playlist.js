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

// হেডার ভেরিয়েন্ট (বট ডিটেকশন এড়াতে)
const headerVariants = [
    "Mozilla/5.0 (Windows NT 10.0; Win64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Android 13; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
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

// কাস্টম ফেচ ফাংশন (রিডাইরেক্ট হ্যান্ডলিং সহ)
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
            // রিডাইরেক্ট হ্যান্ডেল করা (৩xx স্ট্যাটাস)
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const nextUrl = new URL(res.headers.location, url).href;
                return resolve(curlRequest(nextUrl, headers));
            }

            let data = Buffer.alloc(0);
            res.on("data", chunk => data = Buffer.concat([data, chunk]));
            res.on("end", () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });

        req.on("error", (e) => {
            console.error(`Request Error for ${url}:`, e.message);
            resolve(null);
        });
        req.end();
    });
}

/**
 * ১. প্লেলিস্ট রাউট (AES-128 এবং ডাইনামিক পাথ সাপোর্ট)
 */
router.get("/tracks-v1a1/:id/:filename.m3u8", async (req, res) => {
    const { id } = req.params;
    const baseServer = getBaseServer(id);

    if (!baseServer) {
        return res.status(404).send("#ERROR: Channel Not Found\n");
    }

    const urlParts = new URL(baseServer);
    // বেস ডিরেক্টরি বের করা (সেগমেন্টগুলো যদি রিলেটিভ পাথে থাকে)
    const baseUrl = baseServer.substring(0, baseServer.lastIndexOf("/") + 1);

    const fetchHeaders = {
        "User-Agent": headerVariants[Math.floor(Math.random() * headerVariants.length)],
        "Referer": urlParts.origin,
        "Host": urlParts.hostname
    };

    console.log(`[PLAYLIST] Fetching: ${baseServer}`);

    const response = await curlRequest(baseServer, fetchHeaders);
    if (!response || response.status !== 200) {
        return res.status(500).send("#ERROR: Source Server Down\n");
    }

    const content = response.body.toString();
    const lines = content.split("\n");
    let output = "";

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        if (line.startsWith("#")) {
            // --- AES-128 Key Proxy Logic ---
            if (line.includes("#EXT-X-KEY")) {
                const keyMatch = line.match(/URI=["']?(.*?)["']?($|,)/);
                if (keyMatch && keyMatch[1]) {
                    const originalKeyUri = keyMatch[1];
                    // কি ফাইলটির অ্যাবসোলিউট ইউআরএল তৈরি
                    const absoluteKeyUrl = new URL(originalKeyUri, baseUrl).href;
                    // কী ফাইলকে হেক্স এনকোড করে আমাদের প্রক্সি পাথে পাঠানো
                    const hexKey = Buffer.from(absoluteKeyUrl).toString('hex');
                    const proxiedKeyUrl = `/tracks-v1a1/${id}/_key_${hexKey}.key`;
                    line = line.replace(originalKeyUri, proxiedKeyUrl);
                }
            }
            output += line + "\n";
        } else {
            // --- Universal Segment Proxy Logic ---
            // রিলেটিভ পাথকে অ্যাবসোলিউট ইউআরএলে রূপান্তর
            const absoluteSegUrl = new URL(line, baseUrl).href;
            // পুরো ইউআরএলটিকে হেক্স এনকোড করা হচ্ছে যাতে যেকোনো সোর্স কাজ করে
            const hexUrl = Buffer.from(absoluteSegUrl).toString('hex');
            output += `/tracks-v1a1/${id}/_ts_${hexUrl}.ts\n`;
        }
    });

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
    res.send(output);
});

module.exports = router;

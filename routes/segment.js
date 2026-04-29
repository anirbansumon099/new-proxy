const express = require("express");
const https = require("https");
const http = require("http");
const router = express.Router();

// স্ট্রিম ফেচ ফাংশন (Pipe friendly)
function curlRequest(url, headers) {
    return new Promise((resolve) => {
        const urlObj = new URL(url);
        const lib = urlObj.protocol === "https:" ? https : http;
        const options = { 
            method: "GET", 
            headers, 
            rejectUnauthorized: false 
        };
        
        const req = lib.request(urlObj, options, res => {
            // রিডাইরেক্ট হ্যান্ডলিং
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const nextUrl = new URL(res.headers.location, url).href;
                return resolve(curlRequest(nextUrl, headers));
            }
            if (res.statusCode === 200) return resolve(res);
            resolve(false);
        });

        req.on("error", () => resolve(false));
        req.end();
    });
}

/**
 * সেগমেন্ট এবং কী (Key) রাউট
 * URL ফরম্যাট: /tracks-v1a1/:id/_ts_HEXDATA.ts অথবা /tracks-v1a1/:id/_key_HEXDATA.key
 */
router.get("/tracks-v1a1/:id/:file", async (req, res) => {
    const { file } = req.params;
    let targetUrl = "";

    try {
        // ১. হেক্স ডিকোডিং (HEX -> Original URL)
        if (file.startsWith("_ts_")) {
            const hex = file.replace("_ts_", "").replace(".ts", "");
            targetUrl = Buffer.from(hex, 'hex').toString();
        } else if (file.startsWith("_key_")) {
            const hex = file.replace("_key_", "").replace(".key", "");
            targetUrl = Buffer.from(hex, 'hex').toString();
        } else {
            return res.status(404).send("Invalid Request");
        }

        const urlObj = new URL(targetUrl);
        const headers = { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; Applewebkit/537.36) Chrome/120.0 Safari/537.36",
            "Host": urlObj.hostname,
            "Referer": urlObj.origin
        };

        const stream = await curlRequest(targetUrl, headers);
        
        if (!stream) {
            console.error(`[SEGMENT ERROR] Could not fetch: ${targetUrl}`);
            return res.status(500).send("Source Fetch Error");
        }

        // ২. কনটেন্ট টাইপ সেটআপ
        const contentType = file.endsWith(".key") ? "application/octet-stream" : "video/mp2t";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "no-cache");

        // ৩. পাইপ করে ভিডিও ডেটা পাঠানো
        stream.pipe(res);

    } catch (err) {
        console.error("Segment Routing Error:", err.message);
        res.status(500).end();
    }
});

module.exports = router;

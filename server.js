const express = require("express");
const https = require("https");
const http = require("http");
const fs = require('fs');
const path = require('path');
const crypto = require("crypto");
const { URL } = require("url");
require("dotenv").config();
const dashboardRouter = require("./routes/index"); // যদি ফাইলের নাম dashboard.js হয়
const app = express();
const STREAMS_FILE = path.join(__dirname, "all_streams.json");

// --- ১. সিকিউরিটি (AES-256-CBC) ---
const ENCRYPTION_KEY = Buffer.from(process.env.KEY || "0123456789abcdef0123456789abcdef", 'utf8'); 
const IV_LENGTH = 16;

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// --- ২. সোর্স ডাটা ফেচিং ফাংশন ---
function getSourceUrl(channelId) {
    try {
        const data = JSON.parse(fs.readFileSync(STREAMS_FILE, "utf-8"));
        const channel = data.channels.find(c => c.id === channelId);
        return channel ? channel.stream : null;
    } catch (e) { return null; }
}

function curlRequest(url, headers) {
    return new Promise((resolve) => {
        const client = url.startsWith("https") ? https : http;
        const options = { headers, rejectUnauthorized: false, timeout: 20000 };
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

// --- ৩. রাউটস ---

app.get('/',dashboardRouter);


// (ক) মেইন এন্ট্রি পয়েন্ট: /:id/index.m3u8
app.get("/:id/index.m3u8", async (req, res) => {
    const { id } = req.params;
    const sourceUrl = getSourceUrl(id);
    if (!sourceUrl) return res.status(404).send("Invalid Channel");

    const sourceRes = await curlRequest(sourceUrl, { "User-Agent": "Mozilla/5.0" });
    if (!sourceRes) return res.status(500).send("Offline");

    const contentType = (sourceRes.headers['content-type'] || "").toLowerCase();

    // কন্টেন্ট চেক: যদি এটি প্লেলিস্ট না হয় (যেমন ডাইরেক্ট অক্টেট স্ট্রিম)
    if (!contentType.includes("mpegurl") && !contentType.includes("application/x-mpegurl")) {
        return res.redirect(302, `/${id}/index.ts`);
    }

    // প্লেলিস্ট প্রসেসিং
    let data = "";
    sourceRes.on("data", chunk => data += chunk);
    sourceRes.on("end", () => {
        let output = "";
        data.split("\n").forEach(line => {
            line = line.trim();
            if (!line) return;
            if (line.startsWith("#")) {
                if (line.includes("URI=")) {
                    const match = line.match(/URI=["']?(.*?)["']?($|,)/);
                    if (match) {
                        const absKey = new URL(match[1], sourceUrl).href;
                        line = line.replace(match[1], `/${id}/${encrypt(absKey)}.key`);
                    }
                }
                output += line + "\n";
            } else {
                const absUrl = new URL(line, sourceUrl).href;
                // আমরা এখানে কন্টেন্ট না দেখে এক্সটেনশন দিচ্ছি প্রক্সি রাউটিং এর সুবিধার জন্য
                output += `/${id}/${encrypt(absUrl)}.ts\n`;
            }
        });
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.send(output);
    });
});

// (খ) ডাইরেক্ট টিএস রাউট: /:id/index.ts (Continuous Stream)
app.get("/:id/index.ts", async (req, res) => {
    const { id } = req.params;
    const sourceUrl = getSourceUrl(id);
    if (!sourceUrl) return res.status(404).end();

    const sourceRes = await curlRequest(sourceUrl, { "User-Agent": "Mozilla/5.0" });
    if (!sourceRes) return res.status(500).end();

    res.setHeader("Content-Type", "video/mp2t");
    sourceRes.pipe(res);
});

// (গ) ইন্টেলিজেন্ট চাস্ক হ্যান্ডলার: ফাইল যাই হোক, কন্টেন্ট দেখে রেসপন্স করবে
app.get("/:id/:encryptedPath.ts", async (req, res) => {
    const { id, encryptedPath } = req.params;
    let targetUrl;

    try {
        const hash = encryptedPath.split('.')[0];
        targetUrl = decrypt(hash);
    } catch (e) { return res.status(400).end(); }

    const sourceRes = await curlRequest(targetUrl, { 
        "User-Agent": "Mozilla/5.0",
        "Referer": new URL(targetUrl).origin 
    });

    if (!sourceRes) return res.status(500).end();

    const contentType = (sourceRes.headers['content-type'] || "").toLowerCase();

    // ১. যদি এটি মেনিফেস্ট বা প্লেলিস্ট হয় (ভিতরের ডাটা চেক)
    if (contentType.includes("mpegurl") || contentType.includes("application/x-mpegurl")) {
        let data = "";
        sourceRes.on("data", chunk => data += chunk);
        sourceRes.on("end", () => {
            let output = "";
            data.split("\n").forEach(line => {
                line = line.trim();
                if (!line) return;
                if (line.startsWith("#")) {
                    output += line + "\n";
                } else {
                    const absUrl = new URL(line, targetUrl).href;
                    output += `/${id}/${encrypt(absUrl)}.chunk\n`;
                }
            });
            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            res.send(output);
        });
    } 
    // ২. যদি এটি ভিডিও সেগমেন্ট বা অক্টেট স্ট্রিম হয়
    else {
        res.setHeader("Content-Type", contentType || "video/mp2t");
        res.setHeader("Access-Control-Allow-Origin", "*");
        sourceRes.pipe(res);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OTT-KING Intelligent Proxy running on ${PORT}`));

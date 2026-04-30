const express = require("express");
const path = require("path");

const router = express.Router();


router.get("/", (req, res) => {
res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTT-KING | Premium Streaming Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">

    <style>
        :root {
            --primary: #22c55e;
            --primary-hover: #16a34a;
            --bg-dark: #020617;
            --card-bg: #0f172a;
            --text-main: #f8fafc;
            --text-dim: #94a3b8;
            --accent-blue: #38bdf8;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Inter', sans-serif;
        }

        body {
            background: var(--bg-dark);
            color: var(--text-main);
            line-height: 1.6;
            overflow-x: hidden;
        }

        /* Animated Background Background */
        body::before {
            content: "";
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 50% -20%, #1e293b, transparent);
            z-index: -1;
        }

        /* Header */
        header {
            padding: 20px 5%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(2, 6, 23, 0.8);
            backdrop-filter: blur(10px);
            position: sticky;
            top: 0;
            z-index: 100;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .logo {
            font-size: 1.5rem;
            color: var(--primary);
            font-weight: 800;
            letter-spacing: -1px;
            text-transform: uppercase;
        }

        /* Navbar */
        .nav {
            display: flex;
            gap: 12px;
            background: rgba(15, 23, 42, 0.5);
            padding: 5px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .nav button {
            background: transparent;
            border: none;
            color: var(--text-dim);
            padding: 10px 18px;
            cursor: pointer;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s ease;
            font-size: 14px;
        }

        .nav button.active {
            background: var(--primary);
            color: #000;
            box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
        }

        .nav button:hover:not(.active) {
            color: var(--text-main);
            background: rgba(255, 255, 255, 0.05);
        }

        /* Content Container */
        .container {
            padding: 40px 20px;
            max-width: 800px;
            margin: auto;
            min-height: 80vh;
        }

        /* Tab Animation */
        .tab {
            display: none;
            animation: fadeIn 0.5s ease forwards;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .tab.active {
            display: block;
        }

        /* Card Styling */
        .card {
            background: var(--card-bg);
            padding: 30px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        /* Profile Section */
        .profile-img {
            width: 110px;
            height: 110px;
            border-radius: 50%;
            margin-bottom: 20px;
            border: 4px solid var(--primary);
            padding: 3px;
            object-fit: cover;
        }

        .skill-badge {
            background: rgba(2, 6, 23, 0.6);
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 500;
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: transform 0.2s;
        }

        .skill-badge:hover {
            transform: translateY(-3px);
            border-color: var(--primary);
        }

        /* Endpoints */
        .endpoint-container {
            margin-top: 20px;
        }

        .endpoint {
            background: #020617;
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 15px;
            font-family: 'Fira Code', monospace;
            font-size: 13px;
            color: var(--primary);
            position: relative;
            border: 1px solid rgba(255, 255, 255, 0.03);
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .copy {
            position: absolute;
            right: 12px;
            bottom: 12px;
            background: var(--primary);
            color: #000;
            border: none;
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            transition: 0.2s;
        }

        .copy:hover {
            background: var(--primary-hover);
            transform: scale(1.05);
        }

        /* Footer */
        footer {
            text-align: center;
            padding: 40px 0;
            font-size: 13px;
            color: var(--text-dim);
            letter-spacing: 1px;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: var(--bg-dark); }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
    </style>
</head>
<body>

<header>
   
    <div class="nav">
        <button class="tabBtn active" onclick="openTab('dev', this)">Dev</button>
        <button class="tabBtn" onclick="openTab('about', this)">About</button>
        <button class="tabBtn" onclick="openTab('use', this)">Use</button>
        <button class="tabBtn" onclick="openTab('disclaimer', this)">Disclaimer</button>
    </div>
</header>

<div class="container">

    <div id="dev" class="tab active">
        <div class="card" style="text-align:center;">
            <img src="dev-logo.png" class="profile-img" alt="Anirban Sumon">
            <h2 style="font-size: 24px; margin-bottom: 5px;">Anirban Sumon</h2>
            <p style="color: var(--primary); font-weight: 600; margin-bottom: 15px; letter-spacing: 1px;">Full Stack Developer</p>

            <div style="font-size:15px; color: var(--text-dim); max-width: 500px; margin: 0 auto 25px;">
                Specialized in building high-performance streaming systems, 
                proxy infrastructure, and scalable backend services with modern security layers.
            </div>

            <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-bottom: 25px;">
                <span class="skill-badge" style="color:#22c55e;">PHP (Full)</span>
                <span class="skill-badge" style="color:#38bdf8;">Node.js (Full)</span>
                <span class="skill-badge" style="color:#a78bfa;">Python (Advanced)</span>
                <span class="skill-badge" style="color:#facc15;">JavaScript</span>
                <span class="skill-badge" style="color:#fb7185;">API Dev</span>
                <span class="skill-badge" style="color:#34d399;">Streaming</span>
            </div>

            <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                <a href="#" style="margin:0 15px; color:var(--accent-blue); text-decoration:none; font-size:14px; font-weight:500;">GitHub</a>
                <a href="#" style="margin:0 15px; color:var(--accent-blue); text-decoration:none; font-size:14px; font-weight:500;">Portfolio</a>
                <a href="#" style="margin:0 15px; color:var(--accent-blue); text-decoration:none; font-size:14px; font-weight:500;">Contact</a>
            </div>
        </div>
    </div>

    <div id="about" class="tab">
        <div class="card">
            <h2 style="margin-bottom:20px; border-left: 4px solid var(--primary); padding-left: 15px;">System Intelligence</h2>
            
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <p style="color: var(--text-dim); font-size: 15px;">
                    <b>Dynamic Auto Detection Proxy Script System</b> হলো একটি প্রিমিয়াম স্ট্রিমিং ইনফ্রাস্ট্রাকচার যা রিয়েল-টাইমে সোর্স শনাক্ত করে এবং নিরাপদ প্রক্সি লেয়ারের মাধ্যমে প্রসেস করে।
                </p>
                
                <div style="background: rgba(34, 197, 94, 0.05); padding: 15px; border-radius: 12px; border: 1px dashed rgba(34, 197, 94, 0.3);">
                    <h4 style="color: var(--primary); margin-bottom: 8px; font-size: 14px;">Core Features:</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: var(--text-main);">
                        <span>✔ Auto Detection</span>
                        <span>✔ Proxy Layering</span>
                        <span>✔ Token Security</span>
                        <span>✔ HLS/TS Delivery</span>
                        <span>✔ Anti-Scrape</span>
                        <span>✔ Source Masking</span>
                    </div>
                </div>

                <p style="color: var(--text-dim); font-size: 14px;">
                    এই সিস্টেমের মাধ্যমে অরিজিনাল সোর্সকে সম্পূর্ণ গোপন রেখে এনক্রিপ্টেড আউটপুট নিশ্চিত করা হয়, যা আপনার স্ট্রিমিং বিজনেসকে রাখে সুরক্ষিত।
                </p>
            </div>
        </div>
    </div>

    <div id="use" class="tab">
        <div class="card">
            <h2 style="margin-bottom:10px;">Streaming Endpoints</h2>
            <p style="color:var(--text-dim); font-size:14px; margin-bottom:20px;">Use these endpoints to integrate with your players.</p>

            <div class="endpoint-container">
                <div class="endpoint">
                    <span style="font-size: 11px; text-transform: uppercase; color: var(--text-dim);">HLS M3U8</span>
                    <code>https://example.com/:stream/index.m3u8</code>
                    <button class="copy" onclick="copyText(this, 'https://example.com/:stream/index.m3u8')">Copy Link</button>
                </div>

                <div class="endpoint">
                    <span style="font-size: 11px; text-transform: uppercase; color: var(--text-dim);">MPEG-TS</span>
                    <code>https://example.com/:stream/index.ts</code>
                    <button class="copy" onclick="copyText(this, 'https://example.com/:stream/index.ts')">Copy Link</button>
                </div>
            </div>

            <div style="margin-top:20px; display: flex; gap: 10px; flex-wrap: wrap;">
                <div style="background: rgba(56, 189, 248, 0.1); color: #38bdf8; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600;">⚡ LOW LATENCY</div>
                <div style="background: rgba(34, 197, 94, 0.1); color: #22c55e; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600;">🔐 SECURE TOKEN</div>
            </div>
        </div>
    </div>
    <div id="disclaimer" class="tab">
    <div class="card">
        <h2 style="margin-bottom:20px; color: #ef4444; border-left: 4px solid #ef4444; padding-left: 15px;">Legal Disclaimer</h2>
        
        <div style="display: flex; flex-direction: column; gap: 15px; line-height: 1.7;">
            <p style="color: var(--text-main); font-weight: 600;">
                এই স্ক্রিপ্ট বা সিস্টেমটি শুধুমাত্র শিক্ষামূলক এবং ব্যক্তিগত পরীক্ষার (Educational Purposes) জন্য তৈরি করা হয়েছে।
            </p>

            <div style="background: rgba(239, 68, 68, 0.1); padding: 20px; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.2);">
                <p style="color: #f87171; font-size: 14px;">
                    <b>সতর্কবার্তা:</b> যদি কোনো ব্যক্তি বা গোষ্ঠী এই কোড, স্ক্রিপ্ট বা সিস্টেমটি কোনো প্রকার অবৈধ কাজ, পাইরেসি বা কপিরাইট লঙ্ঘনের উদ্দেশ্যে ব্যবহার করে, তবে তার জন্য <b>ব্যবহারকারী নিজেই সম্পূর্ণ দায়ী থাকবেন।</b> 
                </p>
                <p style="color: #f87171; font-size: 14px; margin-top: 10px;">
                    এই সফটওয়্যারের অপব্যবহারের ফলে সৃষ্ট কোনো আইনি জটিলতা বা ক্ষতির জন্য এর <b>ডেভেলপার (Anirban Sumon) বা OTT-KING টিম কোনোভাবেই দায়ী থাকবে না।</b>
                </p>
            </div>

            <ul style="color: var(--text-dim); font-size: 13px; padding-left: 20px;">
                <li>সিস্টেমটি ব্যবহারের মাধ্যমে আপনি এই শর্তাবলীতে সম্মতি প্রদান করছেন।</li>
                <li>যেকোনো থার্ড-পার্টি কন্টেন্ট ব্যবহারের আগে তাদের পলিসি মেনে চলা আপনার দায়িত্ব।</li>
                <li>ডেভেলপার কোনো প্রকার অবৈধ ব্যবহারের সমর্থন বা উৎসাহ প্রদান করে না।</li>
            </ul>
        </div>
    </div>
</div>

</div>

<footer>
    &copy; 2026 OTT-KING BY <span style="color: var(--primary);">ANIRBANSUMON</span>
</footer>

<script>
    function openTab(tabId, btn) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tabBtn').forEach(b => b.classList.remove('active'));

        document.getElementById(tabId).classList.add('active');
        btn.classList.add('active');
        
        // Window scroll to top on tab change for better UX
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function copyText(btn, text) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = btn.innerText;
            btn.innerText = "Copied! ✓";
            btn.style.background = "#fff";
            btn.style.color = "#000";
            
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.background = "var(--primary)";
                btn.style.color = "#000";
            }, 2000);
        });
    }
</script>

</body>
</html>`);

});



module.exports = router;

  

# 🚀 OTT-KING Dynamic Proxy Scraper System
> **High-Performance HLS/IPTV Proxying & Stream Protection**

---

## 👤 Author Information
* **Author:** Anirban Sumon
* **Role:** Full Stack Developer & System Administrator
* **Project:** OTT - KING Premium Infrastructure

---

## 📖 Overview
**OTT-KING Proxy** একটি উন্নতমানের Node.js ভিত্তিক সিস্টেম যা স্ট্রিমিং সার্ভারের সোর্স ইউআরএল গোপন রেখে ক্লায়েন্টকে ভিডিও ডেলিভারি দেয়। এটি ডাইনামিকলি `all_streams.json` ফাইল থেকে সোর্স খুঁজে নেয় এবং টোকেনাইজড্ রিকোয়েস্টের মাধ্যমে সিকিউরিটি নিশ্চিত করে।

---

## ⚙️ How to Update Channels (`all_streams.json`)

চ্যানেল আপডেট করার সময় আপনাকে অবশ্যই JSON ফরম্যাট মেনে চলতে হবে। নিচে চ্যানেল যোগ করার সঠিক নিয়ম দেওয়া হলো।

### ১. চ্যানেল ডাটা ফরম্যাট (Copy Template)
নতুন চ্যানেল যোগ করতে নিচের কোডটুকু কপি করে `channels` অ্যারের ভেতরে পেস্ট করুন:

```json
{
  "id": "channel_id_here",
  "stream": "[https://source-url.com/live3.m3u8](https://source-url.com/live3.php)"
}

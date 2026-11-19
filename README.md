# 🛡️ AuraFind — Campus Lost & Found System (Hackathon Edition)

An AI-powered campus recovery grid engineered with **Apple Liquid Glassmorphism**, **Google Pixel 60FPS fluid physics**, **AI Semantic Discrepancy Matching**, and **Predictive Campus Loss Vulnerability Analytics**.

---

## 📁 Hackathon 3-File Architecture

As per hackathon regulations, the web frontend is split cleanly into three distinct files:
- **`index.html`**: Clean semantic markup, Apple Vision sheet modals, and segmented controls.
- **`style.css`**: Pure Apple Liquid Glassmorphism, specular refraction borders, SF Pro typography hierarchy, and 60Hz hardware-accelerated composite animations.
- **`app.js`**: Modular client logic containing the Input Sanity Validator, AI Semantic Matcher, and Campus Heatmap Visualizer.

---

## 🌟 New & Advanced Capabilities

### 1. Dual-Mode Reporting: "Found Item" vs "Missing Device Broadcast"
- **I Found Something:** Reporter specifies custody (Hostel Block/Floor/Room vs Guard Post), uploads a spot photo, and locks the item with **at least 3 security questions**.
- **I Lost Something (Broadcast before anyone finds it):** Owner broadcasts identifiable non-sensitive physical traits (**Brand/Company, Build Material/Finish, Observable Lockscreen Wallpaper, Case Color/Stickers, Last Seen Location Zone & Time**) without privacy breach or device unlocking.

### 2. Strict Input Sanity & Anti-Fake Guard
- **Phone Number:** Validates genuine 10-digit callable numbers. Automatically rejects dummy patterns (`0000000000`, `1234567890`, `1111111111`), invalid lengths, or random numbers without international prefixes.
- **Email Address:** Checks RFC regex and rejects disposable/temporary domains (`@tnjhg.com`, `@tempmail.com`, `@mailinator.com`, etc.) or consonant-cluster gibberish domains.
- **Name:** Ensures clean student names without numbers or suspicious symbols.

### 3. AI / ML Semantic Discrepancy Matching Engine
Handles natural real-world variations between finder and owner descriptions:
- **Wallpaper:** If finder enters *"Mountain"* and owner enters *"Mount Fuji"*, the AI recognizes Mount Fuji as a volcanic mountain and passes verification.
- **Color/Case:** If finder says *"Aqua"* and owner says *"Cyan"*, *"Light Blue"*, or *"Greenish Blue"*, the AI maps them to the same color cluster.
- **Charging Cable:** Automatically equates *"Type-C"* with *"USB-C"* or *"Thunderbolt"*.
- **Privacy Rule:** When verification score $\ge 75\%$, it reveals the custodian's **Hostel Floor & Room Number** (or Guard Desk) and **Callable Phone Number**, but **STRICTLY HIDES THE CUSTODIAN'S EMAIL** to prevent spam and privacy breaches.

### 4. Predictive Campus Loss Vulnerability Heatmap
Stores all data in an analytical format to answer: *"Where is a student most vulnerable to losing specific items?"*
- **Classrooms & Lecture Halls:** Laptop chargers (68%), Umbrellas (62%), Water bottles (48%).
- **Campus Restrooms:** Eyeglasses/Frames (76%), Smartwatches & Rings (58%).
- **Central Cafeteria:** Smartphones (65%), ID Cards & Wallets (52%).
- **Central Library:** Dongles / USB-C Hubs (54%), Stylus Pens (46%).

---

## 🚀 How to Run

### Partner's Setup (Docker Database)
```bash
docker compose up -d
```
Inspect tables and analytical views at **`http://localhost:8080`**.

### Frontend & API Server
```bash
python3 server.py
```
Open **`http://localhost:5000`** in your browser.

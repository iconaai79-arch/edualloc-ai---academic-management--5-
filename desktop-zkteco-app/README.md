# EduAI ZKTeco Desktop Attendance & Cloud Sync Agent

A standalone desktop application and Windows background service that connects directly to local **ZKTeco Biometric Terminals** (Fingerprint, Face Scan, RFID Card, PIN) over the local network (Port 4370) and automatically streams/synchronizes attendance logs in real time to the **EduAI Cloud Webhook**.

---

## Key Features

1. **Local LAN Protocol Engine**:
   - Communicates directly with ZKTeco hardware via standard UDP/TCP Port 4370.
   - Compatible with ZKTeco standalone terminals: **K40, F18, MB20, IN01, uFace, SilkBio, G3, S922, etc.**
   - No router port-forwarding or public IP required on the school/office network.

2. **Zero-Drop Offline Buffer**:
   - If the internet goes down, punches remain safely cached in local storage.
   - Automatically flushes all pending logs to the EduAI cloud once connectivity is restored.

3. **Multi-Terminal Fleet Support**:
   - Connect to multiple terminals simultaneously (*e.g., Gate 1, Staffroom, Library, Main Office*).

4. **Remote Device Control**:
   - **Time Sync**: Synchronize terminal hardware clocks with computer/cloud time.
   - **Remote Unlock**: Trigger remote 5-second relay unlocks for gates/doors.
   - **Voice Test**: Play terminal audio greeting ("Thank you").

5. **Windows System Tray**:
   - Runs silently in the background with auto-startup support.

---

## Quick Start (Running on Windows)

### 1. Prerequisites
- [Node.js](https://nodejs.org) (v18 or higher) installed on the desktop PC.

### 2. Launching the Agent
Simply double-click `run-agent.bat` or run in terminal:

```bash
cd desktop-zkteco-app
npm install
npm start
```

### 3. Configuration
1. Open the **Cloud Gateway** tab:
   - Set **Cloud Webhook URL**: `https://portal.eduai.co.ke` (or your domain).
   - Set **Institution ID**: Your school/enterprise ID.
2. Open the **Terminals** tab:
   - Click **+ Add Terminal** and enter your terminal's IP address (e.g. `192.168.1.201`).
   - Click **⚡ Test Link** to verify connection.
3. Turn on **Auto-Sync Polling** (*e.g., every 15 seconds*).

---

## Building Standalone Windows `.exe` Installer

To package this application into a standalone installer:

```bash
npm run build:win
```

The output `.exe` installer will be generated in `desktop-zkteco-app/dist-installer/`.

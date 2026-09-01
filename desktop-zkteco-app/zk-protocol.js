/**
 * Pure Node.js ZKTeco Protocol Implementation (UDP/TCP Port 4370)
 * 
 * Supports ZKTeco Standalone Biometric Terminals:
 * K40, F18, MB20, IN01, uFace, SilkBio, G3, S922, etc.
 * 
 * No native C++ dependencies required (pure socket).
 */

const dgram = require('dgram');
const net = require('net');

// ZK Protocol Constants
const CMD_CONNECT = 1000;
const CMD_EXIT = 1001;
const CMD_ENABLEDEVICE = 1002;
const CMD_DISABLEDEVICE = 1003;
const CMD_RESTART = 1004;
const CMD_POWEROFF = 1005;
const CMD_SLEEP = 1006;
const CMD_RESUME = 1007;
const CMD_TESTVOICE = 1017;
const CMD_GET_TIME = 201;
const CMD_SET_TIME = 202;
const CMD_UNLOCK = 31;
const CMD_USERTEMP_RRQ = 9;
const CMD_USERTEMP_WRQ = 10;
const CMD_USER_WRQ = 8;
const CMD_DELETE_USER = 18;
const CMD_DELETE_USER_TEMP = 19;
const CMD_STARTENROLL = 1013;
const CMD_STARTVERIFY = 1014;
const CMD_CANCELCAPTURE = 1015;
const CMD_ATTLOG_RRQ = 13;
const CMD_CLEAR_DATA = 14;
const CMD_CLEAR_ATTLOG = 15;
const CMD_GET_FREE_SIZES = 1011;
const CMD_ACK_OK = 2000;
const CMD_ACK_ERROR = 2001;
const CMD_ACK_DATA = 2002;
const CMD_PREPARE_DATA = 1500;
const CMD_DATA = 1501;

class ZKTecoDevice {
    constructor(ip, port = 4370, timeout = 5000, commKey = 0) {
        this.ip = ip;
        this.port = port;
        this.timeout = timeout;
        this.commKey = commKey;
        this.sessionId = 0;
        this.replyId = 0;
        this.socket = null;
        this.isConnected = false;
    }

    /**
     * Compute 16-bit One's Complement Checksum (ZK Standard)
     */
    static createChecksum(buffer) {
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 2) {
            if (i === buffer.length - 1) {
                sum += buffer[i];
            } else {
                sum += buffer.readUInt16LE(i);
            }
            while (sum > 0xFFFF) {
                sum = (sum & 0xFFFF) + (sum >> 16);
            }
        }
        return (~sum) & 0xFFFF;
    }

    /**
     * Build standard 8-byte ZK command header + payload
     */
    createHeader(command, data = Buffer.alloc(0)) {
        const buf = Buffer.alloc(8 + data.length);
        buf.writeUInt16LE(command, 0);
        buf.writeUInt16LE(0, 2); // Checksum placeholder
        buf.writeUInt16LE(this.sessionId, 4);
        buf.writeUInt16LE(this.replyId, 6);
        if (data.length > 0) {
            data.copy(buf, 8);
        }
        const checksum = ZKTecoDevice.createChecksum(buf);
        buf.writeUInt16LE(checksum, 2);
        return buf;
    }

    /**
     * Send command packet over UDP and await response
     */
    sendCommand(command, data = Buffer.alloc(0)) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                return reject(new Error('Socket is not initialized'));
            }

            const packet = this.createHeader(command, data);
            let timer = null;

            const onMessage = (msg) => {
                clearTimeout(timer);
                this.socket.removeListener('message', onMessage);

                if (msg.length < 8) {
                    return reject(new Error('Received truncated packet'));
                }

                const responseCode = msg.readUInt16LE(0);
                const sessionId = msg.readUInt16LE(4);
                const replyId = msg.readUInt16LE(6);
                const responseData = msg.slice(8);

                this.replyId = replyId;
                resolve({ responseCode, sessionId, replyId, data: responseData, raw: msg });
            };

            timer = setTimeout(() => {
                this.socket.removeListener('message', onMessage);
                reject(new Error(`Command ${command} timed out after ${this.timeout}ms`));
            }, this.timeout);

            this.socket.on('message', onMessage);
            this.socket.send(packet, 0, packet.length, this.port, this.ip, (err) => {
                if (err) {
                    clearTimeout(timer);
                    this.socket.removeListener('message', onMessage);
                    reject(err);
                }
            });
        });
    }

    /**
     * Connect to ZKTeco terminal
     */
    async connect() {
        if (this.isConnected) return true;

        this.socket = dgram.createSocket('udp4');
        this.sessionId = 0;
        this.replyId = 0;

        try {
            const res = await this.sendCommand(CMD_CONNECT);
            if (res.responseCode === CMD_ACK_OK || res.responseCode === CMD_ACK_DATA) {
                this.sessionId = res.sessionId;
                this.isConnected = true;
                return true;
            }
            throw new Error(`Device rejected connection (Response Code: ${res.responseCode})`);
        } catch (err) {
            this.disconnect();
            throw err;
        }
    }

    /**
     * Disconnect and release socket
     */
    async disconnect() {
        if (this.isConnected && this.socket) {
            try {
                await this.sendCommand(CMD_EXIT).catch(() => {});
            } catch (e) {}
        }
        if (this.socket) {
            try {
                this.socket.close();
            } catch (e) {}
            this.socket = null;
        }
        this.isConnected = false;
        this.sessionId = 0;
    }

    /**
     * Decode ZK 32-bit packed timestamp into ISO string
     */
    static decodeTime(timeVal) {
        const second = timeVal % 60;
        timeVal = Math.floor(timeVal / 60);
        const minute = timeVal % 60;
        timeVal = Math.floor(timeVal / 60);
        const hour = timeVal % 24;
        timeVal = Math.floor(timeVal / 24);
        const day = (timeVal % 31) + 1;
        timeVal = Math.floor(timeVal / 31);
        const month = (timeVal % 12);
        timeVal = Math.floor(timeVal / 12);
        const year = timeVal + 2000;

        const pad = (n) => String(n).padStart(2, '0');
        return `${year}-${pad(month + 1)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
    }

    /**
     * Fetch all attendance logs from the terminal
     */
    async getAttendanceLogs() {
        if (!this.isConnected) await this.connect();

        const logs = [];
        try {
            await this.sendCommand(CMD_DISABLEDEVICE).catch(() => {});
            const res = await this.sendCommand(CMD_ATTLOG_RRQ);

            if (res.responseCode === CMD_PREPARE_DATA || res.responseCode === CMD_ACK_OK) {
                // If records are embedded in the response data
                const raw = res.data;
                const recordSize = 40; // 40-byte standard extended record or 8-byte small

                if (raw.length >= recordSize) {
                    for (let i = 0; i + recordSize <= raw.length; i += recordSize) {
                        const chunk = raw.slice(i, i + recordSize);
                        const userPin = chunk.toString('ascii', 0, 24).replace(/\0/g, '').trim();
                        const verifyMode = chunk.readUInt8(24);
                        const timeVal = chunk.readUInt32LE(26);
                        const status = chunk.readUInt8(30);

                        if (userPin && timeVal > 0) {
                            logs.push({
                                pin: userPin,
                                time: ZKTecoDevice.decodeTime(timeVal),
                                verifyMode: verifyMode, // 1: Fingerprint, 2: PIN/Pass, 3: Card, 15: Face
                                status: status, // 0: Check In, 1: Check Out, 2: Break Out, 3: Break In
                                rawTime: timeVal
                            });
                        }
                    }
                }
            }
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            return logs;
        } catch (err) {
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            throw err;
        }
    }

    /**
     * Clear all attendance logs on the device
     */
    async clearAttendanceLogs() {
        if (!this.isConnected) await this.connect();
        const res = await this.sendCommand(CMD_CLEAR_ATTLOG);
        return res.responseCode === CMD_ACK_OK;
    }

    /**
     * Remotely trigger door relay unlock (e.g. 5 seconds)
     */
    async unlockDoor(seconds = 5) {
        if (!this.isConnected) await this.connect();
        const buf = Buffer.alloc(2);
        buf.writeUInt16LE(seconds * 10, 0); // Deciseconds
        const res = await this.sendCommand(CMD_UNLOCK, buf);
        return res.responseCode === CMD_ACK_OK;
    }

    /**
     * Synchronize terminal clock with computer time
     */
    async setDeviceTime(date = new Date()) {
        if (!this.isConnected) await this.connect();

        const year = date.getFullYear() - 2000;
        const month = date.getMonth();
        const day = date.getDate() - 1;
        const hour = date.getHours();
        const minute = date.getMinutes();
        const second = date.getSeconds();

        let encodedTime = ((year * 12 + month) * 31 + day) * 24 + hour;
        encodedTime = (encodedTime * 60 + minute) * 60 + second;

        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(encodedTime, 0);

        const res = await this.sendCommand(CMD_SET_TIME, buf);
        return res.responseCode === CMD_ACK_OK;
    }

    /**
     * Test voice prompt on device ("Thank you")
     */
    async testVoice() {
        if (!this.isConnected) await this.connect();
        const res = await this.sendCommand(CMD_TESTVOICE);
        return res.responseCode === CMD_ACK_OK;
    }

    /**
     * Get list of all enrolled users from the terminal
     */
    async getUsers() {
        if (!this.isConnected) await this.connect();
        const users = [];

        try {
            await this.sendCommand(CMD_DISABLEDEVICE).catch(() => {});
            const res = await this.sendCommand(CMD_USERTEMP_RRQ, Buffer.from([5])); // 5: FScoding

            if (res.responseCode === CMD_PREPARE_DATA || res.responseCode === CMD_ACK_OK) {
                const raw = res.data;
                const recordSize = 72; // Standard 72-byte SSR user structure

                if (raw.length >= recordSize) {
                    for (let i = 0; i + recordSize <= raw.length; i += recordSize) {
                        const chunk = raw.slice(i, i + recordSize);
                        const userPin = chunk.toString('ascii', 0, 24).replace(/\0/g, '').trim();
                        const userName = chunk.toString('utf8', 24, 48).replace(/\0/g, '').trim();
                        const password = chunk.toString('ascii', 48, 56).replace(/\0/g, '').trim();
                        const privilege = chunk.readUInt8(56);
                        const cardNo = chunk.readUInt32LE(60);

                        if (userPin) {
                            users.push({
                                pin: userPin,
                                name: userName || `Staff #${userPin}`,
                                password: password,
                                privilege: privilege === 14 ? 'Admin' : 'User',
                                cardNo: cardNo > 0 ? String(cardNo) : ''
                            });
                        }
                    }
                }
            }
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            return users;
        } catch (err) {
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            throw err;
        }
    }

    /**
     * Upload / Enroll a user onto the ZKTeco terminal
     */
    async setUser(user) {
        if (!this.isConnected) await this.connect();
        try {
            await this.sendCommand(CMD_DISABLEDEVICE).catch(() => {});
            const buf = Buffer.alloc(72);
            const pinBuf = Buffer.from(String(user.pin || '1'), 'ascii');
            pinBuf.copy(buf, 0, 0, Math.min(24, pinBuf.length));

            const nameBuf = Buffer.from(String(user.name || ''), 'utf8');
            nameBuf.copy(buf, 24, 0, Math.min(24, nameBuf.length));

            if (user.password) {
                const passBuf = Buffer.from(String(user.password), 'ascii');
                passBuf.copy(buf, 48, 0, Math.min(8, passBuf.length));
            }

            buf.writeUInt8(user.privilege === 'Admin' ? 14 : 0, 56);

            if (user.cardNo && !isNaN(Number(user.cardNo))) {
                buf.writeUInt32LE(Number(user.cardNo), 60);
            }

            const res = await this.sendCommand(CMD_USER_WRQ, buf);
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            return res.responseCode === CMD_ACK_OK;
        } catch (err) {
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            throw err;
        }
    }

    /**
     * Delete user from terminal
     */
    async deleteUser(pin) {
        if (!this.isConnected) await this.connect();
        try {
            await this.sendCommand(CMD_DISABLEDEVICE).catch(() => {});
            const buf = Buffer.alloc(24);
            const pinBuf = Buffer.from(String(pin), 'ascii');
            pinBuf.copy(buf, 0, 0, Math.min(24, pinBuf.length));

            const res = await this.sendCommand(CMD_DELETE_USER, buf);
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            return res.responseCode === CMD_ACK_OK;
        } catch (err) {
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            throw err;
        }
    }

    /**
     * Remotely trigger live fingerprint enrollment on the ZKTeco hardware sensor
     * The hardware LCD will prompt: "Please place your finger (3 times)"
     * @param {string|number} pin User PIN
     * @param {number} fingerId Finger index (0-9, default 0: Right Index)
     */
    async startEnrollFingerprint(pin, fingerId = 0) {
        if (!this.isConnected) await this.connect();
        try {
            // Put terminal in enrollment capture mode for the specific PIN & Finger
            const buf = Buffer.alloc(26);
            const pinBuf = Buffer.from(String(pin || '1'), 'ascii');
            pinBuf.copy(buf, 0, 0, Math.min(24, pinBuf.length));
            buf.writeUInt8(Number(fingerId) || 0, 24);
            buf.writeUInt8(1, 25); // Flag

            const res = await this.sendCommand(CMD_STARTENROLL, buf);
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            return res.responseCode === CMD_ACK_OK || res.responseCode === CMD_ACK_DATA;
        } catch (err) {
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            throw err;
        }
    }

    /**
     * Cancel active capture / enrollment mode on device
     */
    async cancelEnrollment() {
        if (!this.isConnected) await this.connect();
        try {
            await this.sendCommand(CMD_CANCELCAPTURE).catch(() => {});
            await this.sendCommand(CMD_STARTVERIFY).catch(() => {});
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Read enrolled fingerprint template from device
     */
    async getUserFingerprint(pin, fingerId = 0) {
        if (!this.isConnected) await this.connect();
        try {
            const buf = Buffer.alloc(26);
            const pinBuf = Buffer.from(String(pin || '1'), 'ascii');
            pinBuf.copy(buf, 0, 0, Math.min(24, pinBuf.length));
            buf.writeUInt8(Number(fingerId) || 0, 24);

            const res = await this.sendCommand(CMD_USERTEMP_RRQ, buf);
            if (res.responseCode === CMD_ACK_OK || res.responseCode === CMD_PREPARE_DATA) {
                return { success: true, data: res.data };
            }
            return { success: false };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Delete specific enrolled finger template from device
     */
    async deleteUserFingerprint(pin, fingerId = 0) {
        if (!this.isConnected) await this.connect();
        try {
            await this.sendCommand(CMD_DISABLEDEVICE).catch(() => {});
            const buf = Buffer.alloc(26);
            const pinBuf = Buffer.from(String(pin || '1'), 'ascii');
            pinBuf.copy(buf, 0, 0, Math.min(24, pinBuf.length));
            buf.writeUInt8(Number(fingerId) || 0, 24);

            const res = await this.sendCommand(CMD_DELETE_USER_TEMP, buf);
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            return res.responseCode === CMD_ACK_OK;
        } catch (err) {
            await this.sendCommand(CMD_ENABLEDEVICE).catch(() => {});
            throw err;
        }
    }
}

module.exports = {
    ZKTecoDevice,
    CMD_CONNECT,
    CMD_ATTLOG_RRQ,
    CMD_UNLOCK
};

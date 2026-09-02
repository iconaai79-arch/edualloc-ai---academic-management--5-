/**
 * Pure Node.js ZKTeco Protocol Implementation (Dual TCP / UDP on Port 4370)
 * 
 * Supports ZKTeco Standalone Biometric & Access Control Terminals:
 * K40, F18, MB20, MB100, IN01, uFace, SilkBio, G3, S922, Horus, SenseFace, etc.
 * 
 * Includes Dual-Mode transport (Automatic fallback between TCP and UDP)
 * and support for Communication Keys (CommKey).
 */

const dgram = require('dgram');
const net = require('net');

// ZK Protocol Commands
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
const CMD_AUTH = 1102;
const CMD_ACK_OK = 2000;
const CMD_ACK_ERROR = 2001;
const CMD_ACK_DATA = 2002;
const CMD_ACK_UNAUTH = 2005;
const CMD_PREPARE_DATA = 1500;
const CMD_DATA = 1501;


function makeCommKey(key, sessionId) {
    key = Number(key) || 0;
    let k = 0;
    for (let i = 0; i < 32; i++) {
        if ((key & (1 << i)) !== 0) {
            k = ((k << 1) | 1) >>> 0;
        } else {
            k = (k << 1) >>> 0;
        }
    }
    k = (k + sessionId) >>> 0;
    const kXor = (k ^ 0x4F534B5A) >>> 0;
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(kXor, 0);
    return buf;
}

// ZK TCP Magic Header: 0x50 0x50 0x82 0x7D ('PP\x82}')
const ZK_TCP_MAGIC = Buffer.from([0x50, 0x50, 0x82, 0x7D]);

class ZKTecoDevice {
    constructor(ip, port = 4370, timeout = 4000, commKey = 0, preferredProtocol = 'auto') {
        this.ip = (ip || '').trim();
        this.port = Number(port) || 4370;
        this.timeout = timeout;
        this.commKey = Number(commKey) || 0;
        this.preferredProtocol = preferredProtocol || 'auto'; // 'auto', 'tcp', 'udp'
        this.protocolMode = null; // 'tcp' or 'udp' after successful connect
        this.sessionId = 0;
        this.replyId = 0;
        this.udpSocket = null;
        this.tcpSocket = null;
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
        }
        while (sum > 0xFFFF) {
            sum = (sum & 0xFFFF) + (sum >> 16);
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
    sendUdpCommand(command, data = Buffer.alloc(0)) {
        return new Promise((resolve, reject) => {
            if (!this.udpSocket) {
                return reject(new Error('UDP socket is not initialized'));
            }

            const packet = this.createHeader(command, data);
            let timer = null;

            const onMessage = (msg) => {
                clearTimeout(timer);
                this.udpSocket.removeListener('message', onMessage);

                if (msg.length < 8) {
                    return reject(new Error('Received truncated UDP packet'));
                }

                const responseCode = msg.readUInt16LE(0);
                const sessionId = msg.readUInt16LE(4);
                const replyId = msg.readUInt16LE(6);
                const responseData = msg.slice(8);

                this.replyId = replyId;
                resolve({ responseCode, sessionId, replyId, data: responseData, raw: msg });
            };

            timer = setTimeout(() => {
                if (this.udpSocket) this.udpSocket.removeListener('message', onMessage);
                reject(new Error(`UDP Command ${command} timed out after ${this.timeout}ms`));
            }, this.timeout);

            this.udpSocket.on('message', onMessage);
            this.udpSocket.send(packet, 0, packet.length, this.port, this.ip, (err) => {
                if (err) {
                    clearTimeout(timer);
                    if (this.udpSocket) this.udpSocket.removeListener('message', onMessage);
                    reject(err);
                }
            });
        });
    }

    /**
     * Send command packet over TCP and await response
     */
    sendTcpCommand(command, data = Buffer.alloc(0)) {
        return new Promise((resolve, reject) => {
            if (!this.tcpSocket || this.tcpSocket.destroyed) {
                return reject(new Error('TCP socket is not connected'));
            }

            const zkPacket = this.createHeader(command, data);
            // ZKTeco TCP Frame: 4 bytes Magic + 4 bytes Length + ZK Packet
            const tcpHeader = Buffer.alloc(8);
            ZK_TCP_MAGIC.copy(tcpHeader, 0);
            tcpHeader.writeUInt32LE(zkPacket.length, 4);
            const fullFrame = Buffer.concat([tcpHeader, zkPacket]);

            let incoming = Buffer.alloc(0);
            let timer = null;

            const onData = (chunk) => {
                incoming = Buffer.concat([incoming, chunk]);

                // Check for standard ZK TCP frame (min 16 bytes: 8 header + 8 ZK packet)
                if (incoming.length >= 16) {
                    // Check magic
                    if (incoming.slice(0, 4).equals(ZK_TCP_MAGIC)) {
                        const payloadLen = incoming.readUInt32LE(4);
                        if (incoming.length >= 8 + payloadLen) {
                            cleanup();
                            const msg = incoming.slice(8, 8 + payloadLen);
                            const responseCode = msg.readUInt16LE(0);
                            const sessionId = msg.readUInt16LE(4);
                            const replyId = msg.readUInt16LE(6);
                            const responseData = msg.slice(8);

                            this.replyId = replyId;
                            resolve({ responseCode, sessionId, replyId, data: responseData, raw: msg });
                        }
                    } else if (incoming.length >= 8) {
                        // Some TCP implementations reply without magic
                        cleanup();
                        const responseCode = incoming.readUInt16LE(0);
                        const sessionId = incoming.readUInt16LE(4);
                        const replyId = incoming.readUInt16LE(6);
                        const responseData = incoming.slice(8);

                        this.replyId = replyId;
                        resolve({ responseCode, sessionId, replyId, data: responseData, raw: incoming });
                    }
                }
            };

            const cleanup = () => {
                clearTimeout(timer);
                if (this.tcpSocket) {
                    this.tcpSocket.removeListener('data', onData);
                    this.tcpSocket.removeListener('error', onError);
                    this.tcpSocket.removeListener('close', onClose);
                }
            };

            const onError = (err) => {
                cleanup();
                reject(err);
            };

            const onClose = () => {
                cleanup();
                reject(new Error('TCP connection closed unexpectedly'));
            };

            timer = setTimeout(() => {
                cleanup();
                reject(new Error(`TCP Command ${command} timed out after ${this.timeout}ms`));
            }, this.timeout);

            this.tcpSocket.on('data', onData);
            this.tcpSocket.on('error', onError);
            this.tcpSocket.on('close', onClose);

            this.tcpSocket.write(fullFrame, (err) => {
                if (err) {
                    cleanup();
                    reject(err);
                }
            });
        });
    }

    /**
     * Send command using currently active protocol
     */
    sendCommand(command, data = Buffer.alloc(0)) {
        if (this.protocolMode === 'tcp') {
            return this.sendTcpCommand(command, data);
        }
        return this.sendUdpCommand(command, data);
    }

    /**
     * Attempt TCP Connection
     */
    async connectTcp() {
        await this.disconnect();
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            let timer = setTimeout(() => {
                socket.destroy();
                reject(new Error(`TCP connection to ${this.ip}:${this.port} timed out`));
            }, Math.min(this.timeout, 3000));

            socket.connect(this.port, this.ip, async () => {
                clearTimeout(timer);
                this.tcpSocket = socket;
                this.sessionId = 0;
                this.replyId = 0;
                this.protocolMode = 'tcp';

                try {
                    const res = await this.sendTcpCommand(CMD_CONNECT);
                    if (res.responseCode === CMD_ACK_OK || res.responseCode === CMD_ACK_DATA || res.responseCode === CMD_ACK_UNAUTH) {
                        this.sessionId = res.sessionId;
                        if (res.responseCode === CMD_ACK_UNAUTH || (this.commKey && this.commKey !== 0)) {
                            if (!this.commKey || this.commKey === 0) {
                                throw new Error(`Terminal requires a Comm Key / Password (Code: 2005). Please edit the terminal in settings and enter its Comm Key.`);
                            }
                            const authBuf = makeCommKey(this.commKey, this.sessionId);
                            const authRes = await this.sendTcpCommand(CMD_AUTH, authBuf);
                            if (authRes.responseCode !== CMD_ACK_OK && authRes.responseCode !== CMD_ACK_DATA) {
                                throw new Error(`Authentication failed (Code: ${authRes.responseCode}): Incorrect Comm Key / Password. Please check the terminal settings.`);
                            }
                        }
                        this.isConnected = true;
                        resolve(true);
                    } else {
                        reject(new Error(`Device rejected TCP connection (Code: ${res.responseCode})`));
                    }
                } catch (err) {
                    this.disconnect();
                    reject(err);
                }
            });

            socket.on('error', (err) => {
                clearTimeout(timer);
                socket.destroy();
                reject(err);
            });
        });
    }

    /**
     * Attempt UDP Connection
     */
    async connectUdp() {
        await this.disconnect();
        this.udpSocket = dgram.createSocket('udp4');
        this.sessionId = 0;
        this.replyId = 0;
        this.protocolMode = 'udp';

        try {
            const res = await this.sendUdpCommand(CMD_CONNECT);
            if (res.responseCode === CMD_ACK_OK || res.responseCode === CMD_ACK_DATA || res.responseCode === CMD_ACK_UNAUTH) {
                this.sessionId = res.sessionId;
                if (res.responseCode === CMD_ACK_UNAUTH || (this.commKey && this.commKey !== 0)) {
                    if (!this.commKey || this.commKey === 0) {
                        throw new Error(`Terminal requires a Comm Key / Password (Code: 2005). Please edit the terminal in settings and enter its Comm Key.`);
                    }
                    const authBuf = makeCommKey(this.commKey, this.sessionId);
                    const authRes = await this.sendUdpCommand(CMD_AUTH, authBuf);
                    if (authRes.responseCode !== CMD_ACK_OK && authRes.responseCode !== CMD_ACK_DATA) {
                        throw new Error(`Authentication failed (Code: ${authRes.responseCode}): Incorrect Comm Key / Password. Please check the terminal settings.`);
                    }
                }
                this.isConnected = true;
                return true;
            }
            throw new Error(`Device rejected UDP connection (Code: ${res.responseCode})`);
        } catch (err) {
            this.disconnect();
            throw err;
        }
    }

    /**
     * Dual-Mode Connect (Tries Preferred Protocol, then auto-falls back)
     */
    async connect() {
        if (this.isConnected) return true;

        if (this.preferredProtocol === 'tcp') {
            return await this.connectTcp();
        } else if (this.preferredProtocol === 'udp') {
            return await this.connectUdp();
        }

        // Auto-detect mode: Try TCP first (modern terminals), then fall back to UDP
        try {
            return await this.connectTcp();
        } catch (tcpErr) {
            try {
                return await this.connectUdp();
            } catch (udpErr) {
                throw new Error(`Failed to connect over TCP (${tcpErr.message}) and UDP (${udpErr.message}). Check Port 4370 and firewall.`);
            }
        }
    }

    /**
     * Disconnect and release both TCP and UDP sockets
     */
    async disconnect() {
        if (this.isConnected) {
            try {
                await this.sendCommand(CMD_EXIT).catch(() => {});
            } catch (e) {}
        }

        if (this.tcpSocket) {
            try {
                this.tcpSocket.destroy();
            } catch (e) {}
            this.tcpSocket = null;
        }

        if (this.udpSocket) {
            try {
                this.udpSocket.close();
            } catch (e) {}
            this.udpSocket = null;
        }

        this.isConnected = false;
        this.sessionId = 0;
        this.protocolMode = null;
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

            if (res.responseCode === CMD_PREPARE_DATA || res.responseCode === CMD_ACK_OK || res.responseCode === CMD_ACK_DATA) {
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

            if (res.responseCode === CMD_PREPARE_DATA || res.responseCode === CMD_ACK_OK || res.responseCode === CMD_ACK_DATA) {
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
     */
    async startEnrollFingerprint(pin, fingerId = 0) {
        if (!this.isConnected) await this.connect();
        try {
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
            if (res.responseCode === CMD_ACK_OK || res.responseCode === CMD_PREPARE_DATA || res.responseCode === CMD_ACK_DATA) {
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

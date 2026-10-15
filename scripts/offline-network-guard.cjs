/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test/preload scripts. */
// Preloaded only by the offline check runner; no database or HTTP connections allowed.
const net = require('node:net');
const tls = require('node:tls');
const http = require('node:http');
const https = require('node:https');
const deny = () => { throw new Error('Network access is disabled during offline checks.'); };
net.Socket.prototype.connect = deny;
net.connect = deny;
net.createConnection = deny;
tls.connect = deny;
http.request = deny;
http.get = deny;
https.request = deny;
https.get = deny;
globalThis.fetch = deny;

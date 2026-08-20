const path = require('path');
const fs = require('fs');
const os = require('os');
const RammerheadJSFileCache = require('./classes/RammerheadJSFileCache.js');

const enableWorkers = os.cpus().length !== 1;

module.exports = {
    //// HOSTING CONFIGURATION ////

    bindingAddress: '0.0.0.0', // 『改造』127.0.0.1から変更（外部からの接続を受け付けるため）
    port: 8080,
    crossDomainPort: 8081,
    publicDir: path.join(__dirname, '../public'),

    enableWorkers,
    workers: os.cpus().length,
    ssl: null,

    // 『改造』Hugging FaceやRenderなどのリバースプロキシ環境でURL書き換えを正常化する設定
    getServerInfo: (req) => {
        if (!req || !req.headers || !req.headers.host) {
            return { hostname: 'localhost', port: 8080, crossDomainPort: 8081, protocol: 'http:' };
        }
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const protocol = req.headers['x-forwarded-proto'] ? req.headers['x-forwarded-proto'] + ':' : 'https:';
        return {
            hostname: host.split(':')[0],
            port: protocol === 'https:' ? 443 : 80,
            crossDomainPort: protocol === 'https:' ? 443 : 80,
            protocol: protocol
        };
    },

    password: 'sharkie4life', // 必要に応じて好きなパスワードに変更してください

    disableLocalStorageSync: false,
    
    // 『改造』falseに変更（iPhoneの回線IPが変わったり、Chromebookからアクセスしたりしてもセッションが切れないようにする）
    restrictSessionToIP: false,

    jsCache: new RammerheadJSFileCache(path.join(__dirname, '../cache-js'), 5 * 1024 * 1024 * 1024, 50000, enableWorkers),
    disableHttp2: false,

    //// REWRITE HEADER CONFIGURATION (最重要の改造部分) ////

    // 『改造』一般的なクラウドプロキシのヘッダーをすべて削除し、検閲をすり抜ける
    stripClientHeaders: ['cf-ipcountry', 'cf-ray', 'x-forwarded-proto', 'cf-visitor', 'cf-connecting-ip', 'cdn-loop', 'x-forwarded-for'],
    
    // 『改造』サイト側のセキュリティ（ブロック機能）を強制的に解除する設定
    rewriteServerHeaders: {
        // X-Frame-Optionsを削除（プロキシ内のiFrameでYouTubeやSNSがブロックされるのを防ぐ）
        'x-frame-options': null,
        // Content-Security-Policyを削除（GoogleやX、Discordなどの高度なサイトの挙動ブロックを回避）
        'content-security-policy': null,
        'content-security-policy-report-only': null,
        // 外部へのリダイレクトやクッキーのバグを防ぐ
        'cross-origin-opener-policy': null,
        'cross-origin-embedder-policy': null
    },

    //// SESSION STORE CONFIG ////

    fileCacheSessionConfig: {
        saveDirectory: path.join(__dirname, '../sessions'),
        cacheTimeout: 1000 * 60 * 20,
        cacheCheckInterval: 1000 * 60 * 10,
        deleteUnused: true,
        staleCleanupOptions: {
            staleTimeout: 1000 * 60 * 60 * 24 * 3,
            maxToLive: null,
            staleCheckInterval: 1000 * 60 * 60 * 6
        },
        deleteCorruptedSessions: true,
    },

    //// LOGGING CONFIGURATION ////

    logLevel: 'info',
    generatePrefix: (level) => `[${new Date().toISOString()}] [${level.toUpperCase()}] `,

    // 『改造』プロキシ（NginxやCloudflare）背後でも正しくIPを取得する
    getIP: (req) => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()
};

if (fs.existsSync(path.join(__dirname, '../config.js'))) Object.assign(module.exports, require('../config'));

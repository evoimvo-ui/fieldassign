const http = require('http');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const session = args.find(a => a.startsWith('--session='))?.split('=')[1];
const portArg = args.find(a => a.startsWith('--port='))?.split('=')[1] || '7777';
const outdir = args.find(a => a.startsWith('--outdir='))?.split('=')[1] || '.dbg';
const clean = args.includes('--clean');

if (!session) {
    console.error('Error: --session is required');
    process.exit(1);
}

if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

const logFile = path.join(outdir, `trae-debug-log-${session}.ndjson`);
if (clean && fs.existsSync(logFile)) fs.truncateSync(logFile, 0);

const envFile = path.join(outdir, `${session}.env`);

function startServer(port) {
    const server = http.createServer((req, res) => {
        // CORS Headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
        }

        if (req.method === 'POST' && req.url === '/event') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const event = JSON.parse(body);
                    event.ts = event.ts || Date.now();
                    fs.appendFileSync(logFile, JSON.stringify(event) + '\n');
                    res.statusCode = 200;
                    res.end('ok');
                } catch (e) {
                    res.statusCode = 400;
                    res.end('invalid json');
                }
            });
            return;
        }

        if (req.method === 'GET' && req.url === '/health') {
            res.statusCode = 200;
            res.end(JSON.stringify({ status: 'ok', session }));
            return;
        }

        res.statusCode = 404;
        res.end();
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} in use, trying ${port + 1}`);
            startServer(port + 1);
        } else {
            console.error(err);
        }
    });

    server.listen(port, '127.0.0.1', () => {
        const url = `http://127.0.0.1:${port}/event`;
        console.log(`Debug Server running at ${url}`);
        fs.writeFileSync(envFile, `DEBUG_SERVER_URL=${url}\nDEBUG_SESSION_ID=${session}\n`);
        console.log(`Environment file written to ${envFile}`);
    });
}

startServer(parseInt(portArg));

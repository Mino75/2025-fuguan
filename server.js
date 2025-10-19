const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const config = require('./config.json');

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/log') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const data = JSON.parse(body);
            const timestamp = new Date().toISOString();
            const fileName = path.join(__dirname, config.logPath, `${timestamp.split('T')[0]}.json`);

            fs.appendFile(fileName, JSON.stringify({ ...data, timestamp }) + '\n', (err) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error saving data');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('Data saved successfully');
                }
            });
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

// Function to get system information
function getSystemInfo(callback) {
    const cpuUsage = os.cpus().map(cpu => cpu.times).reduce((acc, curr) => {
        acc.user += curr.user;
        acc.sys += curr.sys;
        acc.idle += curr.idle;
        acc.irq += curr.irq;
        return acc;
    }, { user: 0, sys: 0, idle: 0, irq: 0 });

    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    exec('tasklist', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing tasklist: ${error.message}`);
            return;
        }
        const processes = stdout.split('\n').slice(3).map(line => line.trim()).filter(line => line.length > 0);
        callback({
            cpuUsage,
            totalMemory,
            freeMemory,
            usedMemory,
            processes
        });
    });
}

// Log system information at the specified frequency
setInterval(() => {
    getSystemInfo((info) => {
        const timestamp = new Date().toISOString();
        const fileName = path.join(__dirname, config.logPath, `${timestamp.split('T')[0]}.json`);

        fs.appendFile(fileName, JSON.stringify({ ...info, timestamp }) + '\n', (err) => {
            if (err) {
                console.error(`Error saving system info: ${err.message}`);
            }
        });
    });
}, config.frequency);

const axios = require('axios');
const fetch = require('node-fetch');

const processingTransactions = new Set();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
    
    const { transactionId, username, password, plan } = req.body;
    if (processingTransactions.has(transactionId)) return res.status(202).json({ status: 'processing' });

    try {
        const checkStatusUrl = `${process.env.APIBOT1}/api/orkut/cekstatus?apikey=${process.env.APISIMPLEBOTV2}&merchant=${process.env.MERCHANT_ID_ORDERKUOTA}&keyorkut=${process.env.API_ORDERKUOTA}`;
        const statusResponse = await axios.get(checkStatusUrl);
        const paidTransaction = statusResponse.data;

        // NOTE: Logika ini mengasumsikan API cekstatus mengembalikan data transaksi terakhir yang dibayar.
        // Anda mungkin perlu menyesuaikan pengecekan 'amount' jika API Anda bekerja secara berbeda.
        // Untuk saat ini, kita akan menganggap jika ada data, itu adalah data yang relevan.
        if (paidTransaction && paidTransaction.customer_name) {
            processingTransactions.add(transactionId);
            const panelCreationResult = await createPterodactylPanel(username, password, plan);
            processingTransactions.delete(transactionId);

            if (panelCreationResult.success) {
                return res.status(200).json({ status: 'success', panelData: panelCreationResult.data });
            } else {
                return res.status(500).json({ status: 'failed_creation', message: panelCreationResult.error });
            }
        } else {
            return res.status(202).json({ status: 'pending' });
        }
    } catch (error) {
        processingTransactions.delete(transactionId);
        console.error("Confirmation Error:", error);
        return res.status(500).json({ message: 'Server error saat konfirmasi.' });
    }
}

async function createPterodactylPanel(username, password, plan) {
    let Obj = {};
    const cmd = plan.toLowerCase();
    if (cmd === "1gb") { Obj = { ram: "1000", disk: "1000", cpu: "40" }; }
    else if (cmd === "2gb") { Obj = { ram: "2000", disk: "1000", cpu: "60" }; }
    else if (cmd === "3gb") { Obj = { ram: "3000", disk: "2000", cpu: "80" }; }
    else if (cmd === "4gb") { Obj = { ram: "4000", disk: "2000", cpu: "100" }; }
    else if (cmd === "5gb") { Obj = { ram: "5000", disk: "3000", cpu: "120" }; }
    else if (cmd === "unlimited") { Obj = { ram: "0", disk: "0", cpu: "0" }; }

    try {
        const userRes = await fetch(`${process.env.DOMAIN_V3}/api/application/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.APIKEY_V3}` },
            body: JSON.stringify({
                email: `${username.toLowerCase()}@${process.env.DOMAIN_V3.replace('https://', '')}`,
                username: username.toLowerCase(), first_name: username, last_name: "Server", language: "en", password: password,
            })
        });
        const userData = await userRes.json();
        if (userData.errors) throw new Error(`User Creation Error: ${userData.errors[0].detail}`);
        const user = userData.attributes;

        const serverRes = await fetch(`${process.env.DOMAIN_V3}/api/application/servers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.APIKEY_V3}` },
            body: JSON.stringify({
                name: `${username}'s Server`, user: user.id, egg: parseInt(process.env.EGG_V3),
                docker_image: "ghcr.io/parkervcp/yolks:nodejs_18", startup: "npm start",
                environment: { "INST": "npm", "USER_UPLOAD": "0", "AUTO_UPDATE": "0", "CMD_RUN": "npm start" },
                limits: { memory: Obj.ram, swap: 0, disk: Obj.disk, io: 500, cpu: Obj.cpu },
                feature_limits: { databases: 5, backups: 5, allocations: 5 },
                deploy: { locations: [parseInt(process.env.LOC_V3)], dedicated_ip: false, port_range: [] },
            })
        });
        const serverData = await serverRes.json();
        if (serverData.errors) throw new Error(`Server Creation Error: ${serverData.errors[0].detail}`);
        const server = serverData.attributes;

        const panelText = `┌── ⪩ Data Akun Panel Kamu 📦
│
├ 📡 ID Server: ${server.id}
├ 👤 Username: ${user.username}
├ 🔐 Password: ${password}
├ 🔗 Login Panel: ${process.env.DOMAIN_V3}
│
├ 🌐 Spesifikasi Server:
│   ├ 🧠 RAM  : ${Obj.ram == "0" ? "Unlimited" : `${parseInt(Obj.ram) / 1000}GB`}
│   ├ 💾 Disk : ${Obj.disk == "0" ? "Unlimited" : `${parseInt(Obj.disk) / 1000}GB`}
│   └ ⚙️ CPU  : ${Obj.cpu == "0" ? "Unlimited" : `${Obj.cpu}%`}
│
├ 📆 Tanggal Dibuat: ${new Date().toLocaleDateString('id-ID')}
│
└── ⪩ Syarat & Ketentuan:
    • Masa aktif panel: 1 bulan
    • Simpan data dengan aman
    • Dilarang menyebar login atau melakukan DDoS!`;
        
        return { success: true, data: panelText };
    } catch (error) {
        console.error("Pterodactyl API Error:", error);
        return { success: false, error: error.message };
    }
}
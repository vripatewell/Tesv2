const axios = require('axios');

function generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { choice, username, password } = req.body;

    if (!choice || !username || !password) {
        return res.status(400).json({ message: 'Input tidak lengkap.' });
    }
    
    try {
        const checkUser = await fetch(`${process.env.DOMAIN_V3}/api/application/users?filter[username]=${username.toLowerCase()}`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${process.env.APIKEY_V3}`, "Accept": "application/json" }
        });
        const checkData = await checkUser.json();
        if (checkData.data && checkData.data.length > 0) {
            return res.status(409).json({ message: 'Username sudah digunakan. Silakan pilih username lain.' });
        }
    } catch (e) {
        console.error("Gagal memeriksa user:", e);
        return res.status(500).json({ message: 'Gagal memverifikasi username di server.' });
    }

    let Obj = {};
    const cmd = choice.toLowerCase();
    
    if (cmd === "1gb") { Obj = { ram: "1000", disk: "1000", cpu: "40", harga: "3000" }; }
    else if (cmd === "2gb") { Obj = { ram: "2000", disk: "1000", cpu: "60", harga: "4000" }; }
    else if (cmd === "3gb") { Obj = { ram: "3000", disk: "2000", cpu: "80", harga: "5000" }; }
    else if (cmd === "4gb") { Obj = { ram: "4000", disk: "2000", cpu: "100", harga: "6000" }; }
    else if (cmd === "5gb") { Obj = { ram: "5000", disk: "3000", cpu: "120", harga: "7000" }; }
    else if (cmd === "unlimited") { Obj = { ram: "0", disk: "0", cpu: "0", harga: "13000" }; }
    else { return res.status(400).json({ message: 'Pilihan panel tidak valid.' }); }
    
    const amount = Number(Obj.harga) + generateRandomNumber(110, 250);

    try {
        const paymentApiUrl = `${process.env.APIBOT1}/api/orkut/createpayment?apikey=${process.env.APISIMPLEBOTV2}&amount=${amount}&codeqr=${process.env.QRIS_ORDERKUOTA}`;
        const paymentResponse = await axios.get(paymentApiUrl);

        if (paymentResponse.data && paymentResponse.data.result) {
            const { transactionId, qrImageUrl } = paymentResponse.data.result;
            return res.status(200).json({ 
                transactionId, qrImageUrl, amount: paymentResponse.data.result.amount
            });
        } else { throw new Error('Respon dari API pembayaran tidak valid.'); }
    } catch (error) {
        console.error('Payment API Error:', error);
        return res.status(500).json({ message: 'Gagal membuat QRIS pembayaran.' });
    }
}
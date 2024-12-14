const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // لمعالجة بيانات JSON في الطلبات POST

// دالة لجلب البيانات من Google Sheets
const getInvoiceData = async (searchTerm) => {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: "credentials.json",
            scopes: "https://www.googleapis.com/auth/spreadsheets",
        });

        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client });
        const spreadsheetId = "163LGBklaFvbMpcCgZtJhF25N6rKgRkAUzBX85GZ_ebU";

        // Fetch data from two sheets
        const ranges = ["in2!A:ZZ", "invoice!A:ZZ"];
        const data = await Promise.all(ranges.map(range =>
            googleSheets.spreadsheets.values.get({ auth, spreadsheetId, range })
        ));

        // Combine and process rows
        const rows = data.flatMap(response => response.data.values || []);
        if (rows.length === 0) {
            return { error: "No data found in the sheets." };
        }

        //الحصول على id المشترك
        const searchId = rows.filter(row =>
            row.slice(0, 3).some(cell => cell === searchTerm)
        )[0][0];

        console.log(searchId)

        // تصفية البيانات بناءً على مصطلح البحث
        const matchingRows = rows.filter(row =>
            row.slice(0, 3).some(cell => cell === searchId)
        );

        return { data: matchingRows };
    } catch (error) {
        console.error("Error fetching data from Google Sheets:", error);
        return { error: "Failed to fetch data from Google Sheets." };
    }
};

// مسار POST لاستقبال مصطلح البحث وجلب النتائج
app.post('/submit', async (req, res) => {
    const { PhNumber: searchTerm } = req.body; // استخراج مصطلح البحث
    console.log('Received search term:', searchTerm);

    if (!searchTerm) {
        return res.status(400).json({ error: "Missing search term (PhNumber)." });
    }

    // جلب البيانات من Google Sheets
    const result = await getInvoiceData(searchTerm);

    if (result.error) {
        return res.status(500).json({ error: result.error });
    }

    // إرجاع النتائج إلى العميل
    res.json({ matchingRows: result.data });
});

// بدء تشغيل الخادم
app.listen(1337, () => console.log("Server running on port 1337"));

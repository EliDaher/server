const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
import { ref, get, child } from "firebase/database";
import { database } from '../firebaseConfig';


const app = express();


// السماح بالوصول من الشبكة المحلية
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json()); // لمعالجة بيانات JSON في الطلبات POST

// إعداد المصادقة مع Google Sheets API
const auth = new google.auth.GoogleAuth({
     credentials: {
        type: process.env.GOOGLE_TYPE,
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // معالجة الكي ليعمل بشكل صحيح
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: process.env.GOOGLE_AUTH_URI,
        token_uri: process.env.GOOGLE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
        client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL
    },
    scopes: "https://www.googleapis.com/auth/spreadsheets",
});

// تعريف المعرف الخاص بالجدول
const spreadsheetId = "163LGBklaFvbMpcCgZtJhF25N6rKgRkAUzBX85GZ_ebU";

// دالة لجلب البيانات من Google Sheets
const getInvoiceData = async (searchTerm) => {
    try {
        console.log(searchTerm)
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client });

        // Fetch data from both sheets
        const ranges = ["invoice!A:ZZ"];
        const data = await Promise.all(ranges.map(range =>
            googleSheets.spreadsheets.values.get({ auth, spreadsheetId, range })
        ));

        // Combine rows from both sheets
        const rows = data.flatMap(response => response.data.values || []);
        if (!rows || rows.length === 0) {
            return { error: "No data found in the sheets." };
        }

        // Find the `searchId` matching the searchTerm
        const matchingRow = rows.find(row => 
            row.slice(0, 3).some(cell => cell === searchTerm)
        );

        if (!matchingRow) {
            return { error: "No matching data found for the given search term." };
        }

        const searchId = matchingRow[0]; // Assume the ID is in the first column

        // Filter rows that match the `searchId`
        const matchingRows = rows.filter((row, index) =>
            row.slice(0, 3).some(cell => cell === searchId)
        );
        
        return { 
            data: matchingRows, 
            originalRows: matchingRows.map((row, index) => rows.findIndex(originalRow => originalRow === row) + 1) // الحصول على الفهرس في المصفوفة الأصلية
        };
        
    } catch (error) {
        console.error("Error fetching data from Google Sheets:", error);
        return { error: "Failed to fetch data from Google Sheets." };
    }
};


// دالة لجلب البيانات من Google Sheets
const getElecData = async (searchTerm) => {
    try {
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client });

        // Fetch data from both sheets
        const ranges = ["in2!A:ZZ"];
        const data = await Promise.all(ranges.map(range =>
            googleSheets.spreadsheets.values.get({ auth, spreadsheetId, range })
        ));

        // Combine rows from both sheets
        const rows = data.flatMap(response => response.data.values || []);
        if (!rows || rows.length === 0) {
            return { error: "No data found in the sheets." };
        }

        // Find the `searchId` matching the searchTerm
        const matchingRow = rows.find(row => 
            row.slice(0, 4).some(cell => cell === searchTerm)
        );

        if (!matchingRow) {
            return { error: "No matching data found for the given search term." };
        }

        const searchId = matchingRow[0]; // Assume the ID is in the first column

        // Filter rows that match the `searchId`
        const elecMatchingRows = rows.filter((row, index) =>
            row.slice(0, 3).some(cell => cell === searchId)
        );
        
        return { 
            data: elecMatchingRows, 
            originalRows: elecMatchingRows.map((row, index) => rows.findIndex(originalRow => originalRow === row) + 1) // الحصول على الفهرس في المصفوفة الأصلية
        };
        
    } catch (error) {
        console.error("Error fetching data from Google Sheets:", error);
        return { error: "Failed to fetch data from Google Sheets." };
    }
};

// مسار GET للجذر
app.get('/', (req, res) => {
    res.send('Welcome to the Express server!');
});

// مسار POST لاستقبال مصطلح البحث وجلب النتائج
app.post('/internetSearch', async (req, res) => {
    console.log(req.body);
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
    res.json({ matchingRows: result.data, originalRows: result.originalRows });
});


// مسار POST لاستقبال مصطلح البحث وجلب النتائج
app.post('/elecSearch', async (req, res) => {
    const { PhNumber: searchTerm } = req.body; // استخراج مصطلح البحث
    console.log('Received search term:', searchTerm);

    if (!searchTerm) {
        return res.status(400).json({ error: "Missing search term (PhNumber)." });
    }

    // جلب البيانات من Google Sheets
    const result = await getElecData(searchTerm);

    if (result.error) {
        return res.status(500).json({ error: result.error });
    }

    // إرجاع النتائج إلى العميل
    res.json({ elecMatchingRows: result.data, originalRows: result.originalRows });
});



// مسار POST لتحديث البيانات في Google Sheets
app.post('/update', async (req, res) => {
    const { row, col, value } = req.body;

    try {
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client });

        const updateRequest = {
            spreadsheetId,
            range: `invoice!${getColumnLetter(col)}${row}`, // تحويل الرقم إلى الحرف المناسب
            valueInputOption: "RAW",
            resource: {
                values: [[value]],
            },
        };

        await googleSheets.spreadsheets.values.update(updateRequest);

        res.json({ message: "Data updated successfully" });
    } catch (error) {
        console.error('Error updating data in Google Sheets:', error);
        res.status(500).json({ error: "Failed to update data" });
    }
});

app.post('/updateElec', async (req, res) => {
    const { row, col, value } = req.body;

    try {
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client });

        const updateRequest = {
            spreadsheetId,
            range: `in2!${getColumnLetter(col)}${row}`, // تحويل الرقم إلى الحرف المناسب
            valueInputOption: "RAW",
            resource: {
                values: [[value]],
            },
        };

        await googleSheets.spreadsheets.values.update(updateRequest);

        res.json({ message: "Data updated successfully" });
    } catch (error) {
        console.error('Error updating data in Google Sheets:', error);
        res.status(500).json({ error: "Failed to update data" });
    }
});

// دالة لتحويل رقم العمود إلى الحرف المناسب في Google Sheets
function getColumnLetter(col) {
    let columnLetter = '';
    while (col >= 0) {
        columnLetter = String.fromCharCode((col % 26) + 65) + columnLetter;
        col = Math.floor(col / 26) - 1;
    }
    return columnLetter;
}

app.post('/UserLogin', async (req, res) => {
    const { username, password } = req.body;

    try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, 'user')); 
        const data = snapshot.val();
        const usersList = Object.keys(data).map(key => ({ id: key, ...data[key] }));

        res.json({ user: usersList, username:username, password:password });
    } catch (error) {
        console.error('Error Firebase Login: ', error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

const PORT = process.env.PORT || 1337;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

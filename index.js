const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const { getDatabase , update, ref, get, child, query, orderByChild, equalTo, push, set, limitToLast } = require("firebase/database");
const { database } = require('./firebaseConfig.js');
const http = require('http');
require('dotenv').config(); // تحميل متغيرات البيئة
const { Server } = require("socket.io");
const cron = require("node-cron");






const app = express();

const server = http.createServer(app); // Create HTTP server
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }
});



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
//التجريب   const spreadsheetId = "163LGBklaFvbMpcCgZtJhF25N6rKgRkAUzBX85GZ_ebU";
const spreadsheetId = "1ynr5b0Y7TO7amTAo2yySs9P7bmgGr_4P4eMJDUPUqtU";

// دالة لجلب البيانات من Google Sheets
const getInvoiceData = async (searchTerm) => {
    try {
        console.log(searchTerm)
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client });

        // Fetch data from both sheets
        const ranges = ["NET!A:ZZ"];
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
        const ranges = ["كهربا و ماء!A:ZZ"];
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


const getCombinedData = async (searchTerm) => {
    try {
        console.log(`Searching for: ${searchTerm}`);

        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client });

        const ranges = [
            { name: "NET", range: "NET!A:ZZ" },
            { name: "كهربا و ماء", range: "كهربا و ماء!A:ZZ" }
        ];

        const data = await Promise.all(ranges.map(async ({ name, range }) => {
            try {
                const response = await googleSheets.spreadsheets.values.get({
                    auth, spreadsheetId, range
                });
                return { name, rows: response.data.values || [] };
            } catch (error) {
                console.error(`Error fetching data from sheet ${name}:`, error);
                return { name, rows: [] };
            }
        }));

        let allRows = [];
        data.forEach(({ name, rows }) => {
            rows.forEach((row, index) => {
                allRows.push({ row, sheet: name, rowIndex: index + 1 }); // نضيف 1 لأن الفهرس يبدأ من 0
            });
        });

        if (!allRows.length) {
            return { error: "No data found in the sheets." };
        }

        // البحث عن جميع الصفوف التي تحتوي على searchTerm
        const matchingRows = allRows.filter(({ row }) =>
            row.some(cell => cell && cell.toString().includes(searchTerm))
        );

        if (matchingRows.length === 0) {
            return { error: "No matching data found for the given search term." };
        }

        // استخراج جميع القيم الفريدة التي تم العثور عليها في العمود الأول
        const searchIds = [...new Set(matchingRows.map(({ row }) => row[0]))];

        // البحث عن جميع الصفوف التي تحتوي على أحد searchIds
        const finalMatchingRows = allRows.filter(({ row }) =>
            searchIds.includes(row[0])
        );

        // تصنيف البيانات إلى فئات منفصلة
        const elecMatchingRows = [];
        const elecOriginalRows = [];
        const internetMatchingRows = [];
        const internetOriginalRows = [];

        finalMatchingRows.forEach(({ row, sheet, rowIndex }) => {
            if (sheet === "NET") {
                internetMatchingRows.push(row);
                internetOriginalRows.push(rowIndex);
            } else {
                elecMatchingRows.push(row);
                elecOriginalRows.push(rowIndex);
            }
        });

        return {
            elecMatchingRows,
            elecOriginalRows,
            internetMatchingRows,
            internetOriginalRows
        };
    } catch (error) {
        console.error("Error fetching data from Google Sheets:", error);
        return { error: "Failed to fetch data from Google Sheets." };
    }
};

// إنشاء مسار البحث
app.post('/search', async (req, res) => {
    const { PhNumber: searchTerm } = req.body;
    console.log('Received search term:', searchTerm);

    if (!searchTerm) {
        return res.status(400).json({ error: "Missing search term (PhNumber)." });
    }

    const result = await getCombinedData(searchTerm);

    if (result.error) {
        return res.status(404).json({ error: result.error });
    }

    res.json({
        elecMatchingRows: result.elecMatchingRows,
        elecOriginalRows: result.elecOriginalRows,
        internetMatchingRows: result.internetMatchingRows,
        internetOriginalRows: result.internetOriginalRows
    });
});







// مسار POST لتحديث البيانات في Google Sheets
app.post('/update', async (req, res) => {
    const { row, col, value } = req.body;

    try {
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client });

        const updateRequest = {
            spreadsheetId,
            range: `NET!${getColumnLetter(col)}${row}`, // تحويل الرقم إلى الحرف المناسب
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
            range: `كهربا و ماء!${getColumnLetter(col)}${row}`, // تحويل الرقم إلى الحرف المناسب
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
        const dbRef = ref(database, 'user');
        const searchQuery = query(dbRef, orderByChild("username"), equalTo(username));

        const snapshot = await get(searchQuery);

        // التحقق مما إذا كان المستخدم موجودًا
        if (!snapshot.exists()) {
            return res.status(401).json({ error: "User not found" });
        }

        const data = snapshot.val();
        const usersList = Object.keys(data).map(key => ({ id: key, ...data[key] }));

        // التحقق من كلمة المرور
        const user = usersList.find(user => user.password === password);
        if (!user) {
            return res.status(401).json({ error: "Invalid password" });
        }

        res.json({ message: "Login successful", user });
    } catch (error) {
        console.error('Error Firebase Login: ', error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

const calcTotalFund = async (doIo) => {
    
    // حساب المجموع الجديد لكل موظف
    const date = new Date().toISOString().split("T")[0];
    
    const dbRef = ref(database, `dailyTotal/${date}`);
    const snapshot = await get(dbRef);

    const totalsByEmployee = [];
      
    if (snapshot.exists()) {
        const totalsMap = {}; // تخزين المجاميع مؤقتًا قبل تحويلها إلى مصفوفة
        snapshot.forEach((childSnapshot) => {
          const invoice = Object.entries(childSnapshot.val());
        
          invoice.map(child =>{            
            const employee = child[1].employee;
            const amount = child[1].amount;
            if (!totalsMap[employee]) {
              totalsMap[employee] = 0;
            }
            totalsMap[employee] += Number(amount);
          })
        });
    
        // تحويل المجاميع إلى مصفوفة بالصيغة المطلوبة
        for (const [employee, total] of Object.entries(totalsMap)) {
          totalsByEmployee.push({ employee, total });
        }



        if(doIo){
            // إرسال التحديثات لحظيًا لكل العملاء المتصلين (المدير والموظفين)
            io.emit("update-employee-totals", totalsByEmployee);
        }else{
            return totalsByEmployee;
        }


    }

}

app.post("/addInvoice", async (req, res) => {
    try {
        const { amount, employee, details } = req.body;
      
        const date = new Date().toISOString().split("T")[0];
        const InvoiceRef = ref(database, `dailyTotal/${date}/${employee}`);
        const newInvoiceRef = push(InvoiceRef);

        await set(newInvoiceRef, {
            amount: Number(amount),
            employee,
            details,
            timestamp: date,
        });

        await calcTotalFund(true);

        res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});


app.post("/getEmployeesFund", async (req, res) => {
    try {

        res.status(200).json({ TotalFund : await calcTotalFund(false) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const getEmployeeBalanceTable = async (username) => {
    const date = new Date().toISOString().split("T")[0];
    const dbRef = ref(database);
    let invoiceList = []; // تأكد من أن القائمة معرفة دائمًا

    if (username != "all") {
        // قائمة الفواتير للموظف
        const snapshot = await get(child(dbRef, `dailyTotal/${date}/${username}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            invoiceList = Object.keys(data).map(key => ({ ...data[key] }));
        } else {
            console.log("No data available for", username);
        }
    } else {
        // قائمة الفواتير لكل الموظفين        
        const snapshot = await get(child(dbRef, `dailyTotal/${date}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            invoiceList = Object.keys(data).map(key => ({ ...data[key] }));
        } else {
            console.log("No data available for all employees");
        }
    }

    return invoiceList;
};

app.post("/getAllBalance", async (req, res) => {
    try {
        console.log("Received body:", req.body); // تحقق من البيانات المستقبلة
        const { username } = req.body;

        const balanceTable = await getEmployeeBalanceTable("all");
        res.status(200).json({ BalanceTable: balanceTable });

    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post("/getEmployeeBalance", async (req, res) => {
    try {
        console.log("Received body:", req.body); // تحقق من البيانات المستقبلة
        const { username } = req.body;

        const balanceTable = await getEmployeeBalanceTable(username);
        res.status(200).json({ BalanceTable: balanceTable });

    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

async function createMonthlyInvoices() {
  try {
    const db = getDatabase();
    const subscribersRef = ref(db, "Subscribers");
    const invoicesRef = ref(db, "Invoices");

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const invoiceDate = `${year}-${month}-01`;

    const snapshot = await get(subscribersRef);
    const subscribers = snapshot.val();

    if (!subscribers) {
      console.log("❗ لا يوجد مشتركين!");
      return;
    }

    const updates = {};

    Object.keys(subscribers).forEach((userId) => {
      const subscriber = subscribers[userId];

      if (subscriber.MonthlyFee) {
        const newInvoiceRef = push(invoicesRef);
        const invoiceId = newInvoiceRef.key;

        const monthlyFee = Number(subscriber.MonthlyFee);
        const currentBalance = Number(subscriber.Balance) || 0;

        // إضافة الفاتورة
        updates[`Invoices/${invoiceId}`] = {
          Amount: monthlyFee,
          Date: invoiceDate,
          Details: `اشتراك شهري عن ${month}-${year}`,
          InvoiceID: invoiceId,
          SubscriberID: String(userId),
          Status: "Unpaid",
          id: invoiceId
        };

        // خصم الرصيد
        updates[`Subscribers/${userId}/Balance`] = currentBalance - monthlyFee;
      }
    });

    await update(ref(db), updates);
    console.log("✅ تم إنشاء الفواتير وتحديث الأرصدة بنجاح!");

  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء الفواتير:", error.message);
  }
}

cron.schedule("0 0 1 * *", async () => {
  console.log("📆 بدء إنشاء الفواتير الشهرية...");
  await createMonthlyInvoices();
}, {
  scheduled: true,
  timezone: "Asia/Damascus"
});


const getTotalDailyInvoices = async () => {
    try {
        const date = new Date().toISOString().split("T")[0]; // تاريخ اليوم
        const dbRef = ref(database);
        let totalAmount = 0;

        // الحصول على جميع بيانات اليوم
        const snapshot = await get(child(dbRef, `dailyTotal/${date}`));

        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // التكرار على جميع الموظفين وجمع قيم الفواتير
            Object.keys(data).forEach(employee => {
                Object.values(data[employee]).forEach(invoice => {
                    totalAmount += Number(invoice.amount) || 0;
                });
            });

        } else {
            console.log("لا توجد بيانات متاحة لليوم:", date);
        }

        return totalAmount;
    } catch (error) {
        console.error("حدث خطأ أثناء حساب إجمالي الفواتير:", error.message);
        return 0;
    }
};

cron.schedule("55 23 * * *", async () => {
    
    try {      

        console.log("🔄 بدء حساب إجمالي الفواتير اليومية...");

        const balanceTotal = await getTotalDailyInvoices();
        const date = new Date().toISOString().split("T")[0];

        const insertedData = {
            date: date,
            total: balanceTotal,
        };

        // حفظ البيانات في Firebase
        const dailyTotalRef = ref(database, `dailyBalance/${date}`);
        await set(dailyTotalRef, insertedData);

        console.log(`✅ تم حفظ إجمالي الفواتير اليومية (${balanceTotal}) ليوم ${date}`);
        

    } catch (error) {
        console.log(error)
    }

}, {
    scheduled: true,
    timezone: "Asia/Damascus"
})


const getTotalDailyInvoicesWithDate = async (date) => {
  try {
    const dbRef = ref(database);
    let totalAmount = 0;

    // جلب بيانات اليوم المحدد
    const snapshot = await get(child(dbRef, `dailyTotal/${date}`));

    if (snapshot.exists()) {
      const data = snapshot.val();

      // التكرار على جميع الموظفين وجمع قيم الفواتير
      Object.keys(data).forEach(employee => {
        Object.values(data[employee]).forEach(invoice => {
          const amount = Number(invoice?.amount);
          if (!isNaN(amount)) {
            totalAmount += amount;
          }
        });
      });
    } else {
      console.log(`لا توجد بيانات متاحة لليوم: ${date}`);
    }

    return totalAmount;
  } catch (error) {
    console.error('حدث خطأ أثناء حساب إجمالي الفواتير:', error);
    return 0;
  }
};
  

app.post('/calculateTotalDailyBalance', async (req, res) => {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'يرجى إرسال التاريخ المطلوب.' });
    }

    try {       
        console.log("🔄 بدء حساب إجمالي الفواتير اليومية...");  
        console.log(date)
        const balanceTotal = await getTotalDailyInvoicesWithDate(date);
        const insertedData = {
            date: date,
            total: balanceTotal,
        };  
        // حفظ البيانات في Firebase
        const dailyTotalRef = ref(database, `dailyBalance/${date}`);
        await set(dailyTotalRef, insertedData); 
        console.log(`✅ تم حفظ إجمالي الفواتير اليومية (${balanceTotal}) ليوم ${date}`);

    } catch (error) {
    res.status(500).json({ error: 'خطأ في حساب إجمالي الفواتير.' + error });
    }
});




const getEveryBalance = async () => {
    const dbRef = ref(database);
    let balanceList = [];

    try {
        const snapshot = await get(child(dbRef, `dailyBalance`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            balanceList = Object.values(data); // تحويل البيانات إلى قائمة ككائنات
        } else {
            console.log("لا توجد بيانات متاحة في dailyBalance.");
        }
    } catch (error) {
        console.error("حدث خطأ أثناء جلب بيانات الأرصدة:", error.message);
    }

    return balanceList;
};

app.post('/getEveryBalance', async (req, res) => {
    try {
        const everyBalance = await getEveryBalance();
        res.status(200).json({ everyBalance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


const getLast5gBalance = async () => {
    try {
        const paymentsRef = query(ref(database, "Payments"), orderByChild("PaymentID"), limitToLast(15));
        const snapshot = await get(paymentsRef);

        if (snapshot.exists()) {
            const paymentsData = snapshot.val();
            const paymentsArray = Object.values(paymentsData);

            const promises = paymentsArray.map(async (payment) => {
                const subscriberID = payment.SubscriberID;
                const subscribersRef = query(ref(database, "Subscribers"), orderByChild("id"), equalTo(Number(subscriberID)));
                const subSnapshot = await get(subscribersRef);

                if (subSnapshot.exists()) {
                    const subscriberData = Object.values(subSnapshot.val())[0];

                    return {
                        name: subscriberData.Name,
                        amount: payment.Amount,
                        details: payment.Details,
                        date: payment.Date
                    };
                } else {
                    return {
                        name: "غير معروف",
                        amount: payment.Amount,
                        details: payment.Details,
                        date: payment.Date
                    };
                }
            });

            return await Promise.all(promises);
        } else {
            return [];
        }
    } catch (error) {
        console.error("حدث خطأ:", error);
        throw new Error("خطأ في جلب البيانات");
    }
};

app.get('/getLast5GBalance', async (req, res) => {

    try {
        const data = await getLast5gBalance();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "خطأ في السيرفر", error: error.message });
    }

})

app.get('/getDealerCustomers', async (req, res) => {
  const { dealer } = req.query; // استقبال المتغير من الواجهة الأمامية

  if (!dealer) {
    return res.status(400).json({ error: 'Dealer parameter is required' });
  }

  try {
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, 'Subscribers'));

    if (snapshot.exists()) {
      const data = snapshot.val();
      const usersList = Object.keys(data)
        .map(key => ({ id: key, ...data[key] }))
        .filter(user => user.dealer === dealer);

      res.json(usersList);
    } else {
      res.status(404).json({ error: 'No data available' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error reading data: ' + error.message });
  }
});


app.post("/addWifiExpenses", async (req, res) => {
    try {
        const date = new Date().toISOString().split("T")[0];
        const { amount, employee, details } = req.body;

        // التحقق من المدخلات
        if (!amount || isNaN(amount) || !employee.trim() || !details.trim()) {
            return res.status(400).json({ error: "Invalid input data" });
        }

        const InvoiceRef = ref(database, "WifiBalance");
        const newInvoiceRef = push(InvoiceRef);

        res.status(200).json({ success: true });

        // تنفيذ العملية في الخلفية بعد إرسال الاستجابة
        setTimeout(async () => {
            await set(newInvoiceRef, {
                amount: Number(amount),
                employee: employee.trim(),
                details: details.trim(),
                timestamp: date,
            });
        }, 0);
        
    } catch (error) {
        console.error("Error in /addWifiExpenses:", error);
        res.status(500).json({ error: "Internal server error. Please try again later." });
    }
});


const fetchData = async (path) => {
    try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, path));

        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data).map(key => ({ ...data[key] }));
        } else {
            console.log(`No data available at path: ${path}`);
            return [];
        }
    } catch (error) {
        console.error(`Error fetching data from ${path}:`, error);
        return [];
    }
};

app.get('/getWifiTotal', async (req, res) => {
    try {
        const [WifiBalance, WifiPayments] = await Promise.all([
            fetchData("WifiBalance"),
            fetchData("Payments")
        ]);

        res.status(200).json({ WifiBalance, WifiPayments });
    } catch (error) {
        res.status(500).json({ error: 'Error reading data: ' + error.message });
    }
});

app.post("/searchInFinancialStatment", async (req, res) => {
    const { searchValue } = req.body;
  
    if (!searchValue) {
      return res.status(400).json({ error: "Search value is required" });
    }
  
    try {
      const dbRef = ref(database, "dailyTotal");
      const snapshot = await get(dbRef);
  
      if (!snapshot.exists()) {
        return res.status(404).json({ message: "No data found" });
      }
  
      const results = [];
  
      snapshot.forEach((dateSnapshot) => {
        const date = dateSnapshot.key;
  
        dateSnapshot.forEach((employeeSnapshot) => {
          const employee = employeeSnapshot.key;
  
          employeeSnapshot.forEach((invoiceSnapshot) => {
            const invoice = invoiceSnapshot.key;
            const invoiceData = invoiceSnapshot.val();
  
            // Ensure details exist and is an object
            if (invoiceData.details) {
              Object.values(invoiceData.details).forEach((detail) => {
                if (
                  detail.customerNumber === searchValue ||
                  detail.customerDetails?.includes(searchValue) ||
                  detail.invoiceNumber?.includes(searchValue) 
                ) {
                  results.push({
                    date,
                    employee,
                    invoice,
                    amount: invoiceData.amount,
                    matchingDetail: detail,
                  });
                }
              });
            }
          });
        });
      });
  
      res.json(results.length > 0 ? results : { message: "No matching data found" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});


app.post("/addPayment", async (req, res) => {
    try {
        const { amount, date, details, subscriberID, total, dealer } = req.body;
        
        if (!amount || !date || !details || !subscriberID || total === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if(!dealer){

            const dbRef = ref(database, "Payments");
            const snapshot = await get(dbRef);
            const subscriberCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
            const paymentID = subscriberCount + 1; 
            
            // إنشاء بيانات الدفع
            const formData = {
                Amount: amount,
                Date: date,
                Details: details,
                PaymentID: paymentID,
                SubscriberID: subscriberID,
                id: paymentID,
            };

            const newDataRef = ref(database, `Payments/${paymentID}`);
            await set(newDataRef, formData);

            const newTotal = Number(total) + Number(amount);
            const updateCustomerBalance = ref(database, `Subscribers/${subscriberID}/Balance`);
            await set(updateCustomerBalance, newTotal);

            res.status(200).json({ message: "Payment added successfully", paymentID, newTotal });

        }else{

            const dbRef = ref(database, "Payments");
            const snapshot = await get(dbRef);
            const subscriberCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
            const paymentID = subscriberCount + 1; 
            
            // إنشاء بيانات الدفع
            const formData = {
                Amount: amount,
                Date: date,
                Details: details,
                PaymentID: paymentID,
                SubscriberID: subscriberID,
                id: paymentID,
            };

            const newDataRef = ref(database, `Payments/${paymentID}`);
            await set(newDataRef, formData);
            
            const dealerRedf = ref(database, `dealerPayments/${dealer}/${paymentID}`);
            await set(dealerRedf, formData);

            const newTotal = Number(total) + Number(amount);
            const updateCustomerBalance = ref(database, `Subscribers/${subscriberID}/Balance`);
            await set(updateCustomerBalance, newTotal);

            res.status(200).json({ message: "Payment added successfully", paymentID, newTotal });
            
        }
        } catch (error) {
            console.error("Error adding payment:", error);
            res.status(500).json({ error: "Internal server error" });
        }
});

































const PORT = process.env.PORT || 1337;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

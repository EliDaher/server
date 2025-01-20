const Btn = document.getElementById("getData");
const numberBox = document.getElementById('numberBox');
const internetTable = document.querySelector('.internetTable');
const tbody = document.querySelector('.internetTable tbody');
const table = document.querySelectorAll('table')
const finBtn = document.querySelector('.finBtn')
const copyTable = document.querySelector('.copyTable')
const elecTable = document.querySelector('.elecTable')
const elecBody = document.querySelector('.elecTable tbody')
const totalValueLabel = document.querySelector('.totalValue')


var elecTableHeadersCount = document.querySelector('.elecTable thead tr')
var InternetTableHeadersCount = document.querySelector('.internetTable thead tr')
var invoiceData;
var originalRowData = []; // لحفظ الصفوف الأصلية
const timeElapsed = Date.now();
const nowDate = new Date(timeElapsed);



Btn.addEventListener("click", (e) => {
    e.preventDefault();

    var searchNumber = numberBox.value;
    table.forEach(tbl => {
        tbl.children[1].innerHTML = ''
    })

    const data = { PhNumber: searchNumber }; // البيانات المرسلة ككائن JSON

    // إرسال البيانات باستخدام Axios
    axios.post('https://192.168.1.144:1337/internetSearch', data)
        .then(function(response) {
            invoiceData = response.data.matchingRows;
            originalRowData = response.data.originalRows; // حفظ الصفوف الأصلية

            // إذا كانت البيانات موجودة، قم بعرضها
            if (invoiceData && invoiceData.length > 0) {
                setInternetDataInTable();
            } else {
                console.log("No matching rows found.");
                tbody.innerHTML = `<tr><td colspan="3">No data found</td></tr>`;
            }
        })
        .catch(function(error) {
            console.log("No matching rows found.");
            tbody.innerHTML = `<tr><td colspan="3">No data found</td></tr>`;
    });


    // إرسال البيانات باستخدام Axios
    axios.post('https://192.168.1.144:1337/elecSearch', data)
        .then(function(response) {
            console.log(response)
            elecData = response.data.elecMatchingRows;
            originalRowData = response.data.originalRows; // حفظ الصفوف الأصلية

            // إذا كانت البيانات موجودة، قم بعرضها
            if (elecData && elecData.length > 0) {
                setElecDataInTable();
            } else {
                console.log("No matching rows found.");
                tbody.innerHTML = `<tr><td colspan="3">No data found</td></tr>`;
            }
        })
        .catch(function(error) {
            console.log("No matching rows found.");
            tbody.innerHTML = `<tr><td colspan="3">No data found</td></tr>`;
    });

});

const setInternetDataInTable = () => {
    tbody.innerHTML = '';
    
    // تحديد أكبر عدد من الأعمدة
    //const maxColumns = Math.max(...invoiceData.map(row => row.length));
    const maxColumns = InternetTableHeadersCount.childElementCount;

    invoiceData.forEach((row, index) => {
        const tr = document.createElement('tr'); 

        // إضافة خلايا للتأكد أن الصف يحتوي على نفس عدد الأعمدة
        for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
            const td = document.createElement('td');
            const input = document.createElement('input'); 

            // إذا كانت الخلية تحتوي على بيانات، ضع البيانات
            // وإذا كانت الخلية فارغة، ضع input فارغ
            input.value = row[colIndex] || ''; 
            input.dataset.originalRow = originalRowData[index]; // تخزين الصف الأصلي بناءً على فهرس الصف
            input.dataset.colIndex = colIndex; // تخزين رقم العمود
            td.appendChild(input);
            tr.appendChild(td);

        }
    
        tbody.appendChild(tr);
        addKeyDownForInputDate();
    });
};


const setElecDataInTable = () => {
    const tbodyElec = document.querySelector('.elecTable tbody')
    tbodyElec.innerHTML = '';
    const elecTableHeader = document.querySelector('.elecTable thead tr')

    // تحديد أكبر عدد من الأعمدة
    const maxColumns = elecTableHeader.childElementCount;

    elecData.forEach((row, index) => {
        const tr = document.createElement('tr'); 

        // إضافة خلايا للتأكد أن الصف يحتوي على نفس عدد الأعمدة
        for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
            const td = document.createElement('td');
            const input = document.createElement('input'); 

            // إذا كانت الخلية تحتوي على بيانات، ضع البيانات
            // وإذا كانت الخلية فارغة، ضع input فارغ
            input.value = row[colIndex] || ''; 
            input.dataset.originalRow = originalRowData[index]; // تخزين الصف الأصلي بناءً على فهرس الصف
            input.dataset.colIndex = colIndex; // تخزين رقم العمود
            td.appendChild(input);
            tr.appendChild(td);

        }
    
        tbodyElec.appendChild(tr);
        addKeyDownForInputDate();
    });
};


const addKeyDownForInputDate = () => {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input=>{
        input.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === ";" || e.ctrlKey && e.key === "ك") {
                e.currentTarget.value = nowDate.toLocaleDateString('en-US')
                inputUpdateValue(e);
            }
        })
    })
}


const inputUpdateValue = (e) => {
    const input = e.target;
    if (input.tagName === 'INPUT') {
        const newValue = input.value;
        const originalRow = input.dataset.originalRow; // الحصول على رقم الصف الأصلي
        const colIndex = input.dataset.colIndex; // الحصول على رقم العمود
        if(elecBody.contains(e.target)){

            // إرسال التعديل إلى الخادم أو مباشرة إلى Google Sheets باستخدام API
            axios.post('https://192.168.1.144:1337/updateElec', {
                row: originalRow, // رقم الصف الأصلي
                col: colIndex, // رقم العمود
                value: newValue // القيمة الجديدة
            })
            .then(response => {
                console.log("Data updated successfully:", response.data);
            })
            .catch(error => {
                console.error("Error updating data:", error);
            });


        }else{

            // إرسال التعديل إلى الخادم أو مباشرة إلى Google Sheets باستخدام API
            axios.post('https://192.168.1.144:1337/update', {
                row: originalRow, // رقم الصف الأصلي
                col: colIndex, // رقم العمود
                value: newValue // القيمة الجديدة
            })
            .then(response => {
                console.log("Data updated successfully:", response.data);
            })
            .catch(error => {
                console.error("Error updating data:", error);
            });
        
        }
    }
}

// عند تعديل الخلية
tbody.addEventListener('change', (e) => {
    inputUpdateValue(e);
});

elecBody.addEventListener('change', (e) => {
    inputUpdateValue(e);
})

finBtn.addEventListener('click', (e)=>{
    e.preventDefault();

    const copyTableBody = document.querySelector('.copyTable tbody');
    copyTableBody.innerHTML = ''
    for (let row = 0; row < tbody.childElementCount; row++) {
        for(i=0; i < tbody.children[row].children.length; i++){
            if(tbody.children[row].children[i].children[0].value == nowDate.toLocaleDateString('en-US')){
                const tr = document.createElement('tr');
                for (let i = 0; i <= 4; i++) {
                    const td = document.createElement('td')
                    td.innerHTML =  tbody.children[row].children[i].children[0].value
                    tr.appendChild(td);
                }
                const td2 = document.createElement('td')
                td2.innerHTML = InternetTableHeadersCount.children[i].innerHTML
                td2.classList.add('valueStart')
                tr.appendChild(td2);
                const td = document.createElement('td')
                td.innerHTML = tbody.children[row].children[i-1].children[0].value
                tr.appendChild(td);
                copyTableBody.appendChild(tr);
            }
        }
    }

    for (let row = 0; row < elecBody.childElementCount; row++) {    
        for(i=0; i < elecBody.children[row].children.length; i++){
            if(elecBody.children[row].children[i].children[0].value == nowDate.toLocaleDateString('en-US')){
                const tr = document.createElement('tr');
                for (let i = 0; i <= 4; i++) {
                    const td = document.createElement('td')
                    td.innerHTML =  elecBody.children[row].children[i].children[0].value
                    tr.appendChild(td);
                }
                const td2 = document.createElement('td')
                td2.innerHTML = elecTableHeadersCount.children[i].innerHTML
                td2.classList.add('valueStart')
                tr.appendChild(td2);
                const td = document.createElement('td')
                td.innerHTML = elecBody.children[row].children[i-1].children[0].value
                tr.appendChild(td);
                copyTableBody.appendChild(tr);
            }
        }
    }
    
    let tableText = "";

    // استخراج النص من الجدول
    for (let row of copyTable.rows) {
        const rowText = Array.from(row.cells).map(cell => cell.innerText).join("\t");
        tableText += rowText + "\n";
    }

    // نسخ النص إلى الحافظة باستخدام Clipboard API
    navigator.clipboard.writeText(tableText)
    calcTotalInvoice()
})



//حساب مجموع الفواتير المدفوعة 
const calcTotalInvoice = () => {
    const tCells = document.querySelectorAll('td');
    var tCellsValues = []
    var totalValue = 0;
    tCells.forEach(cell => {
        if(cell.children.length != 0){
            if(cell.children[0].tagName == 'INPUT'){
                tCellsValues.push(cell.children[0].value)
            }
        }
    })
    for(i=0; i < tCellsValues.length; i++){
        if(tCellsValues[i] == nowDate.toLocaleDateString('en-US')){
            totalValue += Number(tCellsValues[i-1])
        }
    }
    totalValueLabel.innerHTML = totalValue
    console.log(totalValue)
}
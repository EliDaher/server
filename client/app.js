const Btn = document.getElementById("getData");
const numberBox = document.getElementById('numberBox');
const table = document.querySelector('.table');
const tbody = document.querySelector('.table tbody'); // يجب أن يكون tbody تابعًا للجدول

var invoiceData;

Btn.addEventListener("click", (e) => {
    e.preventDefault();

    var searchNumber = numberBox.value;

    const data = { PhNumber: searchNumber }; // البيانات المرسلة ككائن JSON

    // إرسال البيانات باستخدام Axios
    axios.post('http://localhost:1337/submit', data)
        .then(function(response) {
            console.log('Response from server:', response.data.matchingRows); // عرض الاستجابة من الخادم
            invoiceData = response.data.matchingRows;

            // إذا كانت البيانات موجودة، قم بعرضها
            if (invoiceData && invoiceData.length > 0) {
                setDataInTable();
            } else {
                console.log("No matching rows found.");
                tbody.innerHTML = `<tr><td colspan="3">No data found</td></tr>`;
            }
        })
        .catch(function(error) {
            console.error('There was an error sending the data:', error);
        });
});

const setDataInTable = () => {
    // تنظيف الجدول قبل إضافة بيانات جديدة
    tbody.innerHTML = '';
    // إنشاء صفوف جديدة بناءً على البيانات المسترجعة
    invoiceData.forEach(row => {
        const tr = document.createElement('tr'); // إنشاء صف جديد لكل عنصر

        row.forEach(data => {
            const td = document.createElement('td'); // إنشاء عمود جديد
            td.textContent = data; // تعيين البيانات داخل العمود
            tr.appendChild(td); // إضافة العمود إلى الصف
        });

        tbody.appendChild(tr); // إضافة الصف إلى tbody
    });
};

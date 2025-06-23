// متغيرات التقويم
let currentDate = new Date();
let bookedDates = [];

// أسماء الأشهر بالعربية
const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// أسماء أيام الأسبوع
const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// تحميل التواريخ المحجوزة من Firebase
// تحميل التواريخ المحجوزة
async function loadBookedDates() {
    try {
        const bookingsSnapshot = await db.collection('bookings').get();
        bookedDates = [];
        
        bookingsSnapshot.forEach(doc => {
            const booking = doc.data();
            if (booking.date && (booking.status === 'confirmed' || booking.status === 'pending')) {
                console.log('حجز محمل:', booking.date, 'حالة:', booking.status, 'عميل:', booking.customerName);
                bookedDates.push({
                    date: booking.date,
                    status: booking.status
                });
            }
        });
        
        console.log('جميع التواريخ المحجوزة:', bookedDates);
        renderCalendar();
    } catch (error) {
        console.error('Error loading booked dates:', error);
    }
}

// رسم التقويم
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // تحديث عنوان الشهر
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

    // بداية ونهاية الشهر
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // مسح شبكة التقويم
    const calendarGrid = document.getElementById('calendar-grid');
    calendarGrid.innerHTML = '';

    // إضافة أسماء الأيام
    dayNames.forEach(dayName => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day header';
        dayHeader.textContent = dayName;
        calendarGrid.appendChild(dayHeader);
    });

    // الأيام الفعلية
    const currentDateObj = new Date();
    for (let i = 0; i < 42; i++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = cellDate.getDate();

        // تمييز الأيام من خارج الشهر الحالي
        if (cellDate.getMonth() !== month) {
            dayElement.classList.add('other-month');
        }

        // تمييز اليوم الحالي
        if (cellDate.toDateString() === currentDateObj.toDateString()) {
            dayElement.classList.add('today');
        }

        // تحديد حالة الحجز - مع تسجيل لتتبع المشكلة
        const year = cellDate.getFullYear();
        const monthStr = String(cellDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(cellDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${monthStr}-${dayStr}`;

        console.log('فحص التاريخ:', dateString, 'لليوم:', cellDate.getDate());

        const booking = bookedDates.find(b => b.date === dateString);

        if (booking) {
            console.log('وُجد حجز في:', dateString, 'حالة:', booking.status);
            if (booking.status === 'confirmed') {
                dayElement.classList.add('booked');
                dayElement.title = 'محجوز';
            } else if (booking.status === 'pending') {
                dayElement.classList.add('pending');
                dayElement.title = 'في الانتظار';
            }
        } else if (cellDate >= currentDateObj && cellDate.getMonth() === month) {
            dayElement.classList.add('available');
            dayElement.title = 'متاح للحجز';
            dayElement.style.cursor = 'pointer';
            
            // إضافة حدث النقر للأيام المتاحة
            dayElement.addEventListener('click', () => {
                window.location.href = `booking.html?date=${dateString}`;
            });
        }

        calendarGrid.appendChild(dayElement);
    }
}

// أزرار التنقل بين الشهور
document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// اختبار الاتصال بـ Firebase مع نظام Toast
document.getElementById('testFirebase').addEventListener('click', async function() {
    // عرض Loading Toast
    const loadingToast = showLoadingToast('جاري اختبار الاتصال بقاعدة البيانات...');
    
    try {
        // محاولة كتابة بيانات تجريبية
        const testDoc = await db.collection('test').add({
            message: 'Firebase يعمل بنجاح!',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // إغلاق Loading Toast
        loadingToast.close();
        
        // عرض رسالة نجاح مع معرف الوثيقة
        showFirebaseConnection();
        
        console.log('Firebase working! Document ID:', testDoc.id);
        
    } catch (error) {
        // إغلاق Loading Toast
        loadingToast.close();
        
        // عرض رسالة خطأ
        showFirebaseError(error.message);
        
        console.error('Firebase error:', error);
    }
});

// التحقق من تحميل Firebase
document.addEventListener('DOMContentLoaded', function() {
    if (typeof firebase !== 'undefined') {
        console.log('✅ Firebase SDK loaded successfully');
        
        // عرض رسالة ترحيب
        setTimeout(() => {
            showInfo('مرحباً بك في نظام حجز الشالية', 'أهلاً وسهلاً 🏖️');
        }, 1000);
        
    } else {
        console.error('❌ Firebase SDK not loaded');
        
        // عرض رسالة خطأ
        showError('فشل في تحميل Firebase SDK', 'خطأ في النظام');
    }
});

// مراقبة حالة الاتصال بالإنترنت
window.addEventListener('online', function() {
    showSuccess('تم استعادة الاتصال بالإنترنت', 'متصل مرة أخرى 🌐');
});

window.addEventListener('offline', function() {
    showWarning('لا يوجد اتصال بالإنترنت', 'بدون إنترنت 📶');
});

// مراقبة أخطاء JavaScript العامة
window.addEventListener('error', function(event) {
    console.error('JavaScript Error:', event.error);
    showError('حدث خطأ في النظام، يرجى إعادة تحميل الصفحة', 'خطأ غير متوقع');
});

// مراقبة الـ Promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    if (event.reason && event.reason.code && event.reason.code.includes('firebase')) {
        showFirebaseError(event.reason.message);
    } else {
        showError('حدث خطأ في معالجة البيانات', 'خطأ في النظام');
    }
    
    event.preventDefault();
});

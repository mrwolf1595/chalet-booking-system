// تحميل الحجوزات الموجودة
async function loadBookings() {
    try {
        const bookingsSnapshot = await db.collection('bookings').get();
        const bookedDates = [];
        
        bookingsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'confirmed' || data.status === 'pending') {
                console.log('تاريخ محجوز:', data.date, 'الحالة:', data.status);
                bookedDates.push(data.date);
            }
        });
        
        return bookedDates;
    } catch (error) {
        console.error('Error loading bookings:', error);
        return [];
    }
}

// التحقق من توفر التاريخ
async function checkDateAvailability(selectedDate) {
    const bookedDates = await loadBookings();
    console.log('تحقق من التاريخ:', selectedDate);
    console.log('التواريخ المحجوزة:', bookedDates);
    return !bookedDates.includes(selectedDate);
}

// عرض رسالة التوفر
// التحقق من توفر التاريخ مع نظام Toast
function displayAvailability(dateInput) {
    const selectedDate = dateInput.value;
    const statusDiv = document.getElementById('availability-status');
    
    if (!selectedDate) {
        statusDiv.innerHTML = '';
        return;
    }
    
    // عرض Loading
    statusDiv.innerHTML = '<div class="loading-spinner" style="margin: 10px auto;"></div>';
    
    // التحقق من توفر التاريخ
    db.collection('bookings')
        .where('date', '==', selectedDate)
        .where('status', 'in', ['confirmed', 'pending'])
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                statusDiv.innerHTML = '<div class="available-status">✓ التاريخ متاح للحجز</div>';
                showDateSelected(selectedDate);
            } else {
                statusDiv.innerHTML = '<div class="unavailable-status">✕ التاريخ محجوز</div>';
                
                // عرض تفاصيل الحجز
                const booking = querySnapshot.docs[0].data();
                showWarning(
                    `التاريخ ${selectedDate} محجوز بالفعل<br>` +
                    `الحالة: ${getStatusText(booking.status)}<br>` +
                    `يرجى اختيار تاريخ آخر`,
                    'التاريخ غير متاح'
                );
            }
        })
        .catch((error) => {
            statusDiv.innerHTML = '<div class="error">خطأ في التحقق من التوفر</div>';
            showError('فشل في التحقق من توفر التاريخ: ' + error.message, 'خطأ في النظام');
            console.error('Calendar error:', error);
        });
}

// دالة تحويل حالة الحجز إلى نص عربي
function getStatusText(status) {
    const statusMap = {
        'pending': 'في الانتظار',
        'confirmed': 'مؤكد',
        'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
}

// متغيرات التقويم العام
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let bookingsData = [];

// أسماء الأشهر والأيام بالعربية
const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// تحميل بيانات الحجوزات
async function loadBookingsData() {
    try {
        const snapshot = await db.collection('bookings').get();
        bookingsData = [];
        
        snapshot.forEach(doc => {
            bookingsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('تم تحميل بيانات الحجوزات:', bookingsData.length);
        
    } catch (error) {
        showError('فشل في تحميل بيانات الحجوزات: ' + error.message, 'خطأ في التحميل');
        console.error('Error loading bookings:', error);
    }
}

// إنشاء التقويم العام
function generateCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthElement = document.getElementById('currentMonth');
    
    if (!calendarGrid || !currentMonthElement) return;
    
    // تحديث عنوان الشهر
    currentMonthElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // إفراغ التقويم
    calendarGrid.innerHTML = '';
    
    // إضافة أسماء الأيام
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // حساب بداية ونهاية الشهر
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // إنشاء أيام التقويم
    const today = new Date();
    for (let i = 0; i < 42; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = currentDate.getDate();
        
        // تحديد الكلاسات
        if (currentDate.getMonth() !== currentMonth) {
            dayElement.classList.add('other-month');
        }
        
        if (currentDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // التحقق من حالة الحجز
        const dateString = currentDate.toISOString().split('T')[0];
        const booking = bookingsData.find(b => b.date === dateString);
        
        if (booking) {
            if (booking.status === 'confirmed') {
                dayElement.classList.add('booked');
                dayElement.title = `محجوز - ${booking.customerName}`;
            } else if (booking.status === 'pending') {
                dayElement.classList.add('pending');
                dayElement.title = `في الانتظار - ${booking.customerName}`;
            }
        } else if (currentDate >= today) {
            dayElement.classList.add('available');
            dayElement.title = 'متاح للحجز';
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

// أحداث التنقل في التقويم
document.addEventListener('DOMContentLoaded', function() {
    // تحميل البيانات وإنشاء التقويم
    loadBookingsData().then(() => {
        generateCalendar();
        showCalendarUpdated();
    });
    
    // زر الشهر السابق
    const prevButton = document.getElementById('prevMonth');
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            generateCalendar();
        });
    }
    
    // زر الشهر التالي
    const nextButton = document.getElementById('nextMonth');
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            generateCalendar();
        });
    }
});

// تحديث التقويم عند تغيير البيانات
function updateCalendar() {
    return loadBookingsData().then(() => {
        generateCalendar();
    });
}

// مراقبة التغييرات في قاعدة البيانات
if (typeof db !== 'undefined') {
    db.collection('bookings').onSnapshot((snapshot) => {
        let hasChanges = false;
        
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            updateCalendar().then(() => {
                console.log('تم تحديث التقويم تلقائياً');
            });
        }
    }, (error) => {
        console.error('خطأ في مراقبة التغييرات:', error);
    });
}
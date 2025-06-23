// متغيرات عامة
let currentDisplayMonth = new Date();
let bookedDates = [];
let isLoading = false;

// أسماء الأشهر والأيام بالعربية
const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const shortArabicDays = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تحميل صفحة التوفر...');
    
    // التحقق من تحميل Firebase
    if (typeof firebase === 'undefined') {
        showError('❌ خطأ: لم يتم تحميل Firebase');
        return;
    }
    
    setupEventListeners();
    loadAvailabilityData();
});

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // أزرار التنقل بين الشهور
    const prevButton = document.getElementById('prevMonth');
    const nextButton = document.getElementById('nextMonth');
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            changeMonth(-1);
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            changeMonth(1);
        });
    }
    
    // مفاتيح الاختصار
    document.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowLeft') {
            changeMonth(-1);
        } else if (event.key === 'ArrowRight') {
            changeMonth(1);
        } else if (event.key === 'F5') {
            event.preventDefault();
            loadAvailabilityData();
        }
    });
}

// تغيير الشهر المعروض
function changeMonth(direction) {
    if (isLoading) return;
    
    currentDisplayMonth.setMonth(currentDisplayMonth.getMonth() + direction);
    updateDisplay();
}

// تحميل بيانات التوفر من Firebase
async function loadAvailabilityData() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading(true);
    
    try {
        console.log('📅 جاري تحميل بيانات التوفر...');
        
        // جلب الحجوزات المؤكدة والمعلقة فقط (بدون البيانات الشخصية)
        const snapshot = await db.collection('bookings')
            .where('status', 'in', ['confirmed', 'pending'])
            .get();
        
        bookedDates = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.date) {
                // نحفظ التاريخ فقط بدون البيانات الشخصية
                bookedDates.push(data.date);
            }
        });
        
        console.log(`✅ تم تحميل ${bookedDates.length} تاريخ محجوز`);
        updateDisplay();
        
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        showError(`خطأ في تحميل البيانات: ${error.message}`);
        
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// تحديث العرض
function updateDisplay() {
    updateMonthTitle();
    generateCalendar();
    updateStats();
    updateNavigationButtons();
}

// تحديث عنوان الشهر
function updateMonthTitle() {
    const monthName = arabicMonths[currentDisplayMonth.getMonth()];
    const year = currentDisplayMonth.getFullYear();
    const fullTitle = `${monthName} ${year}`;
    
    const currentMonthElement = document.getElementById('currentMonth');
    const tableMonthElement = document.getElementById('tableMonthTitle');
    
    if (currentMonthElement) {
        currentMonthElement.textContent = fullTitle;
    }
    
    if (tableMonthElement) {
        tableMonthElement.textContent = fullTitle;
    }
}

// إنشاء التقويم
function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    // مسح المحتوى السابق
    calendarGrid.innerHTML = '';
    
    // إضافة رؤوس الأيام
    shortArabicDays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // الحصول على معلومات الشهر
    const year = currentDisplayMonth.getFullYear();
    const month = currentDisplayMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    
    // إضافة خلايا فارغة في بداية الشهر
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell day-empty';
        calendarGrid.appendChild(emptyCell);
    }
    
    // إضافة أيام الشهر
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayCell = createDayCell(day, month, year);
        calendarGrid.appendChild(dayCell);
    }
}

// إنشاء خلية يوم
function createDayCell(day, month, year) {
    const dayCell = document.createElement('div');
    const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dateObj = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    dayCell.className = 'day-cell';
    
    // رقم اليوم
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);
    
    // حالة اليوم
    const dayStatus = document.createElement('div');
    dayStatus.className = 'day-status';
    
    // تحديد حالة اليوم
    if (dateObj < today) {
        // يوم مضى
        dayCell.classList.add('day-past');
        dayStatus.textContent = 'مضى';
    } else if (bookedDates.includes(dateString)) {
        // يوم محجوز
        dayCell.classList.add('day-booked');
        dayStatus.textContent = 'محجوز';
    } else {
        // يوم متاح
        dayCell.classList.add('day-available');
        dayStatus.textContent = 'متاح';
        
        // إضافة حدث النقر للانتقال لصفحة الحجز
        dayCell.addEventListener('click', () => {
            goToBookingPage(dateString);
        });
        
        // تأثيرات التفاعل
        dayCell.addEventListener('mouseenter', () => {
            dayCell.style.transform = 'scale(1.05)';
        });
        
        dayCell.addEventListener('mouseleave', () => {
            dayCell.style.transform = 'scale(1)';
        });
    }
    
    dayCell.appendChild(dayStatus);
    
    // تمييز اليوم الحالي
    if (dateObj.toDateString() === today.toDateString()) {
        dayCell.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.6)';
        dayCell.style.border = '3px solid #FFD700';
    }
    
    return dayCell;
}

// الانتقال لصفحة الحجز مع التاريخ المحدد
function goToBookingPage(dateString) {
    const bookingUrl = `booking.html?date=${dateString}`;
    window.location.href = bookingUrl;
}

// تحديث الإحصائيات
function updateStats() {
    const year = currentDisplayMonth.getFullYear();
    const month = currentDisplayMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let availableCount = 0;
    let bookedCount = 0;
    let totalCount = lastDay;
    
    // حساب الأيام المتاحة والمحجوزة
    for (let day = 1; day <= lastDay; day++) {
        const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dateObj = new Date(year, month, day);
        
        if (dateObj >= today) {
            if (bookedDates.includes(dateString)) {
                bookedCount++;
            } else {
                availableCount++;
            }
        }
    }
    
    // تحديث العناصر
    const availableElement = document.getElementById('availableDays');
    const bookedElement = document.getElementById('bookedDays');
    const totalElement = document.getElementById('totalDays');
    
    if (availableElement) {
        availableElement.textContent = availableCount;
        // تأثير العد التصاعدي
        animateNumber(availableElement, 0, availableCount, 500);
    }
    
    if (bookedElement) {
        bookedElement.textContent = bookedCount;
        animateNumber(bookedElement, 0, bookedCount, 500);
    }
    
    if (totalElement) {
        totalElement.textContent = totalCount;
        animateNumber(totalElement, 0, totalCount, 500);
    }
}

// تحريك الأرقام
function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(start + (end - start) * progress);
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// تحديث أزرار التنقل
function updateNavigationButtons() {
    const prevButton = document.getElementById('prevMonth');
    const nextButton = document.getElementById('nextMonth');
    
    if (!prevButton || !nextButton) return;
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // تعطيل الزر السابق إذا كنا في الشهر الحالي أو قبله
    const displayYear = currentDisplayMonth.getFullYear();
    const displayMonth = currentDisplayMonth.getMonth();
    
    if (displayYear < currentYear || (displayYear === currentYear && displayMonth <= currentMonth)) {
        prevButton.disabled = true;
    } else {
        prevButton.disabled = false;
    }
    
    // تعطيل الزر التالي إذا كنا أكثر من سنة مقدماً (اختياري)
    const maxYear = currentYear + 1;
    if (displayYear > maxYear) {
        nextButton.disabled = true;
    } else {
        nextButton.disabled = false;
    }
}

// عرض حالة التحميل
function showLoading(show) {
    const loadingElement = document.getElementById('loadingStatus');
    if (!loadingElement) return;
    
    if (show) {
        loadingElement.style.display = 'block';
        loadingElement.innerHTML = '⏳ جاري تحميل بيانات التوفر...';
    } else {
        loadingElement.style.display = 'none';
    }
}

// عرض رسالة خطأ
function showError(message) {
    const loadingElement = document.getElementById('loadingStatus');
    if (!loadingElement) return;
    
    loadingElement.style.display = 'block';
    loadingElement.innerHTML = `
        <div style="color: #f44336; padding: 1rem; background: rgba(244, 67, 54, 0.1); border-radius: 8px; margin: 1rem 0;">
            ${message}
            <br>
            <button onclick="loadAvailabilityData()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                🔄 إعادة المحاولة
            </button>
        </div>
    `;
}

// تحديث البيانات كل دقيقة (اختياري)
setInterval(() => {
    if (!isLoading && document.visibilityState === 'visible') {
        loadAvailabilityData();
    }
}, 60000); // كل دقيقة

// إعادة تحميل البيانات عند العودة للصفحة
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isLoading) {
        loadAvailabilityData();
    }
});

// تصدير الوظائف للاستخدام العام
window.loadAvailabilityData = loadAvailabilityData;
window.goToBookingPage = goToBookingPage;
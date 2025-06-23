// التحقق من حالة تسجيل الدخول
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        // المستخدم مسجل دخول
        showAdminDashboard();
        console.log('Admin logged in:', user.email);
    } else {
        // المستخدم غير مسجل دخول
        showLoginScreen();
    }
});

// عرض شاشة تسجيل الدخول
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('adminDashboard').style.display = 'none';
}

// عرض لوحة الإدارة
function showAdminDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    loadBookingsData();
}

// متغيرات التبويبات
let currentFilter = 'all';
let allBookingsData = [];

// تحميل جميع الحجوزات وعرض الإحصائيات
async function loadBookingsData() {
    try {
        const bookingsSnapshot = await db.collection('bookings').orderBy('createdAt', 'desc').get();
        
        allBookingsData = []; // مسح البيانات السابقة
        let totalBookings = 0;
        let confirmedBookings = 0;
        let pendingBookings = 0;
        let cancelledBookings = 0;
        
        bookingsSnapshot.forEach(doc => {
            const booking = doc.data();
            const docId = doc.id;
            
            // حفظ البيانات للفلترة
            allBookingsData.push({ ...booking, docId });
            
            totalBookings++;
            if (booking.status === 'confirmed') confirmedBookings++;
            if (booking.status === 'pending') pendingBookings++;
            if (booking.status === 'cancelled') cancelledBookings++;
        });
        
        // تحديث الإحصائيات
        document.getElementById('totalBookings').textContent = totalBookings;
        document.getElementById('confirmedBookings').textContent = confirmedBookings;
        document.getElementById('pendingBookings').textContent = pendingBookings;
        document.getElementById('cancelledBookings').textContent = cancelledBookings;
        
        // عرض البيانات المفلترة
        displayFilteredBookings(currentFilter);
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        document.getElementById('bookingsList').innerHTML = '<p class="error">خطأ في تحميل الحجوزات</p>';
    }
}

// عرض الحجوزات المفلترة
function displayFilteredBookings(filter) {
    let filteredBookings = allBookingsData;
    
    if (filter !== 'all') {
        filteredBookings = allBookingsData.filter(booking => booking.status === filter);
    }
    
    let bookingsHTML = '';
    
    filteredBookings.forEach(booking => {
        // تعديل عرض التاريخ الميلادي والهجري
        let createdDate = 'غير محدد';
        if (booking.createdAt) {
            const createdDateTime = booking.createdAt.toDate();
            const gregorian = createdDateTime.toLocaleDateString('ar-SA');
            const hijri = createdDateTime.toLocaleDateString('ar-SA-u-ca-islamic');
            createdDate = `${gregorian} (${hijri})`;
        }
        
        bookingsHTML += `
            <div class="booking-item">
                <div class="booking-info">
                    <strong>رقم الحجز:</strong> ${booking.bookingId || 'غير محدد'}<br>
                    <strong>العميل:</strong> ${booking.customerName}<br>
                    <strong>الهاتف:</strong> ${booking.customerPhone || 'غير محدد'}<br>
                    <strong>التاريخ:</strong> ${booking.date}<br>
                    <strong>الحالة:</strong> <span class="status-${booking.status}">${getStatusText(booking.status)}</span><br>
                    <strong>تاريخ الحجز:</strong> ${createdDate}<br>
                    <strong>المبلغ:</strong> ${booking.totalAmount || 'غير محدد'} ريال
                </div>
                <div class="booking-actions">
                    ${booking.status === 'pending' ? `
                        <button onclick="updateBookingStatus('${booking.docId}', 'confirmed')" class="confirm-btn">تأكيد</button>
                        <button onclick="updateBookingStatus('${booking.docId}', 'cancelled')" class="cancel-btn">إلغاء</button>
                    ` : booking.status === 'confirmed' ? `
                        <button onclick="updateBookingStatus('${booking.docId}', 'cancelled')" class="cancel-btn">إلغاء</button>
                    ` : `
                        <span class="status-final">منتهي</span>
                    `}
                </div>
            </div>
        `;
    });
    
    document.getElementById('bookingsList').innerHTML = bookingsHTML || `<p>لا توجد حجوزات ${getFilterText(filter)}</p>`;
}

// تحديث حالة الحجز
async function updateBookingStatus(docId, newStatus) {
    try {
        await db.collection('bookings').doc(docId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert(`تم ${newStatus === 'confirmed' ? 'تأكيد' : 'إلغاء'} الحجز بنجاح`);
        loadBookingsData(); // إعادة تحميل البيانات
        
    } catch (error) {
        console.error('Error updating booking:', error);
        alert('حدث خطأ في تحديث الحجز');
    }
}

// تحويل حالة الحجز إلى نص عربي
function getStatusText(status) {
    switch(status) {
        case 'pending': return 'في الانتظار';
        case 'confirmed': return 'مؤكد';
        case 'cancelled': return 'ملغي';
        default: return status;
    }
}

// نص وصفي للفلاتر
function getFilterText(filter) {
    switch(filter) {
        case 'pending': return 'في الانتظار';
        case 'confirmed': return 'مؤكدة';
        case 'cancelled': return 'ملغية';
        default: return '';
    }
}

// معالجة الأحداث
document.addEventListener('DOMContentLoaded', function() {
    
    // تسجيل الدخول
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            errorDiv.innerHTML = '';
        } catch (error) {
            errorDiv.innerHTML = `<p class="error">خطأ في تسجيل الدخول: ${error.message}</p>`;
        }
    });
    
    // تسجيل الخروج
    document.getElementById('logoutBtn').addEventListener('click', function() {
        firebase.auth().signOut();
    });
    
    // زر التحديث
    document.getElementById('refreshBookings').addEventListener('click', function() {
        loadBookingsData();
    });
    
    // النقر على التبويبات
    document.querySelectorAll('.tab-card').forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // إزالة active من جميع التبويبات
            document.querySelectorAll('.tab-card').forEach(t => t.classList.remove('active'));
            
            // إضافة active للتبويب المختار
            this.classList.add('active');
            
            // تحديث الفلتر وعرض البيانات
            currentFilter = filter;
            displayFilteredBookings(filter);
        });
    });
});
// متغيرات تقويم الإدارة
let adminCurrentDate = new Date();

// رسم تقويم الإدارة
function renderAdminCalendar() {
    const year = adminCurrentDate.getFullYear();
    const month = adminCurrentDate.getMonth();
    
    // تحديث عنوان الشهر
    const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    document.getElementById('adminCurrentMonth').textContent = `${monthNames[month]} ${year}`;
    
    // الحصول على أول يوم في الشهر
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // إنشاء شبكة التقويم
    const calendarGrid = document.getElementById('admin-calendar-grid');
    calendarGrid.innerHTML = '';
    
    // أسماء أيام الأسبوع
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    dayNames.forEach(dayName => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'admin-calendar-day header';
        dayHeader.textContent = dayName;
        calendarGrid.appendChild(dayHeader);
    });
    
    // إضافة أيام الشهر
    const currentDateObj = new Date();
    for (let i = 0; i < 42; i++) { // 6 أسابيع × 7 أيام
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'admin-calendar-day';
        
        // تحديد نوع اليوم
        if (cellDate.getMonth() !== month) {
            dayElement.classList.add('other-month');
        }
        
        // تحديد اليوم الحالي
        if (cellDate.toDateString() === currentDateObj.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // إصلاح مشكلة التوقيت
        const year = cellDate.getFullYear();
        const monthStr = String(cellDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(cellDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${monthStr}-${dayStr}`;
        
        // إضافة رقم اليوم
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = cellDate.getDate();
        dayElement.appendChild(dayNumber);
        
        // البحث عن الحجوزات في هذا اليوم
        const dayBookings = allBookingsData.filter(booking => booking.date === dateString);
        
        if (dayBookings.length > 0) {
            // إضافة عداد الحجوزات
            const bookingCount = document.createElement('div');
            bookingCount.className = 'booking-count';
            bookingCount.textContent = dayBookings.length;
            dayElement.appendChild(bookingCount);
            
            // إضافة الحجوزات المصغرة
            const bookingsContainer = document.createElement('div');
            bookingsContainer.className = 'day-bookings';
            
            dayBookings.slice(0, 2).forEach(booking => { // أظهر أول حجزين فقط
                const bookingMini = document.createElement('div');
                bookingMini.className = `booking-item-mini ${booking.status}`;
                bookingMini.textContent = booking.customerName;
                bookingsContainer.appendChild(bookingMini);
            });
            
            if (dayBookings.length > 2) {
                const moreBookings = document.createElement('div');
                moreBookings.className = 'booking-item-mini';
                moreBookings.textContent = `+${dayBookings.length - 2} أخرى`;
                moreBookings.style.fontSize = '0.7rem';
                moreBookings.style.opacity = '0.8';
                bookingsContainer.appendChild(moreBookings);
            }
            
            dayElement.appendChild(bookingsContainer);
        }
        
        // إضافة حدث النقر
        dayElement.addEventListener('click', () => showDayDetails(dateString, dayBookings));
        
        calendarGrid.appendChild(dayElement);
    }
}

// عرض تفاصيل اليوم
function showDayDetails(dateString, bookings) {
    const modal = document.getElementById('dayDetailsModal');
    const modalDate = document.getElementById('modalDate');
    const modalBookings = document.getElementById('modalBookings');
    
    // تنسيق التاريخ
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // التاريخ الميلادي
    const gregorianDate = `${day}/${month}/${year}`;
    
    // التاريخ الهجري
    let hijriDate = '';
    try {
        hijriDate = date.toLocaleDateString('ar-SA-u-ca-islamic', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch (error) {
        // إذا فشل الهجري، استخدم تحويل تقريبي
        const hijriYear = parseInt(year) - 578; // تحويل تقريبي
        hijriDate = `${day} من الشهر ${parseInt(month)} سنة ${hijriYear} هـ`;
    }
    
    modalDate.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">حجوزات اليوم</div>
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.9); line-height: 1.4;">
                📅 الميلادي: ${gregorianDate}<br>
                🌙 الهجري: ${hijriDate}
            </div>
        </div>
    `;
    
    if (bookings.length === 0) {
        modalBookings.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7);">لا توجد حجوزات في هذا اليوم</p>';
    } else {
        let bookingsHTML = '';
        bookings.forEach(booking => {
            let createdDate = 'غير محدد';
            if (booking.createdAt) {
                const createdDateTime = booking.createdAt.toDate();
                const gDate = createdDateTime.toLocaleDateString('ar-SA');
                const time = createdDateTime.toLocaleTimeString('ar-SA', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                createdDate = `${gDate} - ${time}`;
            }
            
            bookingsHTML += `
                <div class="modal-booking-item ${booking.status}">
                    <div>
                        <strong>رقم الحجز:</strong> ${booking.bookingId || 'غير محدد'}<br>
                        <strong>العميل:</strong> ${booking.customerName}<br>
                        <strong>الهاتف:</strong> ${booking.customerPhone || 'غير محدد'}<br>
                        <strong>رقم الهوية:</strong> ${booking.nationalId || 'غير محدد'}<br>
                        <strong>الحالة:</strong> <span style="color: ${getStatusColor(booking.status)}">${getStatusText(booking.status)}</span><br>
                        <strong>تاريخ الحجز:</strong> ${createdDate}<br>
                        <strong>المبلغ:</strong> ${booking.totalAmount || 'غير محدد'} ريال
                    </div>
                    <div class="modal-booking-actions">
                        ${booking.status === 'pending' ? `
                            <button onclick="updateBookingStatus('${booking.docId}', 'confirmed')" class="confirm-btn">تأكيد</button>
                            <button onclick="updateBookingStatus('${booking.docId}', 'cancelled')" class="cancel-btn">إلغاء</button>
                        ` : booking.status === 'confirmed' ? `
                            <button onclick="updateBookingStatus('${booking.docId}', 'cancelled')" class="cancel-btn">إلغاء</button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        modalBookings.innerHTML = bookingsHTML;
    }
    
    modal.style.display = 'block';
}

// إغلاق نافذة التفاصيل
function closeDayDetails() {
    document.getElementById('dayDetailsModal').style.display = 'none';
}

// ألوان الحالات
function getStatusColor(status) {
    switch(status) {
        case 'pending': return '#FFC107';
        case 'confirmed': return '#4CAF50';
        case 'cancelled': return '#f44336';
        default: return '#fff';
    }
}

// تحديث دالة loadBookingsData لتشمل التقويم
const originalLoadBookingsData = loadBookingsData;
loadBookingsData = async function() {
    await originalLoadBookingsData();
    renderAdminCalendar();
};

// إضافة مستمعات أحداث التقويم
document.addEventListener('DOMContentLoaded', function() {
    // التنقل بين الأشهر في تقويم الإدارة
    document.getElementById('adminPrevMonth').addEventListener('click', () => {
        adminCurrentDate.setMonth(adminCurrentDate.getMonth() - 1);
        renderAdminCalendar();
    });

    document.getElementById('adminNextMonth').addEventListener('click', () => {
        adminCurrentDate.setMonth(adminCurrentDate.getMonth() + 1);
        renderAdminCalendar();
    });
    
    // إغلاق النافذة عند النقر خارجها
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('dayDetailsModal');
        if (event.target === modal) {
            closeDayDetails();
        }
    });
});
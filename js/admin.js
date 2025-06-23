// إعدادات الجلسة
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 دقيقة بالميللي ثانية
let sessionTimer;
let lastActivityTime = Date.now();
let isAuthHandlerActive = false; // منع تكرار معالج المصادقة

// تجديد النشاط
function updateActivity() {
    lastActivityTime = Date.now();
    if (sessionTimer) {
        clearTimeout(sessionTimer);
    }
    startSessionTimer();
}

// بدء مؤقت الجلسة
function startSessionTimer() {
    sessionTimer = setTimeout(() => {
        // تسجيل خروج تلقائي
        firebase.auth().signOut();
        showWarning('انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.', 'انتهت الجلسة');
    }, SESSION_TIMEOUT);
}

// مراقبة النشاط
function initActivityMonitoring() {
    // مراقبة حركة الماوس والنقر والكتابة
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
        document.addEventListener(event, updateActivity, true);
    });
    
    // بدء المؤقت
    startSessionTimer();
}

// التحقق من حالة تسجيل الدخول (تشغيل مرة واحدة فقط)
firebase.auth().onAuthStateChanged(function(user) {
    if (isAuthHandlerActive) return; // منع التشغيل المتكرر
    
    if (user) {
        // المستخدم مسجل دخول
        isAuthHandlerActive = true;
        showAdminDashboard();
        initActivityMonitoring();
        console.log('Admin logged in:', user.email);
    } else {
        // المستخدم غير مسجل دخول
        isAuthHandlerActive = false;
        showLoginScreen();
        // إيقاف مراقبة النشاط
        if (sessionTimer) {
            clearTimeout(sessionTimer);
        }
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
        
        allBookingsData = [];
        let totalBookings = 0;
        let confirmedBookings = 0;
        let pendingBookings = 0;
        let cancelledBookings = 0;
        
        bookingsSnapshot.forEach(doc => {
            const booking = doc.data();
            const docId = doc.id;
            
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
        showError('خطأ في تحميل الحجوزات: ' + error.message);
    }
}

// عرض الحجوزات المفلترة مع المبلغ الإجمالي
function displayFilteredBookings(filter) {
    let filteredBookings = allBookingsData;
    
    if (filter !== 'all') {
        filteredBookings = allBookingsData.filter(booking => booking.status === filter);
    }
    
    let bookingsHTML = '';
    
    filteredBookings.forEach(booking => {
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
                    <strong>العربون المدفوع:</strong> ${booking.depositAmount || 'غير محدد'} ريال<br>
                    <strong>إجمالي المبلغ:</strong> ${booking.totalAmount || 'غير محدد'} ريال<br>
                    <strong>الحالة:</strong> <span class="status-${booking.status}">${getStatusText(booking.status)}</span><br>
                    <strong>تاريخ الحجز:</strong> ${createdDate}
                </div>
                <div class="booking-actions">
                    ${booking.status === 'pending' ? `
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px; color: white; font-size: 14px;">إجمالي المبلغ (ريال):</label>
                            <input type="number" id="totalAmount_${booking.docId}" placeholder="أدخل المبلغ الإجمالي" 
                                   style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; width: 120px; margin-bottom: 10px;"
                                   value="${booking.totalAmount || ''}">
                        </div>
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

// تحديث حالة الحجز مع المبلغ الإجمالي
async function updateBookingStatus(docId, newStatus) {
    try {
        const updateData = {
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // إذا كان التأكيد، أضف المبلغ الإجمالي
        if (newStatus === 'confirmed') {
            const totalAmountInput = document.getElementById(`totalAmount_${docId}`);
            if (totalAmountInput && totalAmountInput.value) {
                updateData.totalAmount = parseFloat(totalAmountInput.value);
            }
        }
        
        await db.collection('bookings').doc(docId).update(updateData);
        
        if (newStatus === 'confirmed') {
            showSuccess(`تم تأكيد الحجز بنجاح${updateData.totalAmount ? ` بمبلغ ${updateData.totalAmount} ريال` : ''}`, 'تم التأكيد');
        } else {
            showWarning('تم إلغاء الحجز', 'تم الإلغاء');
        }
        
        loadBookingsData(); // إعادة تحميل البيانات
        
    } catch (error) {
        console.error('Error updating booking:', error);
        showError('حدث خطأ في تحديث الحجز: ' + error.message);
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
    
    // تسجيل الدخول (تشغيل مرة واحدة فقط)
    let isLoginFormHandled = false;
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (isLoginFormHandled) return; // منع التشغيل المتكرر
        isLoginFormHandled = true;
        
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        const loadingToast = showLoadingToast('جاري تسجيل الدخول...');
        
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            loadingToast.close();
            errorDiv.innerHTML = '';
            // لا نعرض Toast هنا لأن onAuthStateChanged سيتولى الأمر
        } catch (error) {
            loadingToast.close();
            errorDiv.innerHTML = `<p class="error">خطأ في تسجيل الدخول: ${error.message}</p>`;
            showError('خطأ في بيانات تسجيل الدخول', 'فشل تسجيل الدخول');
        }
        
        setTimeout(() => {
            isLoginFormHandled = false;
        }, 2000);
    });
    
    // تسجيل الخروج
    document.getElementById('logoutBtn').addEventListener('click', function() {
        showConfirm(
            'هل أنت متأكد من تسجيل الخروج؟',
            'تسجيل الخروج',
            () => {
                firebase.auth().signOut();
                showInfo('تم تسجيل الخروج بنجاح', 'وداعاً');
            }
        );
    });
    
    // زر التحديث
    document.getElementById('refreshBookings').addEventListener('click', function() {
        const loadingToast = showLoadingToast('جاري تحديث البيانات...');
        loadBookingsData().then(() => {
            loadingToast.close();
            showSuccess('تم تحديث البيانات بنجاح', 'تحديث مكتمل');
        });
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
    for (let i = 0; i < 42; i++) {
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
            
            dayBookings.slice(0, 2).forEach(booking => {
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

// باقي الدوال تبقى كما هي...
// عرض تفاصيل اليوم
function showDayDetails(dateString, bookings) {
    const modal = document.getElementById('dayDetailsModal');
    const modalDate = document.getElementById('modalDate');
    const modalBookings = document.getElementById('modalBookings');
    
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    const gregorianDate = `${day}/${month}/${year}`;
    
    let hijriDate = '';
    try {
        hijriDate = date.toLocaleDateString('ar-SA-u-ca-islamic', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch (error) {
        const hijriYear = parseInt(year) - 578;
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
                        <strong>العربون:</strong> ${booking.depositAmount || 'غير محدد'} ريال<br>
                        <strong>إجمالي المبلغ:</strong> ${booking.totalAmount || 'غير محدد'} ريال<br>
                        <strong>الحالة:</strong> <span style="color: ${getStatusColor(booking.status)}">${getStatusText(booking.status)}</span><br>
                        <strong>تاريخ الحجز:</strong> ${createdDate}
                    </div>
                    <div class="modal-booking-actions">
                        ${booking.status === 'pending' ? `
                            <div style="margin-bottom: 10px;">
                                <input type="number" id="modalTotalAmount_${booking.docId}" placeholder="إجمالي المبلغ" 
                                       style="padding: 5px; border-radius: 5px; border: 1px solid #ccc; width: 100px;"
                                       value="${booking.totalAmount || ''}">
                            </div>
                            <button onclick="updateBookingStatusFromModal('${booking.docId}', 'confirmed')" class="confirm-btn">تأكيد</button>
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

// تحديث الحجز من المودال
async function updateBookingStatusFromModal(docId, newStatus) {
    const totalAmountInput = document.getElementById(`modalTotalAmount_${docId}`);
    const totalAmount = totalAmountInput ? totalAmountInput.value : '';
    
    // استخدام نفس دالة التحديث ولكن نحديث المدخل أولاً
    if (totalAmount) {
        const mainInput = document.getElementById(`totalAmount_${docId}`);
        if (mainInput) mainInput.value = totalAmount;
    }
    
    await updateBookingStatus(docId, newStatus);
    closeDayDetails();
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
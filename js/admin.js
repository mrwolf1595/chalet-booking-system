// إعدادات الجلسة
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 دقيقة بالميللي ثانية
let sessionTimer;
let lastActivityTime = Date.now();
let isAuthHandlerActive = false; // منع تكرار معالج المصادقة

// متغيرات تقويم الإدارة
let adminCurrentDate = new Date();

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

// تحديث الإحصائيات مع تأثيرات متحركة
function updateStatsWithAnimation(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    let currentValue = parseInt(element.textContent) || 0;
    
    // تصحيح القيم السالبة
    if (newValue < 0) newValue = 0;

    // إيقاف في حال نفس القيمة
    if (currentValue === newValue) return;

    const increment = newValue > currentValue ? 1 : -1;
    const steps = Math.abs(newValue - currentValue);
    const stepDuration = Math.min(1000 / steps, 50);

    let current = currentValue;
    const timer = setInterval(() => {
        current += increment;
        element.textContent = current;

        if (current === newValue) {
            clearInterval(timer);
            element.style.transform = 'scale(1.2)';
            setTimeout(() => {
                element.style.transition = 'transform 0.3s ease';
                element.style.transform = 'scale(1)';
            }, 200);
        }
    }, stepDuration);
}


// تحميل جميع الحجوزات وعرض الإحصائيات مع التأثيرات
async function loadBookingsData() {
    try {
        // إضافة مؤشر التحميل للتقويم
        const calendarGrid = document.getElementById('admin-calendar-grid');
        if (calendarGrid) {
            calendarGrid.style.opacity = '0.5';
            calendarGrid.style.pointerEvents = 'none';
        }
        
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
        
        // تحديث الإحصائيات مع التأثيرات المتحركة
        updateStatsWithAnimation('totalBookings', totalBookings);
        updateStatsWithAnimation('confirmedBookings', confirmedBookings);
        updateStatsWithAnimation('pendingBookings', pendingBookings);
        updateStatsWithAnimation('cancelledBookings', cancelledBookings);
        
        // عرض البيانات المفلترة
        displayFilteredBookings(currentFilter);
        
        // رسم التقويم المحسن
        renderAdminCalendar();
        
        // إعادة تفعيل التقويم
        if (calendarGrid) {
            setTimeout(() => {
                calendarGrid.style.transition = 'all 0.3s ease';
                calendarGrid.style.opacity = '1';
                calendarGrid.style.pointerEvents = 'auto';
            }, 300);
        }
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        showError('خطأ في تحميل الحجوزات: ' + error.message);
        
        // إعادة تفعيل التقويم في حالة الخطأ
        const calendarGrid = document.getElementById('admin-calendar-grid');
        if (calendarGrid) {
            calendarGrid.style.opacity = '1';
            calendarGrid.style.pointerEvents = 'auto';
        }
    }
}

// عرض الحجوزات المفلترة مع المبلغ الإجمالي والتأثيرات
function displayFilteredBookings(filter) {
    let filteredBookings = allBookingsData;
    
    if (filter !== 'all') {
        filteredBookings = allBookingsData.filter(booking => booking.status === filter);
    }
    
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) return;
    
    // إضافة تأثير fade out قبل التحديث
    bookingsList.style.opacity = '0.5';
    
    setTimeout(() => {
        let bookingsHTML = '';
        
        filteredBookings.forEach((booking, index) => {
            let createdDate = 'غير محدد';
            if (booking.createdAt) {
                const createdDateTime = booking.createdAt.toDate();
                const gregorian = createdDateTime.toLocaleDateString('ar-SA');
                const hijri = createdDateTime.toLocaleDateString('ar-SA-u-ca-islamic');
                createdDate = `${gregorian} (${hijri})`;
            }
            
            bookingsHTML += `
                <div class="booking-item" style="animation: slideInFromRight 0.5s ease ${index * 0.1}s both;">
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
                            <button onclick="updateBookingStatus('${booking.docId}', 'confirmed')" class="confirm-btn ripple">تأكيد</button>
                            <button onclick="updateBookingStatus('${booking.docId}', 'cancelled')" class="cancel-btn ripple">إلغاء</button>
                        ` : booking.status === 'confirmed' ? `
                            <button onclick="updateBookingStatus('${booking.docId}', 'cancelled')" class="cancel-btn ripple">إلغاء</button>
                        ` : `
                            <span class="status-final">منتهي</span>
                        `}
                    </div>
                </div>
            `;
        });
        
        bookingsList.innerHTML = bookingsHTML || `
            <div style="text-align: center; padding: 2rem; animation: fadeIn 0.5s ease;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                <p>لا توجد حجوزات ${getFilterText(filter)}</p>
            </div>
        `;
        
        // إضافة تأثير fade in
        bookingsList.style.transition = 'opacity 0.3s ease';
        bookingsList.style.opacity = '1';
        
    }, 200);
}

// تحديث حالة الحجز مع المبلغ الإجمالي والتأثيرات
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

// ألوان الحالات
function getStatusColor(status) {
    switch(status) {
        case 'pending': return '#FFC107';
        case 'confirmed': return '#4CAF50';
        case 'cancelled': return '#f44336';
        default: return '#fff';
    }
}

// رسم تقويم الإدارة المحسن مع جميع التأثيرات المطلوبة
function renderAdminCalendar() {
    const year = adminCurrentDate.getFullYear();
    const month = adminCurrentDate.getMonth();
    
    // تحديث عنوان الشهر مع تأثير
    const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const monthElement = document.getElementById('adminCurrentMonth');
    if (monthElement) {
        monthElement.textContent = `${monthNames[month]} ${year}`;
        
        // إضافة تأثير التحديث
        monthElement.style.opacity = '0';
        monthElement.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            monthElement.style.transition = 'all 0.3s ease';
            monthElement.style.opacity = '1';
            monthElement.style.transform = 'translateY(0)';
        }, 100);
    }
    
    // الحصول على أول يوم في الشهر
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // إنشاء شبكة التقويم
    const calendarGrid = document.getElementById('admin-calendar-grid');
    if (!calendarGrid) return;
    
    // إضافة تأثير fade out قبل التحديث
    calendarGrid.style.opacity = '0.7';
    calendarGrid.style.transform = 'scale(0.98)';
    
    setTimeout(() => {
        calendarGrid.innerHTML = '';
        
        // أسماء أيام الأسبوع مع تأثيرات
        const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        dayNames.forEach((dayName, index) => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'admin-calendar-day header';
            dayHeader.textContent = dayName;
            
            // إضافة تأثير ظهور متدرج لرؤوس الأيام
            dayHeader.style.opacity = '0';
            dayHeader.style.transform = 'translateY(-20px)';
            calendarGrid.appendChild(dayHeader);
            
            setTimeout(() => {
                dayHeader.style.transition = 'all 0.3s ease';
                dayHeader.style.opacity = '1';
                dayHeader.style.transform = 'translateY(0)';
            }, index * 50);
        });
        
        // إضافة أيام الشهر مع جميع التأثيرات
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
            
            // تحديد اليوم الحالي مع تأثير خاص
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
            
            // إضافة كلاسات حسب نوع الحجوزات
            let hasConfirmed = false;
            let hasPending = false;
            let hasCancelled = false;
            
            dayBookings.forEach(booking => {
                if (booking.status === 'confirmed') hasConfirmed = true;
                if (booking.status === 'pending') hasPending = true;
                if (booking.status === 'cancelled') hasCancelled = true;
            });
            
            // تطبيق الكلاسات والتأثيرات حسب الحالة
            if (dayBookings.length > 0) {
                dayElement.classList.add('has-bookings');
                
                // تحديد نوع الحالة المختلطة
                const statusCount = [hasConfirmed, hasPending, hasCancelled].filter(Boolean).length;
                if (statusCount > 1) {
                    dayElement.classList.add('mixed-status');
                } else if (hasPending) {
                    dayElement.classList.add('has-pending');
                }
                
                // إضافة عداد الحجوزات مع تأثير
                const bookingCount = document.createElement('div');
                bookingCount.className = 'booking-count';
                bookingCount.textContent = dayBookings.length;
                
                // تأثير ظهور العداد
                bookingCount.style.transform = 'scale(0)';
                dayElement.appendChild(bookingCount);
                
                setTimeout(() => {
                    bookingCount.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                    bookingCount.style.transform = 'scale(1)';
                }, (i % 7) * 100 + 200);
                
                // إضافة الحجوزات المصغرة مع تأثيرات
                const bookingsContainer = document.createElement('div');
                bookingsContainer.className = 'day-bookings';
                
                dayBookings.slice(0, 2).forEach((booking, index) => {
                    const bookingMini = document.createElement('div');
                    bookingMini.className = `booking-item-mini ${booking.status}`;
                    bookingMini.textContent = booking.customerName;
                    
                    // إضافة tooltip للحجز
                    bookingMini.title = `${booking.customerName} - ${getStatusText(booking.status)} - ${booking.date}`;
                    
                    // تأثير ظهور متدرج للحجوزات
                    bookingMini.style.opacity = '0';
                    bookingMini.style.transform = 'translateX(-20px)';
                    bookingsContainer.appendChild(bookingMini);
                    
                    setTimeout(() => {
                        bookingMini.style.transition = 'all 0.3s ease';
                        bookingMini.style.opacity = '1';
                        bookingMini.style.transform = 'translateX(0)';
                    }, (i % 7) * 50 + index * 100 + 300);
                    
                    // إضافة تأثير hover للحجوزات المصغرة
                    bookingMini.addEventListener('mouseenter', function() {
                        this.style.transform = 'translateX(5px) scale(1.05)';
                        this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    });
                    
                    bookingMini.addEventListener('mouseleave', function() {
                        this.style.transform = 'translateX(0) scale(1)';
                        this.style.boxShadow = 'none';
                    });
                });
                
                // إضافة مؤشر للحجوزات الإضافية
                if (dayBookings.length > 2) {
                    const moreBookings = document.createElement('div');
                    moreBookings.className = 'booking-item-mini more-bookings';
                    moreBookings.textContent = `+${dayBookings.length - 2} أخرى`;
                    moreBookings.style.fontSize = '0.7rem';
                    moreBookings.style.opacity = '0.8';
                    
                    // تأثير ظهور
                    moreBookings.style.opacity = '0';
                    moreBookings.style.transform = 'scale(0.8)';
                    bookingsContainer.appendChild(moreBookings);
                    
                    setTimeout(() => {
                        moreBookings.style.transition = 'all 0.3s ease';
                        moreBookings.style.opacity = '0.8';
                        moreBookings.style.transform = 'scale(1)';
                    }, (i % 7) * 50 + 500);
                }
                
                dayElement.appendChild(bookingsContainer);
                
                // إضافة تأثير نبضة للأيام التي تحتوي على حجوزات معلقة
                if (hasPending) {
                    dayElement.style.animation = 'pendingPulse 3s infinite ease-in-out';
                }
            }
            
            // إضافة تأثيرات hover متقدمة
            dayElement.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px) scale(1.02)';
                this.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                this.style.zIndex = '10';
                this.style.borderColor = '#667eea';
                this.style.borderWidth = '2px';
                
                // تأثير للحجوزات المصغرة
                const miniBookings = this.querySelectorAll('.booking-item-mini');
                miniBookings.forEach((mini, index) => {
                    setTimeout(() => {
                        mini.style.transform = 'translateX(3px)';
                    }, index * 50);
                });
            });
            
            dayElement.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
                this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                this.style.zIndex = '1';
                this.style.borderColor = '#f0f0f0';
                this.style.borderWidth = '1px';
                
                // إعادة تعيين الحجوزات المصغرة
                const miniBookings = this.querySelectorAll('.booking-item-mini');
                miniBookings.forEach(mini => {
                    mini.style.transform = 'translateX(0)';
                });
            });
            
            // إضافة تأثير النقر مع ripple
            dayElement.addEventListener('click', function() {
                // تأثير ripple
                const ripple = document.createElement('span');
                ripple.className = 'ripple-effect';
                ripple.style.position = 'absolute';
                ripple.style.borderRadius = '50%';
                ripple.style.background = 'rgba(102, 126, 234, 0.4)';
                ripple.style.transform = 'scale(0)';
                ripple.style.animation = 'ripple 0.6s linear';
                ripple.style.left = '50%';
                ripple.style.top = '50%';
                ripple.style.width = '20px';
                ripple.style.height = '20px';
                ripple.style.marginLeft = '-10px';
                ripple.style.marginTop = '-10px';
                
                this.style.position = 'relative';
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
                
                // استدعاء دالة عرض التفاصيل
                showDayDetails(dateString, dayBookings);
            });
            
            // إضافة تأثير ظهور متدرج للأيام
            dayElement.style.opacity = '0';
            dayElement.style.transform = 'translateY(20px)';
            calendarGrid.appendChild(dayElement);
            
            setTimeout(() => {
                dayElement.style.transition = 'all 0.4s ease';
                dayElement.style.opacity = '1';
                dayElement.style.transform = 'translateY(0)';
            }, (i % 7) * 50 + 100);
        }
        
        // إعادة تعيين تأثير الشبكة
        setTimeout(() => {
            calendarGrid.style.transition = 'all 0.3s ease';
            calendarGrid.style.opacity = '1';
            calendarGrid.style.transform = 'scale(1)';
        }, 200);
        
    }, 150);
}

// عرض تفاصيل اليوم مع تأثيرات محسنة
function showDayDetails(dateString, bookings) {
    const modal = document.getElementById('dayDetailsModal');
    const modalDate = document.getElementById('modalDate');
    const modalBookings = document.getElementById('modalBookings');
    
    if (!modal || !modalDate || !modalBookings) return;
    
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
        <div style="text-align: center;" class="day-details-animation">
            <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">حجوزات اليوم</div>
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.9); line-height: 1.4;">
                📅 الميلادي: ${gregorianDate}<br>
                🌙 الهجري: ${hijriDate}
            </div>
        </div>
    `;
    
    if (bookings.length === 0) {
        modalBookings.innerHTML = `
            <div style="text-align: center; color: rgba(255,255,255,0.7); padding: 2rem;" class="day-details-animation">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
                <p>لا توجد حجوزات في هذا اليوم</p>
                <small style="opacity: 0.7;">يمكن إضافة حجز جديد لهذا التاريخ</small>
            </div>
        `;
    } else {
        let bookingsHTML = '';
        bookings.forEach((booking, index) => {
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
                <div class="modal-booking-item ${booking.status} day-details-animation" 
                     style="animation-delay: ${index * 0.1}s;">
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
                            <button onclick="updateBookingStatusFromModal('${booking.docId}', 'confirmed')" class="confirm-btn ripple">تأكيد</button>
                            <button onclick="updateBookingStatus('${booking.docId}', 'cancelled')" class="cancel-btn ripple">إلغاء</button>
                        ` : booking.status === 'confirmed' ? `
                            <button onclick="updateBookingStatus('${booking.docId}', 'cancelled')" class="cancel-btn ripple">إلغاء</button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        modalBookings.innerHTML = bookingsHTML;
    }
    
    // إضافة تأثير ظهور للمودال
    modal.style.display = 'block';
    modal.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
        modal.style.transition = 'all 0.3s ease';
        modal.style.opacity = '1';
        modal.style.transform = 'scale(1)';
    }, 10);
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

// إغلاق نافذة التفاصيل مع تأثير
function closeDayDetails() {
    const modal = document.getElementById('dayDetailsModal');
    if (!modal) return;
    
    modal.style.transition = 'all 0.3s ease';
    modal.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// إضافة أنماط CSS للتأثيرات المتقدمة
function addAdminCalendarStyles() {
    if (document.querySelector('#admin-calendar-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'admin-calendar-styles';
    style.textContent = `
        @keyframes slideInFromRight {
            from { opacity: 0; transform: translateX(30px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes ripple {
            to { transform: scale(4); opacity: 0; }
        }
        
        @keyframes pendingPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.4); }
            50% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
        }
        
        @keyframes pulse {
            0%, 100% { 
                box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.4);
                transform: scale(1);
            }
            50% { 
                box-shadow: 0 0 0 8px rgba(0, 123, 255, 0);
                transform: scale(1.02);
            }
        }
        
        .admin-calendar-day {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .admin-calendar-day.has-bookings {
            background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%);
            border-color: #28a745;
        }
        
        .admin-calendar-day.has-pending {
            background: linear-gradient(135deg, #fff8e1 0%, #fffbf0 100%);
            border-color: #ffc107;
        }
        
        .admin-calendar-day.mixed-status {
            background: linear-gradient(45deg, #e8f5e8 0%, #e8f5e8 33%, #fff8e1 33%, #fff8e1 66%, #ffeaea 66%);
            border-color: #6c757d;
        }
        
        .admin-calendar-day.today {
            animation: pulse 2s infinite ease-in-out;
        }
        
        .booking-count {
            animation: bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        @keyframes bounceIn {
            0% { transform: scale(0); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
        }
        
        .booking-item-mini {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
        }
        
        .booking-item-mini:hover {
            transform: translateX(5px) scale(1.05);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .more-bookings {
            background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%) !important;
            color: #6c757d !important;
            font-weight: 600;
            border-right-color: #6c757d !important;
        }
        
        .more-bookings:hover {
            background: linear-gradient(135deg, #dee2e6 0%, #ced4da 100%) !important;
        }
        
        .day-details-animation {
            animation: slideInFromTop 0.4s ease-out;
        }
        
        @keyframes slideInFromTop {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .ripple {
            position: relative;
            overflow: hidden;
        }
        
        .ripple-effect {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        }
        
        /* تحسينات للجوال */
        @media (max-width: 768px) {
            .admin-calendar-day:hover {
                transform: translateY(-2px) scale(1.01);
            }
            
            .booking-item-mini:hover {
                transform: translateX(2px) scale(1.02);
            }
            
            .admin-calendar-day {
                min-height: 60px;
                padding: 4px;
            }
            
            .day-number {
                font-size: 0.8rem;
            }
            
            .booking-item-mini {
                font-size: 0.6rem;
                padding: 1px 3px;
                margin-bottom: 1px;
            }
            
            .booking-count {
                width: 16px;
                height: 16px;
                font-size: 0.6rem;
                top: 2px;
                left: 2px;
            }
        }
        
        @media (max-width: 480px) {
            .admin-calendar-day {
                min-height: 50px;
                padding: 2px;
            }
            
            .booking-item-mini {
                font-size: 0.5rem;
                padding: 0.5px 2px;
            }
            
            .booking-count {
                width: 14px;
                height: 14px;
                font-size: 0.5rem;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// معالجة الأحداث مع جميع التحسينات
document.addEventListener('DOMContentLoaded', function() {
    
    // إضافة الأنماط المتقدمة
    addAdminCalendarStyles();
    
    // تسجيل الدخول (تشغيل مرة واحدة فقط)
    let isLoginFormHandled = false;
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
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
    }
    
    // تسجيل الخروج
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            showConfirm(
                'هل أنت متأكد من تسجيل الخروج؟',
                'تسجيل الخروج',
                () => {
                    firebase.auth().signOut();
                    showInfo('تم تسجيل الخروج بنجاح', 'وداعاً');
                }
            );
        });
    }
    
    // زر التحديث مع تأثير
    const refreshBtn = document.getElementById('refreshBookings');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            // تأثير النقر
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
            
            const loadingToast = showLoadingToast('جاري تحديث البيانات...');
            loadBookingsData().then(() => {
                loadingToast.close();
                showSuccess('تم تحديث البيانات بنجاح', 'تحديث مكتمل');
            });
        });
    }
    
    // النقر على التبويبات مع تأثيرات متقدمة
    document.querySelectorAll('.tab-card').forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // إضافة تأثير النقر
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
            
            // إزالة active من جميع التبويبات مع تأثير
            document.querySelectorAll('.tab-card').forEach(t => {
                t.classList.remove('active');
                t.style.transform = 'scale(1)';
            });
            
            // إضافة active للتبويب المختار
            this.classList.add('active');
            
            // تحديث الفلتر وعرض البيانات
            currentFilter = filter;
            displayFilteredBookings(filter);
        });
    });
    
    // التنقل بين الأشهر في تقويم الإدارة مع تأثيرات
    const prevMonthBtn = document.getElementById('adminPrevMonth');
    const nextMonthBtn = document.getElementById('adminNextMonth');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            prevMonthBtn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                prevMonthBtn.style.transform = 'scale(1)';
            }, 150);
            
            adminCurrentDate.setMonth(adminCurrentDate.getMonth() - 1);
            renderAdminCalendar();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            nextMonthBtn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                nextMonthBtn.style.transform = 'scale(1)';
            }, 150);
            
            adminCurrentDate.setMonth(adminCurrentDate.getMonth() + 1);
            renderAdminCalendar();
        });
    }
    
    // إغلاق النافذة عند النقر خارجها مع تأثير
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('dayDetailsModal');
        if (event.target === modal) {
            closeDayDetails();
        }
    });
    
    // إضافة اختصارات لوحة المفاتيح للتقويم
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeDayDetails();
        }
        
        if (event.key === 'ArrowLeft' && event.ctrlKey) {
            event.preventDefault();
            adminCurrentDate.setMonth(adminCurrentDate.getMonth() - 1);
            renderAdminCalendar();
        }
        
        if (event.key === 'ArrowRight' && event.ctrlKey) {
            event.preventDefault();
            adminCurrentDate.setMonth(adminCurrentDate.getMonth() + 1);
            renderAdminCalendar();
        }
    });
    
    // إضافة تأثير ripple عالمي للأزرار
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('ripple') || 
            event.target.closest('.ripple')) {
            
            const button = event.target.classList.contains('ripple') ? 
                          event.target : event.target.closest('.ripple');
            
            const rect = button.getBoundingClientRect();
            const ripple = document.createElement('span');
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple-effect');
            
            const existingRipple = button.querySelector('.ripple-effect');
            if (existingRipple) {
                existingRipple.remove();
            }
            
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        }
    });
});
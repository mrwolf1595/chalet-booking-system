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
        const createdDate = booking.createdAt ? 
            booking.createdAt.toDate().toLocaleString('ar-SA') : 'غير محدد';
        
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
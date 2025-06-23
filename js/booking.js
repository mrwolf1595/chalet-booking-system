// استقبال التاريخ من URL
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedDate = urlParams.get('date');
    
    if (selectedDate) {
        document.getElementById('date').value = selectedDate;
        // فحص التوفر تلقائياً
        displayAvailability(document.getElementById('date'));
    }
    
    // تعيين الحد الأدنى لتاريخ الحجز (اليوم)
    document.getElementById('date').min = new Date().toISOString().split('T')[0];
});

// معالجة نموذج الحجز مع نظام Toast والعربون
document.getElementById('bookingForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const date = document.getElementById('date').value;
    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const nationalId = document.getElementById('nationalId').value.trim();
    const depositAmount = document.getElementById('depositAmount').value.trim();
    
    // التحقق من صحة البيانات
    if (!validateBookingForm(date, customerName, customerPhone, nationalId, depositAmount)) {
        return;
    }
    
    // عرض Loading Toast
    const loadingToast = showLoadingToast('جاري إرسال طلب الحجز...');
    
    try {
        // التحقق من توفر التاريخ
        loadingToast.update('جاري التحقق من توفر التاريخ...');
        
        const availabilityCheck = await db.collection('bookings')
            .where('date', '==', date)
            .where('status', 'in', ['confirmed', 'pending'])
            .get();
        
        if (!availabilityCheck.empty) {
            loadingToast.close();
            showDateUnavailable(date);
            return;
        }
        
        // إرسال طلب الحجز
        loadingToast.update('جاري حفظ بيانات الحجز...');
        
        const bookingId = 'BK' + Date.now();
        
        const bookingData = {
            bookingId: bookingId,
            date: date,
            customerName: customerName,
            customerPhone: customerPhone,
            nationalId: nationalId,
            depositAmount: parseFloat(depositAmount),
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('bookings').doc(bookingId).set(bookingData);
        
        loadingToast.close();
        
        // عرض رسالة النجاح مع تفاصيل العربون
        showBookingSuccessWithDeposit(bookingId, customerName, depositAmount);
        
        // إعادة تعيين النموذج
        document.getElementById('bookingForm').reset();
        document.getElementById('availability-status').innerHTML = '';
        
        // إعادة توجيه للصفحة الرئيسية بعد 4 ثوان
        setTimeout(() => {
            showInfo('سيتم إعادة توجيهك للصفحة الرئيسية', 'شكراً لك');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }, 4000);
        
    } catch (error) {
        loadingToast.close();
        showBookingError(error.message);
        console.error('Booking error:', error);
    }
});

// دالة التحقق من صحة البيانات مع العربون
function validateBookingForm(date, customerName, customerPhone, nationalId, depositAmount) {
    // التحقق من التاريخ
    if (!date) {
        showValidationError('date', 'يرجى اختيار تاريخ الحجز');
        document.getElementById('date').focus();
        return false;
    }
    
    // التحقق من أن التاريخ ليس في الماضي
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showValidationError('date', 'لا يمكن الحجز في تاريخ سابق');
        document.getElementById('date').focus();
        return false;
    }
    
    // التحقق من الاسم
    if (!customerName || customerName.length < 3) {
        showValidationError('customerName', 'يرجى إدخال الاسم الكامل (3 أحرف على الأقل)');
        document.getElementById('customerName').focus();
        return false;
    }
    
    // التحقق من أن الاسم يحتوي على أحرف عربية أو إنجليزية فقط
    if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(customerName)) {
        showValidationError('customerName', 'الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط');
        document.getElementById('customerName').focus();
        return false;
    }
    
    // التحقق من رقم الجوال
    if (!customerPhone) {
        showValidationError('customerPhone', 'يرجى إدخال رقم الجوال');
        document.getElementById('customerPhone').focus();
        return false;
    }
    
    // إزالة الرموز والمسافات من رقم الجوال
    const cleanPhone = customerPhone.replace(/[\s\-\+\(\)]/g, '');
    
    // التحقق من صحة رقم الجوال السعودي
    if (!/^(05|5)[0-9]{8}$/.test(cleanPhone)) {
        showValidationError('customerPhone', 'يرجى إدخال رقم جوال سعودي صحيح (05xxxxxxxx)');
        document.getElementById('customerPhone').focus();
        return false;
    }
    
    // التحقق من رقم الهوية
    if (!nationalId) {
        showValidationError('nationalId', 'يرجى إدخال رقم الهوية');
        document.getElementById('nationalId').focus();
        return false;
    }
    
    // التحقق من صحة رقم الهوية السعودي
    if (!/^[12][0-9]{9}$/.test(nationalId)) {
        showValidationError('nationalId', 'يرجى إدخال رقم هوية سعودي صحيح (10 أرقام يبدأ بـ 1 أو 2)');
        document.getElementById('nationalId').focus();
        return false;
    }
    
    // التحقق من مبلغ العربون
    if (!depositAmount) {
        showValidationError('depositAmount', 'يرجى إدخال مبلغ العربون');
        document.getElementById('depositAmount').focus();
        return false;
    }
    
    const depositValue = parseFloat(depositAmount);
    if (isNaN(depositValue) || depositValue <= 0) {
        showValidationError('depositAmount', 'يرجى إدخال مبلغ عربون صحيح (أكبر من صفر)');
        document.getElementById('depositAmount').focus();
        return false;
    }
    
    if (depositValue < 50) {
        showValidationError('depositAmount', 'الحد الأدنى للعربون هو 50 ريال');
        document.getElementById('depositAmount').focus();
        return false;
    }
    
    if (depositValue > 5000) {
        showValidationError('depositAmount', 'الحد الأقصى للعربون هو 5000 ريال');
        document.getElementById('depositAmount').focus();
        return false;
    }
    
    return true;
}

// التحقق من التاريخ عند تغييره
document.getElementById('date').addEventListener('change', function() {
    displayAvailability(this);
});

// تنسيق رقم الجوال أثناء الكتابة
document.getElementById('customerPhone').addEventListener('input', function() {
    let value = this.value.replace(/\D/g, ''); // إزالة كل ما ليس رقماً
    
    if (value.length > 0 && !value.startsWith('05')) {
        if (value.startsWith('5')) {
            value = '0' + value;
        } else if (value.startsWith('0') && !value.startsWith('05')) {
            value = '05' + value.substring(1);
        }
    }
    
    if (value.length > 10) {
        value = value.substring(0, 10);
    }
    
    this.value = value;
});

// تنسيق رقم الهوية أثناء الكتابة
document.getElementById('nationalId').addEventListener('input', function() {
    let value = this.value.replace(/\D/g, ''); // إزالة كل ما ليس رقماً
    
    if (value.length > 10) {
        value = value.substring(0, 10);
    }
    
    this.value = value;
});

// تنسيق الاسم أثناء الكتابة
document.getElementById('customerName').addEventListener('input', function() {
    // إزالة الأرقام والرموز غير المرغوب فيها
    this.value = this.value.replace(/[0-9\!\@\#\$\%\^\&\*\(\)\_\+\=\[\]\{\}\|\\\:\;\"\'\<\>\,\.\?\/]/g, '');
});

// تنسيق مبلغ العربون أثناء الكتابة
document.getElementById('depositAmount').addEventListener('input', function() {
    let value = this.value.replace(/[^\d.]/g, ''); // السماح بالأرقام والنقطة فقط
    
    // منع وجود أكثر من نقطة واحدة
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // تحديد عدد الخانات العشرية لخانتين فقط
    if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    this.value = value;
});

// إضافة معاينة للمبلغ
document.getElementById('depositAmount').addEventListener('input', function() {
    const depositValue = parseFloat(this.value);
    const previewDiv = document.getElementById('deposit-preview');
    
    if (!isNaN(depositValue) && depositValue > 0) {
        previewDiv.innerHTML = `
            <div style="background: rgba(76, 175, 80, 0.2); border: 1px solid #4CAF50; border-radius: 8px; padding: 10px; margin-top: 10px; text-align: center;">
                <strong>💰 معاينة العربون</strong><br>
                <span style="font-size: 1.2rem; color: #81C784;">${depositValue.toFixed(2)} ريال سعودي</span><br>
                <small style="color: rgba(255,255,255,0.8);">سيتم تحديد المبلغ الإجمالي من قبل الإدارة</small>
            </div>
        `;
    } else {
        previewDiv.innerHTML = '';
    }
});

// إعداد التاريخ الأدنى (اليوم)
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('date');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // تعيين التاريخ الأدنى إلى الغد
    dateInput.min = tomorrow.toISOString().split('T')[0];
    
    // عرض رسالة ترحيب
    setTimeout(() => {
        showInfo('املأ البيانات التالية لإتمام حجز الشالية<br><small>سيتم تحديد المبلغ الإجمالي من قبل الإدارة عند التأكيد</small>', 'نموذج الحجز 📝');
    }, 500);
});

// دالة خاصة لعرض نجاح الحجز مع العربون
function showBookingSuccessWithDeposit(bookingId, customerName, depositAmount) {
    const message = `
        <div style="text-align: center;">
            <h3 style="color: #4CAF50; margin-bottom: 10px;">✨ تم إرسال طلب الحجز بنجاح!</h3>
            <div style="background: rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin: 10px 0;">
                <strong>📋 تفاصيل الحجز:</strong><br>
                <span style="color: #81C784;">رقم الحجز: ${bookingId}</span><br>
                <span style="color: #81C784;">اسم العميل: ${customerName}</span><br>
                <span style="color: #FFD700;">💰 العربون المدفوع: ${depositAmount} ريال</span>
            </div>
            <div style="background: rgba(255, 193, 7, 0.2); border: 1px solid #FFC107; border-radius: 8px; padding: 10px; margin-top: 10px;">
                <strong>📝 ملاحظة مهمة:</strong><br>
                <small>سيتم تحديد المبلغ الإجمالي من قبل الإدارة وإشعارك عند تأكيد الحجز</small>
            </div>
        </div>
    `;
    
    return showToast(message, 'success', 'تم بنجاح', 8000);
}
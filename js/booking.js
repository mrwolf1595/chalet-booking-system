// معالجة نموذج الحجز
document.getElementById('bookingForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'جاري معالجة الطلب...';
    
try {
    const selectedDate = document.getElementById('date').value;
    
    // التحقق من توفر التاريخ
    const isAvailable = await checkDateAvailability(selectedDate);
    if (!isAvailable) {
        resultDiv.innerHTML = `
            <div class="error">
                ❌ التاريخ ${selectedDate} محجوز مسبقاً. يرجى اختيار تاريخ آخر.
            </div>
        `;
        return;
    }
    
    // جمع البيانات من النموذج
    const bookingData = {
        date: selectedDate,
        customerName: document.getElementById('customerName').value,
        customerPhone: document.getElementById('customerPhone').value,
        nationalId: document.getElementById('nationalId').value,
        status: 'pending',
        depositAmount: 500, // مبلغ العربون
        totalAmount: 1500, // المبلغ الإجمالي
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        bookingId: generateBookingId(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // ينتهي بعد 30 دقيقة
    };
    
    // حفظ الحجز في Firebase
    const docRef = await db.collection('bookings').add(bookingData);
    
    resultDiv.innerHTML = `
        <div class="success">
            ✅ تم إرسال طلب الحجز بنجاح!<br>
            رقم الحجز: <strong>${bookingData.bookingId}</strong><br>
            <strong>مهم:</strong> يجب تحويل العربون خلال 30 دقيقة وإلا سيلغى الحجز تلقائياً.<br>
            مبلغ العربون: <strong>500 ريال</strong>
        </div>
    `;
    
    // إعادة تعيين النموذج
    document.getElementById('bookingForm').reset();
    document.getElementById('availability-status').innerHTML = '';} catch (error) {
        resultDiv.innerHTML = `
            <div class="error">
                ❌ حدث خطأ: ${error.message}
            </div>
        `;
        console.error('Booking error:', error);
    }
});

// توليد رقم حجز فريد
function generateBookingId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CHT${timestamp}${random}`;
}
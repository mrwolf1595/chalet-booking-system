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
async function displayAvailability(dateInput) {
    const selectedDate = dateInput.value;
    if (!selectedDate) return;
    
    const availabilityDiv = document.getElementById('availability-status');
    if (!availabilityDiv) return;
    
    const isAvailable = await checkDateAvailability(selectedDate);
    
    if (isAvailable) {
        availabilityDiv.innerHTML = '✅ التاريخ متاح للحجز';
        availabilityDiv.className = 'success';
        document.querySelector('button[type="submit"]').disabled = false;
    } else {
        availabilityDiv.innerHTML = '❌ التاريخ محجوز مسبقاً - اختر تاريخاً آخر';
        availabilityDiv.className = 'error';
        document.querySelector('button[type="submit"]').disabled = true;
    }
}
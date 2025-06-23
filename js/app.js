// اختبار الاتصال بـ Firebase
document.getElementById('testFirebase').addEventListener('click', async function() {
    const statusDiv = document.getElementById('status');
    
    try {
        // محاولة كتابة بيانات تجريبية
        const testDoc = await db.collection('test').add({
            message: 'Firebase يعمل بنجاح!',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        statusDiv.innerHTML = `✅ تم الاتصال بنجاح!<br>معرف الوثيقة: ${testDoc.id}`;
        statusDiv.className = 'success';
        
        console.log('Firebase working! Document ID:', testDoc.id);
        
    } catch (error) {
        statusDiv.innerHTML = `❌ خطأ في الاتصال: ${error.message}`;
        statusDiv.className = 'error';
        
        console.error('Firebase error:', error);
    }
});

// التحقق من تحميل Firebase
document.addEventListener('DOMContentLoaded', function() {
    if (typeof firebase !== 'undefined') {
        console.log('✅ Firebase SDK loaded successfully');
    } else {
        console.error('❌ Firebase SDK not loaded');
        document.getElementById('status').innerHTML = '❌ فشل في تحميل Firebase';
        document.getElementById('status').className = 'error';
    }
});
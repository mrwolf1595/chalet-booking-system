// نظام Toast للإشعارات
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.maxToasts = 5;
        this.defaultDuration = 5000;
        this.init();
    }

    init() {
        // إنشاء حاوي التوست إذا لم يكن موجوداً
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    show(message, type = 'info', title = '', duration = this.defaultDuration) {
        // إزالة التوست الأقدم إذا تجاوز العدد المسموح
        if (this.toasts.length >= this.maxToasts) {
            this.remove(this.toasts[0]);
        }

        const toast = this.create(message, type, title, duration);
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // إظهار التوست مع تأخير بسيط للتأكد من الرندر
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // إزالة التوست تلقائياً
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }

        return toast;
    }

    create(message, type, title, duration) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // تحديد العنوان التلقائي حسب النوع
        if (!title) {
            switch (type) {
                case 'success':
                    title = 'نجح';
                    break;
                case 'error':
                    title = 'خطأ';
                    break;
                case 'warning':
                    title = 'تحذير';
                    break;
                case 'info':
                    title = 'معلومات';
                    break;
                default:
                    title = 'إشعار';
            }
        }

        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-title">
                    <span class="icon"></span>
                    ${title}
                </div>
                <button class="toast-close" type="button">&times;</button>
            </div>
            <div class="toast-message">${message}</div>
            ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
        `;

        // إضافة حدث الإغلاق
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.remove(toast);
        });

        // إضافة حدث النقر على التوست للإغلاق
        toast.addEventListener('click', (e) => {
            if (e.target === toast || e.target.classList.contains('toast-message')) {
                this.remove(toast);
            }
        });

        return toast;
    }

    remove(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.add('hide');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            
            // إزالة من المصفوفة
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, 400);
    }

    // طرق مساعدة للأنواع المختلفة
    success(message, title = '', duration = this.defaultDuration) {
        return this.show(message, 'success', title, duration);
    }

    error(message, title = '', duration = this.defaultDuration) {
        return this.show(message, 'error', title, duration);
    }

    warning(message, title = '', duration = this.defaultDuration) {
        return this.show(message, 'warning', title, duration);
    }

    info(message, title = '', duration = this.defaultDuration) {
        return this.show(message, 'info', title, duration);
    }

    // إزالة جميع التوست
    clear() {
        this.toasts.forEach(toast => this.remove(toast));
    }
}

// إنشاء مثيل عام للاستخدام
const Toast = new ToastManager();

// دوال مساعدة للاستخدام السريع
function showToast(message, type = 'info', title = '', duration = 5000) {
    return Toast.show(message, type, title, duration);
}

function showSuccess(message, title = 'تم بنجاح') {
    return Toast.success(message, title);
}

function showError(message, title = 'حدث خطأ') {
    return Toast.error(message, title);
}

function showWarning(message, title = 'تحذير') {
    return Toast.warning(message, title);
}

function showInfo(message, title = 'معلومات') {
    return Toast.info(message, title);
}

// استبدال alert و confirm بـ Toast
function replaceAlerts() {
    // حفظ الدوال الأصلية
    window.originalAlert = window.alert;
    window.originalConfirm = window.confirm;
    
    // استبدال alert
    window.alert = function(message) {
        showInfo(message, 'تنبيه');
    };
    
    // إنشاء confirm مخصص باستخدام Toast
    window.showConfirm = function(message, title = 'تأكيد', onConfirm = null, onCancel = null) {
        const confirmToast = document.createElement('div');
        confirmToast.className = 'toast warning';
        confirmToast.style.position = 'relative';
        
        confirmToast.innerHTML = `
            <div class="toast-header">
                <div class="toast-title">
                    <span class="icon"></span>
                    ${title}
                </div>
            </div>
            <div class="toast-message">${message}</div>
            <div class="toast-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button class="confirm-btn" style="padding: 0.5rem 1rem; border: none; border-radius: 6px; background: #4CAF50; color: white; cursor: pointer;">تأكيد</button>
                <button class="cancel-btn" style="padding: 0.5rem 1rem; border: none; border-radius: 6px; background: #f44336; color: white; cursor: pointer;">إلغاء</button>
            </div>
        `;
        
        Toast.container.appendChild(confirmToast);
        
        setTimeout(() => {
            confirmToast.classList.add('show');
        }, 10);
        
        const confirmBtn = confirmToast.querySelector('.confirm-btn');
        const cancelBtn = confirmToast.querySelector('.cancel-btn');
        
        confirmBtn.addEventListener('click', () => {
            Toast.remove(confirmToast);
            if (onConfirm) onConfirm();
        });
        
        cancelBtn.addEventListener('click', () => {
            Toast.remove(confirmToast);
            if (onCancel) onCancel();
        });
        
        return confirmToast;
    };
}

// تشغيل استبدال Alerts عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    replaceAlerts();
});

// دوال خاصة للتطبيق
function showBookingSuccess(bookingId, customerName) {
    const message = `تم حجز الشالية بنجاح!<br>
                     رقم الحجز: <strong>${bookingId}</strong><br>
                     باسم: <strong>${customerName}</strong>`;
    return showSuccess(message, 'تم الحجز بنجاح ✨');
}

function showBookingError(reason) {
    const message = `فشل في إرسال طلب الحجز<br>
                     السبب: ${reason}`;
    return showError(message, 'فشل الحجز');
}

function showDateUnavailable(date) {
    const message = `التاريخ ${date} غير متاح للحجز<br>
                     يرجى اختيار تاريخ آخر`;
    return showWarning(message, 'التاريخ محجوز');
}

function showLoginSuccess(userEmail) {
    const message = `مرحباً بك في لوحة الإدارة<br>
                     تم تسجيل الدخول بنجاح`;
    return showSuccess(message, 'أهلاً وسهلاً 👋');
}

function showLoginError() {
    const message = `بيانات تسجيل الدخول غير صحيحة<br>
                     يرجى التحقق من البريد الإلكتروني وكلمة المرور`;
    return showError(message, 'خطأ في تسجيل الدخول');
}

function showFirebaseConnection() {
    const message = `تم الاتصال بقاعدة البيانات بنجاح<br>
                     النظام جاهز للاستخدام`;
    return showSuccess(message, 'اتصال ناجح 🔗');
}

function showFirebaseError(error) {
    const message = `فشل في الاتصال بقاعدة البيانات<br>
                     الخطأ: ${error}`;
    return showError(message, 'خطأ في الاتصال');
}

function showBookingConfirmed(bookingId) {
    const message = `تم تأكيد الحجز رقم ${bookingId}<br>
                     سيتم إشعار العميل`;
    return showSuccess(message, 'تم التأكيد ✅');
}

function showBookingCancelled(bookingId) {
    const message = `تم إلغاء الحجز رقم ${bookingId}<br>
                     سيتم إشعار العميل`;
    return showWarning(message, 'تم الإلغاء ❌');
}

function showDataRefreshed() {
    const message = `تم تحديث البيانات بنجاح<br>
                     عرض أحدث المعلومات`;
    return showInfo(message, 'تم التحديث 🔄');
}

function showValidationError(field, message) {
    const fieldNames = {
        'date': 'التاريخ',
        'customerName': 'اسم العميل',
        'customerPhone': 'رقم الجوال',
        'nationalId': 'رقم الهوية',
        'adminEmail': 'البريد الإلكتروني',
        'adminPassword': 'كلمة المرور'
    };
    
    const fieldName = fieldNames[field] || field;
    const fullMessage = `خطأ في حقل ${fieldName}:<br>${message}`;
    return showWarning(fullMessage, 'بيانات غير صحيحة');
}

// دوال للجلسة والوقت
function showSessionWarning(timeLeft) {
    const message = `ستنتهي جلستك خلال ${timeLeft} دقائق<br>
                     يرجى حفظ عملك`;
    return showWarning(message, 'تحذير الجلسة ⏰');
}

function showSessionExpired() {
    const message = `انتهت جلسة العمل<br>
                     سيتم إعادة توجيهك لصفحة تسجيل الدخول`;
    return showError(message, 'انتهت الجلسة');
}

// دوال للنسخ الاحتياطي والتصدير
function showExportSuccess(filename) {
    const message = `تم تصدير البيانات بنجاح<br>
                     اسم الملف: ${filename}`;
    return showSuccess(message, 'تم التصدير 📄');
}

function showBackupSuccess() {
    const message = `تم إنشاء نسخة احتياطية بنجاح<br>
                     تاريخ النسخة: ${new Date().toLocaleDateString('ar')}`;
    return showSuccess(message, 'نسخة احتياطية ✅');
}

// دوال للإحصائيات
function showStatsUpdated(newBookings, totalRevenue) {
    const message = `الإحصائيات محدثة:<br>
                     حجوزات جديدة: ${newBookings}<br>
                     إجمالي الإيرادات: ${totalRevenue} ريال`;
    return showInfo(message, 'إحصائيات محدثة 📊');
}

// دوال التفاعل مع التقويم
function showCalendarUpdated() {
    const message = `تم تحديث التقويم بنجاح<br>
                     عرض أحدث حالات الحجز`;
    return showInfo(message, 'تقويم محدث 📅');
}

function showDateSelected(date) {
    const message = `تم اختيار التاريخ: ${date}<br>
                     يمكنك الآن إكمال بيانات الحجز`;
    return showInfo(message, 'تم اختيار التاريخ');
}

// دوال لحالات خاصة
function showMaintenanceMode() {
    const message = `النظام في وضع الصيانة<br>
                     سيعود للعمل قريباً`;
    return showWarning(message, 'وضع الصيانة 🔧');
}

function showOfflineMode() {
    const message = `لا يوجد اتصال بالإنترنت<br>
                     سيتم حفظ التغييرات عند عودة الاتصال`;
    return showWarning(message, 'بدون إنترنت 📶');
}

function showOnlineMode() {
    const message = `تم استعادة الاتصال بالإنترنت<br>
                     جاري مزامنة البيانات...`;
    return showSuccess(message, 'متصل مرة أخرى 🌐');
}

// مراقب اتصال الإنترنت
window.addEventListener('online', function() {
    showOnlineMode();
});

window.addEventListener('offline', function() {
    showOfflineMode();
});

// دالة لعرض تقدم التحميل
function showLoadingToast(message = 'جاري التحميل...') {
    const loadingToast = Toast.show(
        `<div style="display: flex; align-items: center; gap: 10px;">
            <div class="loading-spinner" style="width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            ${message}
        </div>`, 
        'info', 
        'يرجى الانتظار', 
        0 // بدون انتهاء تلقائي
    );
    
    return {
        close: () => Toast.remove(loadingToast),
        update: (newMessage) => {
            const messageDiv = loadingToast.querySelector('.toast-message');
            if (messageDiv) {
                messageDiv.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;">
                    <div class="loading-spinner" style="width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    ${newMessage}
                </div>`;
            }
        }
    };
}

// تصدير الكلاسات والدوال للاستخدام العام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ToastManager,
        Toast,
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showLoadingToast
    };
}
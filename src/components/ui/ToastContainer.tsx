import { useAppStore } from '@/store/store';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
};

const colorMap = {
    success: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
    error: 'border-red-500/50 bg-red-500/10 text-red-400',
    info: 'border-brand-500/50 bg-brand-500/10 text-brand-400',
};

export default function ToastContainer() {
    const toasts = useAppStore((s) => s.toasts);
    const removeToast = useAppStore((s) => s.removeToast);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {toasts.map((toast) => {
                const Icon = iconMap[toast.type];
                return (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-up glass ${colorMap[toast.type]}`}
                    >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1">{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 hover:opacity-70">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

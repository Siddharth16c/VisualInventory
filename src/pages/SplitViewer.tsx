import { useState, useRef } from 'react';
import { Columns2, Upload, X, FileText, Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';

interface PanelState {
    url: string | null;
    type: 'image' | 'pdf' | null;
    label: string;
}

function FilePanel({ panel, onLoad, onClear, side }: {
    panel: PanelState;
    onLoad: (url: string, type: 'image' | 'pdf', label: string) => void;
    onClear: () => void;
    side: 'Left' | 'Right';
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('image/') ? 'image' : 'pdf';
        onLoad(url, type, file.name);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('image/') ? 'image' : 'pdf';
        onLoad(url, type, file.name);
    };

    if (!panel.url) {
        return (
            <div
                className="flex-1 min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-surface-300 rounded-xl bg-surface-50 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all"
                onClick={() => inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
            >
                <Upload className="h-10 w-10 text-surface-300 mb-3" />
                <p className="text-surface-500 font-medium">{side} Panel</p>
                <p className="text-xs text-surface-400 mt-1">Click or drag a PDF, JPG, or PNG here</p>
                <input ref={inputRef} type="file" accept=".pdf,image/*" onChange={handleFile} className="hidden" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 border border-surface-200 rounded-xl overflow-hidden">
            {/* Panel toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-surface-50 border-b border-surface-200">
                <div className="flex items-center gap-2 text-xs text-surface-600 truncate">
                    {panel.type === 'pdf' ? <FileText className="h-3.5 w-3.5 flex-shrink-0 text-red-500" /> : <ImageIcon className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />}
                    <span className="truncate max-w-[180px]">{panel.label}</span>
                </div>
                <button onClick={onClear} className="p-1 hover:bg-surface-200 rounded transition-colors">
                    <X className="h-3.5 w-3.5 text-surface-500" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-surface-100">
                {panel.type === 'pdf' ? (
                    <iframe
                        src={panel.url}
                        className="w-full h-full min-h-[500px]"
                        title={panel.label}
                    />
                ) : (
                    <img
                        src={panel.url}
                        alt={panel.label}
                        className="w-full h-auto object-contain"
                    />
                )}
            </div>
        </div>
    );
}

export default function SplitViewer() {
    const [left, setLeft] = useState<PanelState>({ url: null, type: null, label: '' });
    const [right, setRight] = useState<PanelState>({ url: null, type: null, label: '' });

    const clearPanel = (side: 'left' | 'right') => {
        const panel = side === 'left' ? left : right;
        if (panel.url) URL.revokeObjectURL(panel.url);
        if (side === 'left') setLeft({ url: null, type: null, label: '' });
        else setRight({ url: null, type: null, label: '' });
    };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex items-center gap-2">
                <Columns2 className="h-5 w-5 text-brand-600" />
                <h1 className="text-xl font-bold text-surface-900">Split File Viewer</h1>
                <span className="text-xs text-surface-400 ml-2">In-memory only — files are not saved</span>
            </div>

            <div className="flex gap-4 h-[calc(100vh-220px)]">
                <FilePanel
                    panel={left}
                    onLoad={(url, type, label) => setLeft({ url, type, label })}
                    onClear={() => clearPanel('left')}
                    side="Left"
                />
                <FilePanel
                    panel={right}
                    onLoad={(url, type, label) => setRight({ url, type, label })}
                    onClear={() => clearPanel('right')}
                    side="Right"
                />
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';

export default function DevFirmSwitcher() {
    const [firms, setFirms] = useState<{ id: string, name: string, slug: string }[]>([]);
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        // Fetch the 3 seeded firms directly to populate the dropdown
        supabase.from('firms').select('id, name, slug').limit(3).then(({ data }) => {
            if (data && data.length > 0) {
                setFirms(data);
                const storedId = localStorage.getItem('dev_firm_id');
                if (storedId && data.some(f => f.id === storedId)) {
                    setActiveId(storedId);
                } else {
                    setActiveId(data[0].id);
                }
            }
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setActiveId(id);
        localStorage.setItem('dev_firm_id', id);
        // Force a full reload so Zustand, RLS contexts, and the DAL reset completely 
        // with the new firm acting as the authenticated tenant.
        window.location.reload();
    };

    if (firms.length === 0) return null;

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 uppercase tracking-widest hidden sm:inline-block">
                DEV MODE
            </span>
            <select
                value={activeId}
                onChange={handleChange}
                className="bg-white border border-surface-200 text-surface-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2"
            >
                {firms.map(f => (
                    <option key={f.id} value={f.id}>🏢 {f.name}</option>
                ))}
            </select>
        </div>
    );
}

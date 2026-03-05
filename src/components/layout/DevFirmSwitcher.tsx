import { useState, useEffect } from 'react';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import { resolveFirmFromURL, type FirmConfig } from '@/config/firmConfig';

/**
 * Firm Switcher — reads firms from the DB and lets the user switch.
 * No auth needed — firm context is set locally.
 */
export default function DevFirmSwitcher() {
    const [firms, setFirms] = useState<{ id: string; name: string; slug: string }[]>([]);
    const [activeId, setActiveId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const activeBusiness = useAppStore((s) => s.activeBusiness);

    useEffect(() => {
        DAL.firms.getAll().then((data) => {
            if (data && data.length > 0) {
                setFirms(data);
                // Find the firm matching the current activeBusiness
                const match = data.find((f: any) => f.name === activeBusiness);
                setActiveId(match?.id ?? data[0].id);
            }
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });
    }, [activeBusiness]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setActiveId(id);
        const firm = firms.find(f => f.id === id);
        if (firm) {
            const store = useAppStore.getState();
            store.setActiveBusiness(firm.name);
            store.addToast(`Switched to ${firm.name}`, 'success');
        }
    };

    if (loading) {
        return <p className="text-xs text-surface-400">Loading firms...</p>;
    }

    if (firms.length === 0) {
        return (
            <div className="text-xs text-surface-500 space-y-2">
                <p>No firms found in database.</p>
                <p className="text-surface-400">
                    Active firm: <strong>{activeBusiness}</strong> (from URL config)
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <select
                value={activeId}
                onChange={handleChange}
                className="bg-white border border-surface-200 text-surface-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5"
            >
                {firms.map(f => (
                    <option key={f.id} value={f.id}>🏢 {f.name}</option>
                ))}
            </select>
            <p className="text-[11px] text-surface-400">
                Firm ID: {activeId || '—'}
            </p>
        </div>
    );
}

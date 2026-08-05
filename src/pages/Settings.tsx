import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import DevFirmSwitcher from '@/components/layout/DevFirmSwitcher';
import Maintenance from '@/pages/Maintenance';

type SettingsTab = 'firm' | 'maintenance';

export default function Settings() {
    const [tab, setTab] = useState<SettingsTab>('firm');

    return (
        <div className="animate-fade-in space-y-4">
            {/* Header */}
           
           
                <Maintenance />
            
        </div>
    );
}

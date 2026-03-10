import { Navigate } from 'react-router-dom';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { FeatureFlag } from '@/config/featuresConfig';

interface FeatureRouteProps {
    feature: FeatureFlag;
    children: React.ReactNode;
}

export function FeatureRoute({ feature, children }: FeatureRouteProps) {
    const isEnabled = useFeatureFlag(feature);
    
    if (!isEnabled) {
        return <Navigate to="/billing" replace />;
    }
    
    return <>{children}</>;
}

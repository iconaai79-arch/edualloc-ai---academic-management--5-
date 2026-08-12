import React from 'react';
import { Institution, InstitutionModuleState } from '../types';
import { ModuleActivationView } from './ModuleActivationView';

interface ModuleAccessGuardProps {
    moduleId: string;
    moduleName: string;
    description: string;
    institution?: Institution | null;
    children: React.ReactNode;
    onActivateTrial?: (moduleId: string) => Promise<void>;
    isActivating?: boolean;
}

export const ModuleAccessGuard: React.FC<ModuleAccessGuardProps> = ({
    moduleId,
    moduleName,
    description,
    institution,
    children,
    onActivateTrial,
    isActivating
}) => {
    if (!institution) return <>{children}</>;

    // Resellers are exempt from module-specific trials
    if (institution.institutionType === 'Reseller') return <>{children}</>;

    // Demo institutions (simulators) are always active for testing
    if (institution.id.startsWith('demo_')) return <>{children}</>;

    // If main institution subscription is active & unexpired, grant access
    const now = new Date();
    const isInstSubscriptionActive = institution.status === 'active' &&
        (!institution.subscriptionEndsAt || new Date(institution.subscriptionEndsAt) > now);

    if (isInstSubscriptionActive) {
        return <>{children}</>;
    }

    // Match module state with fallback aliases (e.g. 'his' or 'his_core')
    const moduleState = institution.moduleStates?.find(m => {
        const id = m.moduleId || (m as any).module_id;
        if (id === moduleId) return true;
        if ((moduleId === 'his' || moduleId === 'his_core') && (id === 'his' || id === 'his_core')) return true;
        return false;
    });

    const isExpired = (state: InstitutionModuleState) => {
        if (state.status === 'trial' && state.trialEndsAt) {
            return new Date(state.trialEndsAt) < now;
        }
        if (state.status === 'active' && state.subscriptionEndsAt) {
            return new Date(state.subscriptionEndsAt) < now;
        }
        if (state.status === 'suspended') return true;
        return false;
    };

    if (!moduleState || moduleState.status === 'inactive') {
        return (
            <ModuleActivationView 
                moduleId={moduleId}
                moduleName={moduleName}
                description={description}
                onActivateTrial={() => onActivateTrial?.(moduleId)}
                isLoading={isActivating}
                status="inactive"
            />
        );
    }

    if (moduleState.status === 'expired' || isExpired(moduleState)) {
        return (
            <ModuleActivationView 
                moduleId={moduleId}
                moduleName={moduleName}
                description={description}
                onActivateTrial={() => onActivateTrial?.(moduleId)}
                isLoading={isActivating}
                status="expired"
            />
        );
    }

    return <>{children}</>;
};


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

    const moduleState = institution.moduleStates?.find(m => m.moduleId === moduleId);

    const isExpired = (state: InstitutionModuleState) => {
        const now = new Date();
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
                onActivateTrial={() => {}} // Upgrade flow would go here
                status="expired"
            />
        );
    }

    return <>{children}</>;
};

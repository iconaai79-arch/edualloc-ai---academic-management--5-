import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChurchDenomination, Institution } from '../../types';

interface ChurchContextType {
    denomination: ChurchDenomination;
    setDenomination: (d: ChurchDenomination) => void;
    currentChurch: Institution | null;
    isLoading: boolean;
}

const ChurchContext = createContext<ChurchContextType | undefined>(undefined);

export const ChurchDenominationProvider: React.FC<{ church: Institution, children: React.ReactNode }> = ({ church, children }) => {
    const [denomination, setDenomination] = useState<ChurchDenomination>((church.businessSubType as ChurchDenomination) || 'Other');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (church.businessSubType) {
            setDenomination(church.businessSubType as ChurchDenomination);
        }
    }, [church]);

    return (
        <ChurchContext.Provider value={{
            denomination,
            setDenomination,
            currentChurch: church,
            isLoading
        }}>
            {children}
        </ChurchContext.Provider>
    );
};

export const useChurch = () => {
    const context = useContext(ChurchContext);
    if (context === undefined) {
        throw new Error('useChurch must be used within a ChurchDenominationProvider');
    }
    return context;
};


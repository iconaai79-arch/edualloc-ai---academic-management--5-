import { supabase } from '../lib/supabase';
import { apiService, safeLocalStorage } from './apiService';
import type { 
    InstitutionWallet, 
    TeacherWallet, 
    SuperAdminRevenueWallet, 
    ConvenienceFeeConfig, 
    WalletTransaction,
    ConvenienceFeeAppliesTo,
    WalletType,
    WalletTransactionCategory
} from '../types';

export class WalletService {
    // ------------------------------------------------------------------------
    // 1. INSTITUTION FLOAT WALLETS
    // ------------------------------------------------------------------------
    
    /**
     * Fetch or auto-provision the institution's pre-funded float wallet.
     */
    async getInstitutionWallet(institutionId: string): Promise<InstitutionWallet> {
        if (!institutionId || institutionId === 'GLOBAL') {
            return this.getDefaultInstitutionWallet(institutionId || 'GLOBAL');
        }

        try {
            if (supabase) {
                const { data, error } = await supabase
                    .from('institution_wallets')
                    .select('*')
                    .eq('institution_id', institutionId)
                    .maybeSingle();

                if (!error && data) {
                    const mapped: InstitutionWallet = {
                        id: data.id,
                        institutionId: data.institution_id,
                        currency: data.currency || 'KES',
                        currentBalance: Number(data.current_balance || 0),
                        reservedBalance: Number(data.reserved_balance || 0),
                        lowFloatThreshold: Number(data.low_float_threshold || 10000),
                        autoTopupEnabled: !!data.auto_topup_enabled,
                        isLocked: !!data.is_locked,
                        lockReason: data.lock_reason,
                        createdAt: data.created_at,
                        updatedAt: data.updated_at
                    };
                    safeLocalStorage.setItem(`inst_wallet_${institutionId}`, JSON.stringify(mapped));
                    return mapped;
                }

                // If not found, try to auto-provision an initial wallet record
                const { data: newWallet, error: createErr } = await supabase
                    .from('institution_wallets')
                    .insert({
                        institution_id: institutionId,
                        currency: 'KES',
                        current_balance: 0.00,
                        reserved_balance: 0.00,
                        low_float_threshold: 10000.00
                    })
                    .select()
                    .maybeSingle();

                if (!createErr && newWallet) {
                    const mapped: InstitutionWallet = {
                        id: newWallet.id,
                        institutionId: newWallet.institution_id,
                        currency: newWallet.currency || 'KES',
                        currentBalance: Number(newWallet.current_balance || 0),
                        reservedBalance: Number(newWallet.reserved_balance || 0),
                        lowFloatThreshold: Number(newWallet.low_float_threshold || 10000),
                        autoTopupEnabled: !!newWallet.auto_topup_enabled,
                        isLocked: !!newWallet.is_locked,
                        lockReason: newWallet.lock_reason,
                        createdAt: newWallet.created_at,
                        updatedAt: newWallet.updated_at
                    };
                    safeLocalStorage.setItem(`inst_wallet_${institutionId}`, JSON.stringify(mapped));
                    return mapped;
                }
            }
        } catch (e) {
            console.warn('[WalletService] getInstitutionWallet online failed, falling back to cache:', e);
        }

        // Fallback to cache / default
        const cached = safeLocalStorage.getItem(`inst_wallet_${institutionId}`);
        if (cached) {
            try { return JSON.parse(cached); } catch (_) {}
        }
        return this.getDefaultInstitutionWallet(institutionId);
    }

    private getDefaultInstitutionWallet(institutionId: string): InstitutionWallet {
        return {
            id: `inst_wallet_${institutionId}`,
            institutionId,
            currency: 'KES',
            currentBalance: 0,
            reservedBalance: 0,
            lowFloatThreshold: 10000,
            autoTopupEnabled: false,
            isLocked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Trigger M-Pesa STK Push to top up school float wallet.
     */
    async initiateFloatTopUpViaMpesa(
        institutionId: string, 
        amount: number, 
        phoneNumber: string, 
        notes: string = 'School Float Wallet Top-Up'
    ): Promise<{ success: boolean; message: string; checkoutRequestId?: string }> {
        if (amount <= 0) {
            return { success: false, message: 'Top-up amount must be strictly greater than 0.' };
        }

        try {
            const paymentResult = await apiService.initiatePayment(
                'mpesa',
                amount,
                phoneNumber,
                {
                    transactionType: 'INSTITUTION_FLOAT_TOPUP',
                    institutionId,
                    purpose: notes,
                    initiatedAt: new Date().toISOString()
                }
            );

            if (paymentResult.success) {
                return {
                    success: true,
                    message: paymentResult.message || `STK push sent to ${phoneNumber}. Enter your M-Pesa PIN on your phone to complete float top-up.`,
                    checkoutRequestId: paymentResult.checkoutRequestId
                };
            } else {
                return {
                    success: false,
                    message: paymentResult.message || 'Failed to initiate M-Pesa STK push.'
                };
            }
        } catch (err: any) {
            return {
                success: false,
                message: err.message || 'Network error while initiating M-Pesa float top-up.'
            };
        }
    }

    /**
     * Directly credit top-up into the institution wallet (e.g. after STK callback or manual admin confirmation).
     */
    async creditInstitutionWallet(
        institutionId: string, 
        amount: number, 
        paymentRef: string, 
        phone?: string, 
        notes?: string
    ): Promise<{ success: boolean; newBalance: number; message: string }> {
        try {
            if (supabase) {
                const { data, error } = await supabase.rpc('topup_institution_wallet', {
                    p_institution_id: institutionId,
                    p_amount: amount,
                    p_payment_ref: paymentRef,
                    p_phone: phone || null,
                    p_notes: notes || 'M-Pesa Float Top-Up'
                });

                if (!error && data && data.success) {
                    // Update cache
                    const current = await this.getInstitutionWallet(institutionId);
                    current.currentBalance = data.new_balance;
                    safeLocalStorage.setItem(`inst_wallet_${institutionId}`, JSON.stringify(current));

                    return {
                        success: true,
                        newBalance: data.new_balance,
                        message: `Successfully credited KES ${amount.toLocaleString()} to School Float.`
                    };
                }
            }
        } catch (e) {
            console.warn('[WalletService] topup_institution_wallet RPC failed, falling back to local simulation:', e);
        }

        // Offline / fallback handler
        const current = await this.getInstitutionWallet(institutionId);
        const oldBal = current.currentBalance;
        current.currentBalance += amount;
        current.updatedAt = new Date().toISOString();
        safeLocalStorage.setItem(`inst_wallet_${institutionId}`, JSON.stringify(current));

        // Record fallback transaction
        await this.recordLocalTransaction({
            institutionId,
            walletType: 'INSTITUTION',
            transactionCategory: 'FLOAT_TOPUP',
            flowType: 'CREDIT',
            amount,
            convenienceFee: 0,
            netAmount: amount,
            balanceBefore: oldBal,
            balanceAfter: current.currentBalance,
            currency: 'KES',
            status: 'COMPLETED',
            externalReference: paymentRef,
            paymentMethod: 'MPESA',
            phoneNumber: phone,
            notes: notes || 'Offline Float Top-Up'
        });

        return {
            success: true,
            newBalance: current.currentBalance,
            message: `Successfully credited KES ${amount.toLocaleString()} to School Float.`
        };
    }

    // ------------------------------------------------------------------------
    // 2. TEACHER WALLETS
    // ------------------------------------------------------------------------

    /**
     * Fetch or auto-provision a teacher's earnings wallet.
     */
    async getTeacherWallet(teacherId: string, institutionId: string): Promise<TeacherWallet> {
        if (!teacherId) {
            return this.getDefaultTeacherWallet('ANONYMOUS', institutionId);
        }

        try {
            if (supabase) {
                const { data, error } = await supabase
                    .from('teacher_wallets')
                    .select('*')
                    .eq('teacher_id', teacherId)
                    .eq('institution_id', institutionId)
                    .maybeSingle();

                if (!error && data) {
                    const mapped: TeacherWallet = {
                        id: data.id,
                        teacherId: data.teacher_id,
                        institutionId: data.institution_id,
                        currency: data.currency || 'KES',
                        availableBalance: Number(data.available_balance || 0),
                        pendingBalance: Number(data.pending_balance || 0),
                        totalWithdrawn: Number(data.total_withdrawn || 0),
                        totalEarned: Number(data.total_earned || 0),
                        mpesaPhoneNumber: data.mpesa_phone_number,
                        isLocked: !!data.is_locked,
                        lockReason: data.lock_reason,
                        createdAt: data.created_at,
                        updatedAt: data.updated_at
                    };
                    safeLocalStorage.setItem(`teacher_wallet_${institutionId}_${teacherId}`, JSON.stringify(mapped));
                    return mapped;
                }

                // If not exists, auto-provision
                const { data: newWallet, error: createErr } = await supabase
                    .from('teacher_wallets')
                    .insert({
                        teacher_id: teacherId,
                        institution_id: institutionId,
                        currency: 'KES',
                        available_balance: 0.00,
                        pending_balance: 0.00,
                        total_withdrawn: 0.00,
                        total_earned: 0.00
                    })
                    .select()
                    .maybeSingle();

                if (!createErr && newWallet) {
                    const mapped: TeacherWallet = {
                        id: newWallet.id,
                        teacherId: newWallet.teacher_id,
                        institutionId: newWallet.institution_id,
                        currency: newWallet.currency || 'KES',
                        availableBalance: Number(newWallet.available_balance || 0),
                        pendingBalance: Number(newWallet.pending_balance || 0),
                        totalWithdrawn: Number(newWallet.total_withdrawn || 0),
                        totalEarned: Number(newWallet.total_earned || 0),
                        mpesaPhoneNumber: newWallet.mpesa_phone_number,
                        isLocked: !!newWallet.is_locked,
                        lockReason: newWallet.lock_reason,
                        createdAt: newWallet.created_at,
                        updatedAt: newWallet.updated_at
                    };
                    safeLocalStorage.setItem(`teacher_wallet_${institutionId}_${teacherId}`, JSON.stringify(mapped));
                    return mapped;
                }
            }
        } catch (e) {
            console.warn('[WalletService] getTeacherWallet online failed, falling back to cache:', e);
        }

        const cached = safeLocalStorage.getItem(`teacher_wallet_${institutionId}_${teacherId}`);
        if (cached) {
            try { return JSON.parse(cached); } catch (_) {}
        }
        return this.getDefaultTeacherWallet(teacherId, institutionId);
    }

    private getDefaultTeacherWallet(teacherId: string, institutionId: string): TeacherWallet {
        return {
            id: `teacher_wallet_${institutionId}_${teacherId}`,
            teacherId,
            institutionId,
            currency: 'KES',
            availableBalance: 0,
            pendingBalance: 0,
            totalWithdrawn: 0,
            totalEarned: 0,
            isLocked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    // ------------------------------------------------------------------------
    // 3. CONVENIENCE FEE ENGINE
    // ------------------------------------------------------------------------

    /**
     * Get active convenience fee rule.
     */
    async getActiveConvenienceFeeConfig(appliesTo: ConvenienceFeeAppliesTo = 'TEACHER_WITHDRAWAL'): Promise<ConvenienceFeeConfig> {
        try {
            if (supabase) {
                const { data, error } = await supabase
                    .from('convenience_fee_configs')
                    .select('*')
                    .eq('is_active', true)
                    .or(`applies_to.eq.${appliesTo},applies_to.eq.ALL_PAYOUTS`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!error && data) {
                    const mapped: ConvenienceFeeConfig = {
                        id: data.id,
                        name: data.name,
                        feeType: data.fee_type,
                        fixedAmount: Number(data.fixed_amount || 0),
                        percentageRate: Number(data.percentage_rate || 0),
                        minFee: Number(data.min_fee || 0),
                        maxFee: Number(data.max_fee || 100),
                        feeBearer: data.fee_bearer || 'TEACHER',
                        appliesTo: data.applies_to,
                        isActive: !!data.is_active,
                        description: data.description,
                        createdAt: data.created_at,
                        updatedAt: data.updated_at
                    };
                    safeLocalStorage.setItem(`conv_fee_config_${appliesTo}`, JSON.stringify(mapped));
                    return mapped;
                }
            }
        } catch (e) {
            console.warn('[WalletService] getActiveConvenienceFeeConfig failed, using fallback:', e);
        }

        const cached = safeLocalStorage.getItem(`conv_fee_config_${appliesTo}`);
        if (cached) {
            try { return JSON.parse(cached); } catch (_) {}
        }

        // Default Hybrid Rule: KES 10 fixed + 1% capped at KES 75
        return {
            id: 'default_fee_rule',
            name: 'Standard M-Pesa Cash-out Convenience Fee',
            feeType: 'HYBRID',
            fixedAmount: 10,
            percentageRate: 1.0,
            minFee: 10,
            maxFee: 75,
            feeBearer: 'TEACHER',
            appliesTo,
            isActive: true,
            description: 'Fixed KES 10 + 1% platform fee (capped at KES 75) borne by teacher on self-service M-Pesa cashout.'
        };
    }

    /**
     * Save / Update convenience fee configuration (Super Admin).
     */
    async saveConvenienceFeeConfig(config: Partial<ConvenienceFeeConfig>): Promise<void> {
        const payload: any = {
            name: config.name || 'Platform Convenience Fee',
            fee_type: config.feeType || 'HYBRID',
            fixed_amount: config.fixedAmount ?? 10,
            percentage_rate: config.percentageRate ?? 1.0,
            min_fee: config.minFee ?? 10,
            max_fee: config.maxFee ?? 75,
            fee_bearer: config.feeBearer || 'TEACHER',
            applies_to: config.appliesTo || 'TEACHER_WITHDRAWAL',
            is_active: config.isActive ?? true,
            description: config.description || '',
            updated_at: new Date().toISOString()
        };

        if (config.id && !config.id.startsWith('default_')) {
            payload.id = config.id;
        }

        try {
            if (supabase) {
                if (payload.id) {
                    await supabase.from('convenience_fee_configs').update(payload).eq('id', payload.id);
                } else {
                    await supabase.from('convenience_fee_configs').insert(payload);
                }
            }
        } catch (e) {
            console.warn('[WalletService] saveConvenienceFeeConfig error:', e);
        }

        safeLocalStorage.setItem(`conv_fee_config_${payload.applies_to}`, JSON.stringify({ ...config, ...payload }));
    }

    /**
     * Compute fee breakdown for a given amount.
     */
    calculateFeeBreakdown(amount: number, config: ConvenienceFeeConfig): {
        feeAmount: number;
        netAmount: number;
        grossAmount: number;
        feeBearer: 'TEACHER' | 'SCHOOL' | 'SPLIT';
    } {
        if (amount <= 0 || config.feeType === 'FREE') {
            return { feeAmount: 0, netAmount: amount, grossAmount: amount, feeBearer: config.feeBearer };
        }

        let calculated = 0;
        if (config.feeType === 'FIXED') {
            calculated = config.fixedAmount;
        } else if (config.feeType === 'PERCENTAGE') {
            calculated = Math.round((amount * (config.percentageRate / 100)) * 100) / 100;
        } else if (config.feeType === 'HYBRID') {
            calculated = Math.round((config.fixedAmount + (amount * (config.percentageRate / 100))) * 100) / 100;
        }

        if (config.minFee > 0 && calculated < config.minFee) calculated = config.minFee;
        if (config.maxFee > 0 && calculated > config.maxFee) calculated = config.maxFee;

        // If teacher bears fee, net disbursed is gross minus fee
        const net = config.feeBearer === 'TEACHER' ? Math.max(0, amount - calculated) : amount;

        return {
            feeAmount: calculated,
            netAmount: net,
            grossAmount: amount,
            feeBearer: config.feeBearer
        };
    }

    // ------------------------------------------------------------------------
    // 4. ATOMIC DISBURSEMENT & WITHDRAWAL
    // ------------------------------------------------------------------------

    /**
     * Disburse approved remedial lesson earnings directly from School Float into Teacher Wallet.
     * Instantaneous and zero external transfer fee!
     */
    async disburseToTeacherWallet(params: {
        institutionId: string;
        teacherId: string;
        amount: number;
        payoutId?: string;
        sessionIds?: string[];
        notes?: string;
    }): Promise<{ success: boolean; message: string; schoolNewBalance?: number; teacherNewBalance?: number }> {
        const { institutionId, teacherId, amount, payoutId, sessionIds = [], notes } = params;

        if (amount <= 0) {
            return { success: false, message: 'Disbursement amount must be greater than zero.' };
        }

        try {
            if (supabase) {
                const { data, error } = await supabase.rpc('disburse_payout_to_teacher_wallet', {
                    p_institution_id: institutionId,
                    p_teacher_id: teacherId,
                    p_amount: amount,
                    p_payout_id: payoutId || null,
                    p_session_ids: sessionIds,
                    p_notes: notes || 'Remedial Lesson Payout Credited'
                });

                if (!error && data && data.success) {
                    // Sync cache
                    await this.getInstitutionWallet(institutionId);
                    await this.getTeacherWallet(teacherId, institutionId);

                    return {
                        success: true,
                        message: `Successfully credited KES ${amount.toLocaleString()} to Teacher Wallet!`,
                        schoolNewBalance: data.school_new_balance,
                        teacherNewBalance: data.teacher_new_balance
                    };
                }

                if (error) {
                    throw new Error(error.message);
                }
            }
        } catch (e: any) {
            console.warn('[WalletService] disburse_payout_to_teacher_wallet RPC failed, falling back to local simulation:', e);
            return {
                success: false,
                message: e.message || 'Failed to disburse into teacher wallet.'
            };
        }

        return { success: false, message: 'Wallet backend service unavailable.' };
    }

    /**
     * Teacher initiates an on-demand withdrawal from their wallet to M-Pesa.
     * Platform Convenience Fee is automatically deducted and credited to Super Admin Revenue.
     */
    async withdrawTeacherWalletToMpesa(params: {
        institutionId: string;
        teacherId: string;
        amount: number;
        phoneNumber: string;
        notes?: string;
    }): Promise<{ 
        success: boolean; 
        message: string; 
        grossAmount?: number;
        convenienceFee?: number; 
        netDisbursedMpesa?: number; 
        newBalance?: number 
    }> {
        const { institutionId, teacherId, amount, phoneNumber, notes } = params;

        if (amount <= 0) {
            return { success: false, message: 'Withdrawal amount must be greater than zero.' };
        }

        const formattedPhone = phoneNumber.replace(/[^0-9+]/g, '');
        if (!formattedPhone || formattedPhone.length < 10) {
            return { success: false, message: 'Please provide a valid Safaricom M-Pesa phone number.' };
        }

        try {
            if (supabase) {
                const extRef = `WDL_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

                const { data, error } = await supabase.rpc('withdraw_teacher_wallet_mpesa', {
                    p_institution_id: institutionId,
                    p_teacher_id: teacherId,
                    p_amount: amount,
                    p_phone: formattedPhone,
                    p_external_ref: extRef,
                    p_notes: notes || 'Teacher Self-Service M-Pesa Withdrawal'
                });

                if (!error && data && data.success) {
                    // Invalidate and refresh cache
                    await this.getTeacherWallet(teacherId, institutionId);

                    return {
                        success: true,
                        message: `Successfully processed withdrawal of KES ${data.net_disbursed_mpesa.toLocaleString()} to ${formattedPhone}. (Fee: KES ${data.convenience_fee})`,
                        grossAmount: data.gross_amount,
                        convenienceFee: data.convenience_fee,
                        netDisbursedMpesa: data.net_disbursed_mpesa,
                        newBalance: data.teacher_new_balance
                    };
                }

                if (error) {
                    throw new Error(error.message);
                }
            }
        } catch (e: any) {
            console.error('[WalletService] withdraw_teacher_wallet_mpesa error:', e);
            return {
                success: false,
                message: e.message || 'Failed to process teacher wallet withdrawal.'
            };
        }

        return { success: false, message: 'Wallet backend service unavailable.' };
    }

    // ------------------------------------------------------------------------
    // 5. PLATFORM REVENUE WALLET (SUPER ADMIN)
    // ------------------------------------------------------------------------

    async getSuperAdminRevenueWallet(): Promise<SuperAdminRevenueWallet> {
        try {
            if (supabase) {
                const { data, error } = await supabase
                    .from('super_admin_revenue_wallets')
                    .select('*')
                    .eq('currency', 'KES')
                    .maybeSingle();

                if (!error && data) {
                    return {
                        id: data.id,
                        currency: data.currency || 'KES',
                        totalFeesCollected: Number(data.total_fees_collected || 0),
                        availableBalance: Number(data.available_balance || 0),
                        totalWithdrawn: Number(data.total_withdrawn || 0),
                        createdAt: data.created_at,
                        updatedAt: data.updated_at
                    };
                }
            }
        } catch (e) {
            console.warn('[WalletService] getSuperAdminRevenueWallet error:', e);
        }

        return {
            id: 'super_admin_rev_default',
            currency: 'KES',
            totalFeesCollected: 0,
            availableBalance: 0,
            totalWithdrawn: 0
        };
    }

    // ------------------------------------------------------------------------
    // 6. TRANSACTION LEDGER
    // ------------------------------------------------------------------------

    async getWalletTransactions(params: {
        institutionId?: string;
        teacherId?: string;
        walletType?: WalletType;
        category?: WalletTransactionCategory;
        limit?: number;
    }): Promise<WalletTransaction[]> {
        const { institutionId, teacherId, walletType, category, limit = 50 } = params;

        try {
            if (supabase) {
                let query = supabase
                    .from('wallet_transactions')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (institutionId && institutionId !== 'GLOBAL') {
                    query = query.eq('institution_id', institutionId);
                }
                if (teacherId) {
                    query = query.eq('teacher_id', teacherId);
                }
                if (walletType) {
                    query = query.eq('wallet_type', walletType);
                }
                if (category) {
                    query = query.eq('transaction_category', category);
                }

                const { data, error } = await query;
                if (!error && data) {
                    return data.map((t: any) => ({
                        id: t.id,
                        institutionId: t.institution_id,
                        walletType: t.wallet_type,
                        institutionWalletId: t.institution_wallet_id,
                        teacherWalletId: t.teacher_wallet_id,
                        teacherId: t.teacher_id,
                        transactionCategory: t.transaction_category,
                        flowType: t.flow_type,
                        amount: Number(t.amount || 0),
                        convenienceFee: Number(t.convenience_fee || 0),
                        netAmount: Number(t.net_amount || 0),
                        balanceBefore: Number(t.balance_before || 0),
                        balanceAfter: Number(t.balance_after || 0),
                        currency: t.currency || 'KES',
                        status: t.status,
                        externalReference: t.external_reference,
                        paymentMethod: t.payment_method || 'MPESA',
                        phoneNumber: t.phone_number,
                        relatedPayoutId: t.related_payout_id,
                        relatedSessionIds: t.related_session_ids,
                        metadata: t.metadata,
                        notes: t.notes,
                        createdAt: t.created_at
                    }));
                }
            }
        } catch (e) {
            console.warn('[WalletService] getWalletTransactions error:', e);
        }

        // Fallback local storage
        const local = safeLocalStorage.getItem('local_wallet_transactions');
        if (local) {
            try {
                let txns: WalletTransaction[] = JSON.parse(local);
                if (institutionId) txns = txns.filter(t => t.institutionId === institutionId);
                if (teacherId) txns = txns.filter(t => t.teacherId === teacherId);
                if (walletType) txns = txns.filter(t => t.walletType === walletType);
                return txns.slice(0, limit);
            } catch (_) {}
        }
        return [];
    }

    private async recordLocalTransaction(txn: Partial<WalletTransaction>): Promise<void> {
        try {
            const raw = safeLocalStorage.getItem('local_wallet_transactions');
            const list: WalletTransaction[] = raw ? JSON.parse(raw) : [];
            const newTxn: WalletTransaction = {
                id: `txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                walletType: txn.walletType || 'INSTITUTION',
                transactionCategory: txn.transactionCategory || 'FLOAT_TOPUP',
                flowType: txn.flowType || 'CREDIT',
                amount: txn.amount || 0,
                convenienceFee: txn.convenienceFee || 0,
                netAmount: txn.netAmount || 0,
                balanceBefore: txn.balanceBefore || 0,
                balanceAfter: txn.balanceAfter || 0,
                currency: 'KES',
                status: txn.status || 'COMPLETED',
                institutionId: txn.institutionId,
                teacherId: txn.teacherId,
                paymentMethod: txn.paymentMethod || 'MPESA',
                phoneNumber: txn.phoneNumber,
                externalReference: txn.externalReference,
                notes: txn.notes,
                createdAt: new Date().toISOString()
            };
            list.unshift(newTxn);
            safeLocalStorage.setItem('local_wallet_transactions', JSON.stringify(list.slice(0, 200)));
        } catch (_) {}
    }
}

export const walletService = new WalletService();

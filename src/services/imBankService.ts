import { supabase } from '../lib/supabase';

export interface ImBankTransaction {
  id: string;
  bank_reference: string;
  bill_number: string;
  customer_name: string;
  amount: number;
  payment_channel?: string;
  transaction_date: string;
  status: string;
  institution_id?: string;
  raw_payload?: Record<string, any>;
  created_at: string;
}

export const imBankService = {
  /**
   * Fetch recent I&M Bank B2B transactions for an institution
   */
  async getTransactions(institutionId?: string, limit = 50): Promise<ImBankTransaction[]> {
    if (!supabase) return [];
    
    let query = supabase
      .from('im_bank_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Error fetching I&M bank transactions:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Test/Execute I&M Biller Customer Validation
   */
  async validateBill(billNumber: string, institutionId?: string, amount: number = 0) {
    if (!supabase) throw new Error('Supabase client is not initialized');
    
    const { data, error } = await supabase.rpc('im_bank_validate', {
      p_bill_number: billNumber,
      p_institution_id: institutionId || null,
      p_amount: amount,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Simulate I&M Payment Notification Webhook
   */
  async simulateNotification(
    billNumber: string,
    amount: number,
    bankReference: string,
    institutionId?: string,
    paymentChannel = 'PESALINK'
  ) {
    if (!supabase) throw new Error('Supabase client is not initialized');
    
    const { data, error } = await supabase.rpc('im_bank_notify', {
      p_bill_number: billNumber,
      p_amount: amount,
      p_bank_reference: bankReference,
      p_institution_id: institutionId || null,
      p_payment_channel: paymentChannel,
      p_transaction_date: new Date().toISOString(),
      p_raw_payload: {
        billNumber,
        amount: String(amount),
        bankReference,
        paymentChannel,
        institutionId,
        transactionDate: new Date().toISOString(),
        source: 'Simulator',
      },
    });

    if (error) throw error;
    return data;
  },
};

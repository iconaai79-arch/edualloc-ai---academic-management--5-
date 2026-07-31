import { supabase } from '../lib/supabase';

export interface EquityBillerTransaction {
  id: string;
  bank_reference: string;
  bill_number: string;
  customer_name: string;
  amount: number;
  transaction_date: string;
  status: string;
  institution_id?: string;
  raw_payload?: Record<string, any>;
  created_at: string;
}

export const equityBillerService = {
  /**
   * Fetch recent Equity Biller transactions
   */
  async getTransactions(limit = 50): Promise<EquityBillerTransaction[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('equity_biller_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Error fetching equity biller transactions:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Test Biller Validation locally or via Edge Function
   */
  async validateBill(billNumber: string, amount: number = 0) {
    if (!supabase) throw new Error('Supabase client is not initialized');
    const { data, error } = await supabase.rpc('equity_biller_validate', {
      p_bill_number: billNumber,
      p_amount: amount,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Test Payment Notification simulation
   */
  async simulateNotification(
    billNumber: string,
    amount: number,
    bankReference: string
  ) {
    if (!supabase) throw new Error('Supabase client is not initialized');
    const { data, error } = await supabase.rpc('equity_biller_notify', {
      p_bill_number: billNumber,
      p_amount: amount,
      p_bank_reference: bankReference,
      p_transaction_date: new Date().toISOString(),
      p_raw_payload: {
        billNumber,
        amount: String(amount),
        bankReference,
        transactionDate: new Date().toISOString(),
        source: 'Simulator',
      },
    });

    if (error) throw error;
    return data;
  },
};

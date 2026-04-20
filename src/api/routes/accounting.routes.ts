import { Router } from "express";
import { z } from "zod";
import { supabase, supabaseAdmin } from "../services/supabase.service.js";
import { getUserFromToken } from "../middleware/auth.middleware.js";

const router = Router();

// Middleware: check accountant or admin role
export const requireAccounting = async (req: any, res: any, next: any) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'არაავტორიზებული მოთხოვნა' });
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'accountant'].includes(profile.role)) {
    return res.status(403).json({ error: 'ბუღალტერიის მოდულზე წვდომა შეზღუდულია' });
  }
  req.userProfile = profile;
  req.userId = user.id;
  next();
};

export const requireAccountingRead = async (req: any, res: any, next: any) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'არაავტორიზებული მოთხოვნა' });
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'accountant', 'consultant'].includes(profile.role)) {
    return res.status(403).json({ error: 'წვდომა შეზღუდულია' });
  }
  req.userProfile = profile;
  req.userId = user.id;
  next();
};

// ── B1: Dashboard KPI ──
router.get('/dashboard', requireAccountingRead, async (req: any, res) => {
  try {
    const [
      revenueRes, cogsRes, invoicesRes, stockRes, vatRes, paymentBreakdownRes, promoSalesRes
    ] = await Promise.all([
      supabaseAdmin.from('v_profit_loss').select('account_type,amount').eq('account_type', 'REVENUE'),
      supabaseAdmin.from('v_profit_loss').select('account_type,amount').eq('account_type', 'COGS'),
      supabaseAdmin.from('invoices').select('total_amount, paid_amount, payment_status').eq('payment_status', 'PAID'),
      supabaseAdmin.from('stock_levels').select('total_cost_value'),
      supabaseAdmin.from('v_vat_summary').select('net_vat_payable').order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(1),
      supabaseAdmin
        .from('orders')
        .select('payment_method, payment_provider, sale_source, total_price, status')
        .in('status', ['delivered', 'confirmed', 'completed']),
      supabaseAdmin.from('order_items').select('price_at_purchase, quantity').eq('is_promotional_sale', true)
    ]);

    const revenue = (revenueRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const cogs = (cogsRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const grossProfit = revenue - cogs;
    const grossMarginPct = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : '0.0';
    const totalPaidRevenue = (invoicesRes.data || []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
    const inventoryValue = (stockRes.data || []).reduce((s: number, r: any) => s + Number(r.total_cost_value || 0), 0);
    const latestVatPayable = vatRes.data?.[0]?.net_vat_payable || 0;
    const promotionalSales = (promoSalesRes?.data || []).reduce((sum: number, item: any) => sum + ((Number(item.price_at_purchase) || 0) * (Number(item.quantity) || 1)), 0);

    const ordersData = paymentBreakdownRes.data || [];
    const paymentBreakdown: Record<string, { count: number; total: number; onlineTotal: number; showroomTotal: number }> = {
      bog: { count: 0, total: 0, onlineTotal: 0, showroomTotal: 0 },
      tbc: { count: 0, total: 0, onlineTotal: 0, showroomTotal: 0 },
      credo: { count: 0, total: 0, onlineTotal: 0, showroomTotal: 0 },
      cash: { count: 0, total: 0, onlineTotal: 0, showroomTotal: 0 },
    };
    for (const o of ordersData) {
      const rawMethod = (o.payment_method || o.payment_provider || '').toLowerCase();
      let key = 'cash'; // default
      if (rawMethod.includes('bog') || rawMethod === 'bank_of_georgia') key = 'bog';
      else if (rawMethod.includes('tbc') || rawMethod === 'tpay') key = 'tbc';
      else if (rawMethod.includes('credo') || rawMethod === 'installment') key = 'credo';
      else if (rawMethod === 'card' || rawMethod === 'bank_transfer') key = 'bog'; // default card to bog
      else if (rawMethod === 'cash') key = 'cash';

      const amount = Number(o.total_price || 0);
      const source = (o.sale_source || 'website').toLowerCase();

      paymentBreakdown[key].count += 1;
      paymentBreakdown[key].total += amount;
      if (source === 'website' || source === 'online') {
        paymentBreakdown[key].onlineTotal += amount;
      } else {
        paymentBreakdown[key].showroomTotal += amount;
      }
    }

    const { data: monthlySummary } = await supabaseAdmin.from('v_monthly_summary').select('*').order('year').order('month');

    res.json({
      kpis: {
        revenue: revenue.toFixed(2),
        cogs: cogs.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        grossMarginPct,
        netProfit: (grossProfit - 0).toFixed(2), // OPEX will be subtracted when available
        totalPaidRevenue: totalPaidRevenue.toFixed(2),
        inventoryValue: inventoryValue.toFixed(2),
        vatPayable: Number(latestVatPayable).toFixed(2),
        promotionalSales: promotionalSales.toFixed(2),
      },
      paymentBreakdown,
      monthlySummary: monthlySummary || [],
    });
  } catch (err: any) {
    console.error('Accounting Dashboard Error:', err);
    res.status(500).json({ error: err.message || 'Dashboard მონაცემების მიღება ვერ მოხერხდა' });
  }
});

// ── B2: Journal Entries ──
router.get('/journal-entries', requireAccountingRead, async (req: any, res) => {
  try {
    const { period_id, status, type, page = '1', limit = '20' } = req.query;
    let query = supabaseAdmin
      .from('journal_entries')
      .select('*, journal_lines(*, accounts(code, name_ka)), fiscal_periods(name)')
      .order('entry_date', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (period_id) query = query.eq('fiscal_period_id', period_id);
    if (status) query = query.eq('status', status);
    if (type) query = query.eq('reference_type', type);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ entries: data || [], total: count || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'ჟურნალის მიღება ვერ მოხერხდა' });
  }
});

router.get('/journal-entries/:id', requireAccountingRead, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .select('*, journal_lines(*, accounts(code, name_ka, account_type)), fiscal_periods(name, status)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ entry: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/journal-entries', requireAccounting, async (req: any, res) => {
  try {
    const { entry_date, description, reference_type, reference_id, fiscal_period_id, lines } = req.body;
    if (!lines || lines.length < 2) return res.status(400).json({ error: 'მინიმუმ 2 ხაზი სავალდებულოა' });

    const { data: period } = await supabaseAdmin.from('fiscal_periods').select('status').eq('id', fiscal_period_id).single();
    if (period?.status === 'LOCKED') return res.status(400).json({ error: 'ფისკალური პერიოდი დახურულია' });

    const { data: entry, error: entryError } = await supabaseAdmin
      .from('journal_entries')
      .insert({ entry_date, description, reference_type, reference_id, fiscal_period_id, created_by: req.userId })
      .select().single();
    if (entryError) throw entryError;

    const linesInsert = lines.map((l: any) => ({ ...l, journal_entry_id: entry.id }));
    const { error: linesError } = await supabaseAdmin.from('journal_lines').insert(linesInsert);
    if (linesError) throw linesError;

    res.json({ success: true, entry_id: entry.id, entry_number: entry.entry_number });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'ჩანაწერის შექმნა ვერ მოხერხდა' });
  }
});

router.patch('/journal-entries/:id', requireAccounting, async (req: any, res) => {
  try {
    const { action } = req.body;
    if (!['post', 'reverse'].includes(action)) return res.status(400).json({ error: 'მოქმედება არასწორია' });

    if (action === 'post') {
      const { data, error } = await supabaseAdmin
        .from('journal_entries')
        .update({ status: 'POSTED', posted_by: req.userId })
        .eq('id', req.params.id)
        .select().single();
      if (error) throw error;
      res.json({ success: true, entry: data });
    } else {
      const { data: original } = await supabaseAdmin
        .from('journal_entries')
        .select('*, journal_lines(*)')
        .eq('id', req.params.id).single();
      if (!original || original.status !== 'POSTED') return res.status(400).json({ error: 'მხოლოდ posted ჩანაწ. შეიძლება გაუქმება' });

      const { data: reversal, error: rErr } = await supabaseAdmin
        .from('journal_entries')
        .insert({
          entry_date: new Date().toISOString().split('T')[0],
          description: `[გაუქმება] ${original.description}`,
          reference_type: 'ADJUSTMENT',
          reference_id: original.id,
          fiscal_period_id: original.fiscal_period_id,
          created_by: req.userId,
        }).select().single();
      if (rErr) throw rErr;

      const reversalLines = (original.journal_lines || []).map((l: any) => ({
        journal_entry_id: reversal.id,
        account_id: l.account_id,
        debit: l.credit,
        credit: l.debit,
        currency: l.currency,
        description: `[გაუქმება] ${l.description || ''}`,
      }));
      await supabaseAdmin.from('journal_lines').insert(reversalLines);

      await supabaseAdmin.from('journal_entries').update({ status: 'REVERSED', reversed_by: reversal.id }).eq('id', req.params.id);
      await supabaseAdmin.from('journal_entries').update({ status: 'POSTED', posted_by: req.userId }).eq('id', reversal.id);

      res.json({ success: true, reversal_id: reversal.id, reversal_number: reversal.entry_number });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'ოპერაცია ვერ მოხერხდა' });
  }
});

// ── B3: Invoices ──
router.get('/invoices', requireAccountingRead, async (req: any, res) => {
  try {
    const { type, status, page = '1', limit = '20' } = req.query;
    let query = supabaseAdmin
      .from('invoices')
      .select('*, invoice_items(*)')
      .order('invoice_date', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);
    if (type) query = query.eq('invoice_type', type);
    if (status) query = query.eq('payment_status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ invoices: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/invoices/:id', requireAccountingRead, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', req.params.id).single();
    if (error) throw error;
    res.json({ invoice: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── B4: Inventory ──
router.get('/inventory/levels', requireAccountingRead, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('stock_levels')
      .select('*, products(name, category)')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json({ levels: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/inventory/transactions', requireAccountingRead, async (req: any, res) => {
  try {
    const { product_id, type, page = '1', limit = '30' } = req.query;
    let query = supabaseAdmin
      .from('inventory_transactions')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);
    if (product_id) query = query.eq('product_id', product_id);
    if (type) query = query.eq('transaction_type', type);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ transactions: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/inventory/adjustment', requireAccounting, async (req: any, res) => {
  try {
    const { product_id, quantity, type, unit_cost, notes } = req.body;
    if (!product_id || !quantity || !type) return res.status(400).json({ error: 'სავალდებულო ველები აკლია' });

    const { data, error } = await supabaseAdmin
      .from('inventory_transactions')
      .insert({
        product_id, quantity, transaction_type: type,
        unit_cost, total_cost: unit_cost ? unit_cost * quantity : null,
        reference_type: 'ADJUSTMENT', notes,
        fiscal_period_id: await supabaseAdmin.rpc('get_current_fiscal_period').then((r: any) => r.data),
        created_by: req.userId,
      }).select().single();
    if (error) throw error;

    const direction = ['PURCHASE_IN','RETURN_IN','ADJUSTMENT_IN','OPENING'].includes(type) ? 1 : -1;
    const stockResult = await supabaseAdmin.rpc('update_stock_level', { p_product_id: product_id, p_delta: quantity * direction });
    if (stockResult.error) {
      console.error('[Inventory Adjustment] Stock level update failed:', stockResult.error);
      // ტრანზაქცია უკვე ჩაიწერა, მაგრამ stock_levels არ განახლდა — ლოგი საჭიროა
    }

    res.json({ success: true, transaction: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── B5: VAT ──
router.get('/vat/summary', requireAccountingRead, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('v_vat_summary').select('*');
    if (error) throw error;
    res.json({ summary: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/vat/transactions', requireAccountingRead, async (req: any, res) => {
  try {
    const { period_id, vat_type, page = '1', limit = '30' } = req.query;
    let query = supabaseAdmin
      .from('vat_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);
    if (period_id) query = query.eq('fiscal_period_id', period_id);
    if (vat_type) query = query.eq('vat_type', vat_type);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ transactions: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── B6: Employees & Payroll ──
router.get('/employees', requireAccounting, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('employees').select('*').order('full_name');
    if (error) throw error;
    res.json({ employees: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const employeeSchema = z.object({
  full_name: z.string().min(1, "სახელი სავალდებულოა"),
  personal_id: z.string().optional().nullable(),
  position: z.string().min(1, "პოზიცია სავალდებულოა"),
  department: z.enum(['SALES', 'ADMIN', 'LOGISTICS', 'IT', 'MANAGEMENT']).optional().nullable(),
  gross_salary: z.number().nonnegative("ხელფასი არ შეიძლება იყოს უარყოფითი"),
  hire_date: z.string().min(1, "დაწყების თარიღი სავალდებულოა"),
  termination_date: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  bank_account: z.string().optional().nullable(),
  email: z.string().email("არასწორი ელ. ფოსტა").optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  photo_url: z.string().url("არასწორი ბმული").optional().nullable().or(z.literal(''))
});

router.post('/employees', requireAccounting, async (req: any, res) => {
  try {
    if (req.userProfile?.role !== 'admin') return res.status(403).json({ error: 'მხოლოდ ადმინი ამატებს თანამშრომლებს' });
    const parsedBody = employeeSchema.safeParse(req.body);
    if (!parsedBody.success) {
      console.warn('[Validation Error] Employee Add:', JSON.stringify(parsedBody.error.issues));
      return res.status(400).json({ 
        error: "არასწორი მონაცემები", 
        details: parsedBody.error.issues.map(i => ({ path: i.path, message: i.message })) 
      });
    }
    const { data, error } = await supabaseAdmin.from('employees').insert(parsedBody.data).select().single();
    if (error) throw error;
    res.json({ success: true, employee: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/employees/:id', requireAccounting, async (req: any, res) => {
  try {
    if (req.userProfile?.role !== 'admin') return res.status(403).json({ error: 'მხოლოდ ადმინი არედაქტირებს თანამშრომლებს' });
    const parsedBody = employeeSchema.safeParse(req.body);
    if (!parsedBody.success) {
      console.warn('[Validation Error] Employee Update:', JSON.stringify(parsedBody.error.issues));
      return res.status(400).json({ 
        error: "არასწორი მონაცემები", 
        details: parsedBody.error.issues.map(i => ({ path: i.path, message: i.message })) 
      });
    }
    const { data, error } = await supabaseAdmin.from('employees').update(parsedBody.data).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, employee: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/employees/:id', requireAccounting, async (req: any, res) => {
  try {
    if (req.userProfile?.role !== 'admin') return res.status(403).json({ error: 'მხოლოდ ადმინი შლის თანამშრომლებს' });
    const { error } = await supabaseAdmin.from('employees').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/payroll/runs', requireAccounting, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('payroll_runs')
      .select('*, payroll_items(*, employees(full_name, position))')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });
    if (error) throw error;
    res.json({ runs: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payroll/run', requireAccounting, async (req: any, res) => {
  try {
    const { period_month, period_year, fiscal_period_id } = req.body;
    const { data: employees, error: empErr } = await supabaseAdmin
      .from('employees').select('*').eq('status', 'ACTIVE');
    if (empErr) throw empErr;
    if (!employees || employees.length === 0) return res.status(400).json({ error: 'აქტიური თანამშრომლები ვერ მოიძებნა' });

    const items = employees.map((e: any) => {
      const gross = Number(e.gross_salary);
      const tax = parseFloat((gross * 0.20).toFixed(2));
      const net = parseFloat((gross - tax).toFixed(2));
      return { employee_id: e.id, gross_salary: gross, income_tax_rate: 20, income_tax: tax, net_salary: net };
    });
    const totalGross = items.reduce((s: number, i: any) => s + i.gross_salary, 0);
    const totalTax = items.reduce((s: number, i: any) => s + i.income_tax, 0);
    const totalNet = items.reduce((s: number, i: any) => s + i.net_salary, 0);

    const { data: run, error: runErr } = await supabaseAdmin
      .from('payroll_runs')
      .insert({
        period_month, period_year, fiscal_period_id,
        total_gross: totalGross, total_tax: totalTax, total_net: totalNet,
        status: 'PROCESSED', processed_by: req.userId,
      }).select().single();
    if (runErr) throw runErr;

    const runItems = items.map((i: any) => ({ ...i, payroll_run_id: run.id }));
    await supabaseAdmin.from('payroll_items').insert(runItems);

    const SALARY_EXPENSE_CODE = '8100'; 
    const SALARIES_PAYABLE_CODE = '3300';

    const { data: payrollAccounts } = await supabaseAdmin
      .from('accounts').select('id, code')
      .in('code', [SALARY_EXPENSE_CODE, SALARIES_PAYABLE_CODE]);

    const accSalaryExpense = payrollAccounts?.find((a: { code: string; id: string }) => a.code === SALARY_EXPENSE_CODE)?.id;
    const accSalariesPayable = payrollAccounts?.find((a: { code: string; id: string }) => a.code === SALARIES_PAYABLE_CODE)?.id;

    if (!accSalaryExpense || !accSalariesPayable) {
      console.error('[Payroll] Accounts not found', { SALARY_EXPENSE_CODE, SALARIES_PAYABLE_CODE });
    } else {
      const { data: je, error: jeErr } = await supabaseAdmin
        .from('journal_entries')
        .insert({
          entry_date: new Date().toISOString().split('T')[0],
          description: `Payroll Run #${run.run_code}`,
          reference_type: 'PAYROLL',
          reference_id: run.id,
          status: 'POSTED',
          fiscal_period_id
        })
        .select('id')
        .single();

      if (jeErr || !je) {
        console.error('[Payroll] JE header failed:', jeErr);
      } else {
        const { error: linesErr } = await supabaseAdmin
          .from('journal_lines')
          .insert([
            { journal_entry_id: je.id, account_id: accSalaryExpense,   debit: totalGross, credit: 0,            description: 'Salary expense' },
            { journal_entry_id: je.id, account_id: accSalariesPayable, debit: 0,            credit: totalGross, description: 'Salaries payable' },
          ]);

        if (linesErr) {
          console.error('[Payroll] JE lines failed — rolling back header:', linesErr);
          const { error: deleteErr } = await supabaseAdmin
            .from('journal_entries').delete().eq('id', je.id);
          if (deleteErr) {
            console.error('[Payroll] CRITICAL: rollback failed — manual cleanup needed', {
              journal_entry_id: je.id,
            });
          }
        }
      }
    }

    res.json({ success: true, run_id: run.id, run_code: run.run_code, total_gross: totalGross, total_net: totalNet });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'ხელფასის გაანგარიშება ვერ მოხერხდა' });
  }
});

// ── B7: Financial Reports ──
router.get('/reports/trial-balance', requireAccountingRead, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('v_trial_balance').select('*');
    if (error) throw error;
    const totalDebit = (data || []).reduce((s: number, r: any) => s + Number(r.total_debit), 0);
    const totalCredit = (data || []).reduce((s: number, r: any) => s + Number(r.total_credit), 0);
    res.json({ accounts: data || [], totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/profit-loss', requireAccountingRead, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('v_profit_loss').select('*');
    if (error) throw error;
    const revenue = (data || []).filter((r: any) => r.account_type === 'REVENUE').reduce((s: number, r: any) => s + Number(r.amount), 0);
    const cogs = (data || []).filter((r: any) => r.account_type === 'COGS').reduce((s: number, r: any) => s + Number(r.amount), 0);
    const opex = (data || []).filter((r: any) => r.account_type === 'EXPENSE').reduce((s: number, r: any) => s + Number(r.amount), 0);
    res.json({ lines: data || [], summary: { revenue, cogs, grossProfit: revenue - cogs, opex, netProfit: revenue - cogs - opex } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/balance-sheet', requireAccountingRead, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('v_balance_sheet').select('*');
    if (error) throw error;
    const assets = (data || []).filter((r: any) => r.account_type === 'ASSET').reduce((s: number, r: any) => s + Number(r.balance), 0);
    const liabilities = (data || []).filter((r: any) => r.account_type === 'LIABILITY').reduce((s: number, r: any) => s + Number(r.balance), 0);
    const equity = (data || []).filter((r: any) => r.account_type === 'EQUITY').reduce((s: number, r: any) => s + Number(r.balance), 0);
    res.json({ lines: data || [], summary: { assets, liabilities, equity, balanced: Math.abs(assets - liabilities - equity) < 0.01 } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/monthly', requireAccountingRead, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('v_monthly_summary').select('*').order('year').order('month');
    if (error) throw error;
    res.json({ summary: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/fiscal-periods', requireAccountingRead, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('fiscal_periods').select('*').order('period_year').order('period_month');
    if (error) throw error;
    res.json({ periods: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/accounts', requireAccountingRead, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('accounts').select('*').eq('is_active', true).order('code');
    if (error) throw error;
    res.json({ accounts: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

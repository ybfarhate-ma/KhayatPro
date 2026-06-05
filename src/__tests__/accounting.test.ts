import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../store/db';
import { Customer, Order, Invoice } from '../types';

describe('Advanced Accounting & Invoicing Core System Tests', () => {
  let customer: Customer;

  beforeEach(() => {
    // Clear state before each test
    db.clearAllData();

    // Create a standard test customer
    customer = {
      id: 'customer_test_123',
      fullName: 'خالد بن الوليد',
      phone: '0612345678',
      gender: 'male',
      createdAt: new Date().toISOString(),
    };
    db.saveCustomer(customer);
  });

  describe('Outstanding Balance Calculation Flow', () => {
    it('accurately calculates pending customer dues and matches invoice amounts', () => {
      // 1. Create a new Order for 1500 MAD
      const order: any = {
        id: 'order_test_1',
        customerId: customer.id,
        attireType: 'djellaba_male',
        status: 'new',
        isArchived: false,
        totalPrice: 1500,
        amountPaid: 500, // 500 deposit
        createdAt: new Date().toISOString(),
      };
      db.saveOrder(order);

      // 2. Create and associate invoice with remaining 1000 MAD
      const invoice: Invoice = {
        id: 'invoice_test_1',
        orderId: order.id,
        customerId: customer.id,
        invoiceNumber: 'INV001',
        totalAmount: 1500,
        amountPaid: 500,
        remainingAmount: 1000,
        status: 'partial',
        isArchived: false,
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        payments: [{ id: 'p1', amount: 500, date: new Date().toISOString(), method: 'cash' }],
      };
      db.saveInvoice(invoice);

      // Verify DB contains them
      const activeInvoices = db.getInvoices();
      expect(activeInvoices.length).toBe(1);
      expect(activeInvoices[0].remainingAmount).toBe(1000);

      // Calculate Outstanding Balance like the UI
      const totalOutstanding = activeInvoices
        .filter(i => !i.isArchived)
        .reduce((sum, inv) => sum + inv.remainingAmount, 0);

      expect(totalOutstanding).toBe(1000);
    });
  });

  describe('Smart Trash & Archive Debt Impact Flow', () => {
    it('properly reduces active customer debt when an order is moved to trash and restores it on retrieval', () => {
      // 1. Set up an order with 2000 total, 800 paid, 1200 outstanding
      const order: any = {
        id: 'order_test_2',
        customerId: customer.id,
        attireType: 'takchita_female',
        status: 'new',
        isArchived: false,
        totalPrice: 2000,
        amountPaid: 800,
        createdAt: new Date().toISOString(),
      };
      db.saveOrder(order);

      const invoice: Invoice = {
        id: 'invoice_test_2',
        orderId: order.id,
        customerId: customer.id,
        invoiceNumber: 'INV002',
        totalAmount: 2000,
        amountPaid: 800,
        remainingAmount: 1200,
        status: 'partial',
        isArchived: false,
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        payments: [],
      };
      db.saveInvoice(invoice);

      // Verify active invoice and current outstanding balance is 1200
      let activeInvoices = db.getInvoices(false);
      expect(activeInvoices.length).toBe(1);
      
      let outstanding = activeInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
      expect(outstanding).toBe(1200);

      // 2. Put order and its invoice in the smart trash (archive)
      db.archiveOrderAndInvoices(order.id);

      // Active invoices should now exclude archived items
      activeInvoices = db.getInvoices(false);
      expect(activeInvoices.length).toBe(0);

      // Calculation of active outstanding balance should be 0
      outstanding = activeInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
      expect(outstanding).toBe(0);

      // Confirmed archived invoices are retained for legal audit trail matching
      const allInvoicesIncludingArchived = db.getInvoices(true);
      expect(allInvoicesIncludingArchived.length).toBe(1);
      expect(allInvoicesIncludingArchived[0].isArchived).toBe(true);

      // 3. Restore from smart trash
      db.restoreOrderAndInvoices(order.id);

      // Verified active outstanding balance is restored to 1200
      activeInvoices = db.getInvoices(false);
      expect(activeInvoices.length).toBe(1);
      outstanding = activeInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
      expect(outstanding).toBe(1200);
    });

    it('manages multiple concurrent active and archived orders correctly', () => {
      // Order A: 800 MAD remaining
      const orderA: any = {
        id: 'order_a',
        customerId: customer.id,
        attireType: 'djellaba_male',
        status: 'new',
        isArchived: false,
        totalPrice: 1000,
        amountPaid: 200,
        createdAt: new Date().toISOString(),
      };
      const invoiceA: Invoice = {
        id: 'invoice_a',
        orderId: orderA.id,
        customerId: customer.id,
        invoiceNumber: 'INV-A',
        totalAmount: 1000,
        amountPaid: 200,
        remainingAmount: 800,
        status: 'partial',
        isArchived: false,
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        payments: [],
      };

      // Order B: 400 MAD remaining
      const orderB: any = {
        id: 'order_b',
        customerId: customer.id,
        attireType: 'gandoura_male',
        status: 'new',
        isArchived: false,
        totalPrice: 500,
        amountPaid: 100,
        createdAt: new Date().toISOString(),
      };
      const invoiceB: Invoice = {
        id: 'invoice_b',
        orderId: orderB.id,
        customerId: customer.id,
        invoiceNumber: 'INV-B',
        totalAmount: 500,
        amountPaid: 100,
        remainingAmount: 400,
        status: 'partial',
        isArchived: false,
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        payments: [],
      };

      db.saveOrder(orderA);
      db.saveInvoice(invoiceA);
      db.saveOrder(orderB);
      db.saveInvoice(invoiceB);

      // Outstanding total = 800 + 400 = 1200
      let active = db.getInvoices(false);
      let total = active.reduce((sum, i) => sum + i.remainingAmount, 0);
      expect(total).toBe(1200);

      // Archive Order A
      db.archiveOrderAndInvoices(orderA.id);

      // Outstanding total should now just be Order B (400)
      active = db.getInvoices(false);
      total = active.reduce((sum, i) => sum + i.remainingAmount, 0);
      expect(total).toBe(400);

      // Restore Order A
      db.restoreOrderAndInvoices(orderA.id);
      active = db.getInvoices(false);
      total = active.reduce((sum, i) => sum + i.remainingAmount, 0);
      expect(total).toBe(1200);
    });
  });
});

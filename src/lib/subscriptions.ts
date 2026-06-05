import { Subscription, Order, Invoice } from '../types';
import { db } from '../store/db';
import { generateId } from './utils';
import { sqliteSet } from './sqlite';

const SUBSCRIPTIONS_KEY = 'khayatpro_subscriptions';

export function getSubscriptions(includeArchived = false): Subscription[] {
  const data = localStorage.getItem(SUBSCRIPTIONS_KEY);
  if (!data) return [];
  try {
    const raw: Subscription[] = JSON.parse(data);
    return includeArchived ? raw : raw.filter(s => !s.isArchived);
  } catch (e) {
    return [];
  }
}

function getRawSubscriptions(): Subscription[] {
  const data = localStorage.getItem(SUBSCRIPTIONS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveSubscription(sub: Subscription) {
  const subs = getRawSubscriptions();
  const index = subs.findIndex(s => s.id === sub.id);
  if (index !== -1) {
    subs[index] = sub;
  } else {
    subs.push(sub);
  }
  const str = JSON.stringify(subs);
  localStorage.setItem(SUBSCRIPTIONS_KEY, str);
  sqliteSet(SUBSCRIPTIONS_KEY, str).catch(e => console.error('Error writing subscriptions to SQLite native store', e));
}

export function deleteSubscription(id: string) {
  const subs = getRawSubscriptions().filter(s => s.id !== id);
  const str = JSON.stringify(subs);
  localStorage.setItem(SUBSCRIPTIONS_KEY, str);
  sqliteSet(SUBSCRIPTIONS_KEY, str).catch(e => console.error('Error deleting subscription in SQLite native store', e));
}

export function archiveSubscription(id: string) {
  const subs = getRawSubscriptions();
  const index = subs.findIndex(s => s.id === id);
  if (index !== -1) {
    subs[index].isArchived = true;
    subs[index].status = 'paused';
    const str = JSON.stringify(subs);
    localStorage.setItem(SUBSCRIPTIONS_KEY, str);
    sqliteSet(SUBSCRIPTIONS_KEY, str).catch(e => console.error('Error archiving subscription in SQLite', e));
  }
}

export function unarchiveSubscription(id: string) {
  const subs = getRawSubscriptions();
  const index = subs.findIndex(s => s.id === id);
  if (index !== -1) {
    subs[index].isArchived = false;
    subs[index].status = 'active';
    
    const str = JSON.stringify(subs);
    localStorage.setItem(SUBSCRIPTIONS_KEY, str);
    sqliteSet(SUBSCRIPTIONS_KEY, str).catch(e => console.error('Error restoring subscription in SQLite', e));
    
    // Restore all orders and invoices linked to this subscription
    const orders = db.getOrders(true);
    let updatedOrders = false;
    for (const order of orders) {
      if (order.subscriptionId === id && order.isArchived) {
        order.isArchived = false;
        updatedOrders = true;
      }
    }
    
    if (updatedOrders) {
       const rawOrdersStr = JSON.stringify(orders);
       localStorage.setItem('khayatpro_orders', rawOrdersStr);
       sqliteSet('khayatpro_orders', rawOrdersStr).catch(e => console.error(e));
       
       const invoices = db.getInvoices(true);
       for (const inv of invoices) {
         const relatedOrder = orders.find(o => o.id === inv.orderId && o.subscriptionId === id);
         if (relatedOrder && inv.isArchived) {
            inv.isArchived = false;
         }
       }
       const rawInvoicesStr = JSON.stringify(invoices);
       localStorage.setItem('khayatpro_invoices', rawInvoicesStr);
       sqliteSet('khayatpro_invoices', rawInvoicesStr).catch(e => console.error(e));
    }
  }
}

export function calculateNextDate(dateStr: string, frequency: 'weekly' | 'bi-weekly' | 'monthly'): string {
  const d = new Date(dateStr);
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (frequency === 'bi-weekly') {
    d.setDate(d.getDate() + 14);
  } else if (frequency === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

export function getNextDeliveryDate(sub: Subscription): Date {
  if (sub.nextDeliveryDate) {
    return new Date(sub.nextDeliveryDate);
  }
  
  // Backwards compat / fallback logic if nextDeliveryDate isn't set
  let targetDate = sub.lastGeneratedDate ? new Date(sub.lastGeneratedDate) : new Date(sub.startDate);
  
  if (sub.lastGeneratedDate) {
    if (sub.frequency === 'weekly') {
      targetDate.setDate(targetDate.getDate() + 7);
    } else if (sub.frequency === 'bi-weekly') {
      targetDate.setDate(targetDate.getDate() + 14);
    } else if (sub.frequency === 'monthly') {
      targetDate.setMonth(targetDate.getMonth() + 1);
    }
  }
  return targetDate;
}

// Offline background job
export function chargeSubscriptionPeriod(sub: Subscription, date: Date = new Date()): { order: Order; invoice: Invoice } {
  const ordNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderId = generateId();
  
  const targetDate = getNextDeliveryDate(sub);

  const newOrder: Order = {
    id: orderId,
    orderNumber: ordNum,
    customerId: sub.customerId,
    attireType: sub.attireType,
    description: `طلب ناتج عن اشتراك دوري (${sub.attireType})`,
    status: 'new',
    priority: 'medium',
    createdAt: date.toISOString(),
    deliveryDate: targetDate.toISOString(),
    measurements: {},
    costs: {
      fields: {
        profit: sub.amount
      },
      taxRate: 0,
      totalPriceOverride: sub.amount
    },
    totalCost: sub.amount,
    finalPrice: sub.amount,
    isSubscription: true,
    subscriptionId: sub.id
  };

  const newInvoice: Invoice = {
    id: generateId(),
    invoiceNumber: `INV-${ordNum.split('-')[1]}`,
    orderId: orderId,
    customerId: sub.customerId,
    createdAt: date.toISOString(),
    totalAmount: sub.amount,
    amountPaid: 0,
    remainingAmount: sub.amount,
    status: 'unpaid',
    payments: []
  };

  db.saveOrder(newOrder);
  db.saveInvoice(newInvoice);

  sub.lastGeneratedDate = date.toISOString();
  // Compute the next delivery date from this target
  sub.nextDeliveryDate = calculateNextDate(targetDate.toISOString(), sub.frequency);
  saveSubscription(sub);

  return { order: newOrder, invoice: newInvoice };
}

// Offline background job
export function processRecurringSubscriptions() {
  const subs = getSubscriptions();
  let updated = false;

  const now = new Date();

  subs.forEach(sub => {
    if (sub.status !== 'active') return;

    if (sub.endDate && now > new Date(sub.endDate)) {
      sub.status = 'paused';
      updated = true;
      return;
    }

    if (now < new Date(sub.startDate)) {
      return; // Not started yet
    }

    let targetDate = getNextDeliveryDate(sub);

    if (now >= targetDate && sub.isAutoCharge === true) {
      try {
        chargeSubscriptionPeriod(sub, now);
        updated = true;
      } catch (e) {
        console.error("Failed to auto-generate subscription order", e);
      }
    }
  });

  if (updated) {
    // Already saved in chargeSubscriptionPeriod, but let's sync all subs changes
    const subsToSave = getSubscriptions();
    subs.forEach(item => {
      const idx = subsToSave.findIndex(x => x.id === item.id);
      if (idx !== -1) {
        subsToSave[idx] = item;
      }
    });
    const str = JSON.stringify(subsToSave);
    localStorage.setItem(SUBSCRIPTIONS_KEY, str);
    sqliteSet(SUBSCRIPTIONS_KEY, str).catch(e => console.error('Error background saving updated subscriptions to SQLite native store', e));
  }
}

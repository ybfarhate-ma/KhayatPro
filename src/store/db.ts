import { Customer, Order, Invoice, CustomerMeasurementProfile, AttireTemplate, MEASUREMENT_FIELDS } from '../types';
import { sqliteSet, sqliteGetAllKeys, sqliteGet, initSQLite } from '../lib/sqlite';

const STORAGE_KEYS = {
  CUSTOMERS: 'khayatpro_customers',
  ORDERS: 'khayatpro_orders',
  INVOICES: 'khayatpro_invoices',
  MEASUREMENT_PROFILES: 'khayatpro_measurement_profiles',
  ATTIRE_TEMPLATES: 'khayatpro_attire_templates',
};

// Default templates provided on initial load
const defaultTemplates: AttireTemplate[] = [
  {
    id: 'djellaba_female',
    name: 'جلابة نسائية',
    gender: 'female_adult',
    style: 'traditional',
    lowerBodyStyle: 'robe',
    points: [
      { id: 'length', label: 'الطول الكلي', x: 23, y: 88 },
      { id: 'shoulders', label: 'عرض الكتاف', x: 23, y: 22 },
      { id: 'chest', label: 'دورة الصدر', x: 24, y: 31 },
      { id: 'waist', label: 'دورة الحزام', x: 24, y: 44 },
      { id: 'hips', label: 'دورة الحوض', x: 24, y: 56 },
      { id: 'sleeveLength', label: 'طول الكم', x: 10, y: 45 },
      { id: 'sleeveOpening', label: 'فم الكم', x: 8, y: 55 },
      { id: 'armhole', label: 'التركيز', x: 31, y: 26 },
      { id: 'neck', label: 'دورة العنق', x: 23, y: 17 },
      { id: 'bottom_width', label: 'عرض الجليل', x: 23, y: 92 },
    ],
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'kaftan_female',
    name: 'قفطان مخزني',
    gender: 'female_adult',
    style: 'traditional',
    lowerBodyStyle: 'robe',
    points: [
      { id: 'length', label: 'الطول الكلي', x: 23, y: 88 },
      { id: 'shoulders', label: 'عرض الكتاف', x: 23, y: 22 },
      { id: 'chest', label: 'دورة الصدر', x: 24, y: 31 },
      { id: 'waist', label: 'دورة الحزام', x: 24, y: 44 },
      { id: 'hips', label: 'دورة الحوض', x: 24, y: 56 },
      { id: 'sleeveLength', label: 'طول الكم', x: 10, y: 45 },
      { id: 'sleeveOpening', label: 'فم الكم', x: 8, y: 55 },
      { id: 'armhole', label: 'التركيز', x: 31, y: 26 },
      { id: 'bottom_width', label: 'عرض الجليل', x: 23, y: 92 },
    ],
    createdAt: '2026-01-01T00:00:01Z'
  },
  {
    id: 'djellaba_male',
    name: 'جلابة رجالية',
    gender: 'male_adult',
    style: 'traditional',
    lowerBodyStyle: 'robe',
    points: [
      { id: 'length', label: 'الطول الكلي', x: 74, y: 88 },
      { id: 'shoulders', label: 'عرض الكتاف', x: 74, y: 22 },
      { id: 'chest', label: 'دورة الصدر', x: 75, y: 31 },
      { id: 'sleeveLength', label: 'طول الكم', x: 61, y: 45 },
      { id: 'armhole', label: 'التركيز', x: 82, y: 26 },
      { id: 'neck', label: 'دورة العنق', x: 74, y: 17 },
    ],
    createdAt: '2026-01-01T00:00:02Z'
  },
  {
    id: 'jabador_male',
    name: 'جابادور مغربي (رجالي)',
    gender: 'male_adult',
    style: 'traditional',
    lowerBodyStyle: 'pants',
    points: [
      { id: 'length', label: 'طول الجابادور', x: 74, y: 60 },
      { id: 'shoulders', label: 'عرض الكتاف', x: 74, y: 22 },
      { id: 'chest', label: 'دورة الصدر', x: 75, y: 31 },
      { id: 'sleeveLength', label: 'طول الكم', x: 61, y: 45 },
      { id: 'trousers_length', label: 'طول السروال', x: 75, y: 85 },
      { id: 'trousers_waist', label: 'حزام السروال', x: 75, y: 65 },
    ],
    createdAt: '2026-01-01T00:00:03Z'
  },
  {
    id: 'takchita_female',
    name: 'تكشيطة (قطعتين)',
    gender: 'female_adult',
    style: 'traditional',
    lowerBodyStyle: 'robe',
    points: [
      { id: 'length', label: 'طول التحتية', x: 23, y: 88 },
      { id: 'length_over', label: 'طول الدفينة', x: 23, y: 93 },
      { id: 'shoulders', label: 'عرض الكتاف', x: 23, y: 22 },
      { id: 'chest', label: 'دورة الصدر', x: 24, y: 31 },
      { id: 'waist', label: 'دورة الحزام', x: 24, y: 44 },
      { id: 'hips', label: 'دورة الحوض', x: 24, y: 56 },
      { id: 'sleeveLength', label: 'طول الكم', x: 10, y: 45 },
      { id: 'armhole', label: 'التركيز', x: 31, y: 26 },
    ],
    createdAt: '2026-01-01T00:00:04Z'
  },
  {
    id: 'gandoura_male',
    name: 'قندورة رجالية',
    gender: 'male_adult',
    style: 'traditional',
    lowerBodyStyle: 'robe',
    points: [
      { id: 'length', label: 'الطول الكلي', x: 74, y: 85 },
      { id: 'shoulders', label: 'عرض الكتاف', x: 74, y: 22 },
      { id: 'chest', label: 'دورة الصدر', x: 75, y: 31 },
      { id: 'neck', label: 'دورة العنق', x: 74, y: 17 },
    ],
    createdAt: '2026-01-01T00:00:05Z'
  },
  {
    id: 'gandoura_female',
    name: 'قندورة نسائية',
    gender: 'female_adult',
    style: 'traditional',
    lowerBodyStyle: 'robe',
    points: [
      { id: 'length', label: 'الطول الكلي', x: 23, y: 85 },
      { id: 'shoulders', label: 'عرض الكتاف', x: 23, y: 22 },
      { id: 'chest', label: 'دورة الصدر', x: 24, y: 31 },
      { id: 'hips', label: 'دورة الحوض', x: 24, y: 56 },
    ],
    createdAt: '2026-01-01T00:00:06Z'
  },
  {
    id: 'selham_male',
    name: 'سلهام مغربي',
    gender: 'male_adult',
    style: 'traditional',
    lowerBodyStyle: 'robe',
    points: [
      { id: 'length', label: 'طول السلهام', x: 74, y: 90 },
      { id: 'shoulders', label: 'عرض الكتاف', x: 74, y: 22 },
    ],
    createdAt: '2026-01-01T00:00:07Z'
  },
  {
    id: 'faracha_female',
    name: 'فراشة (نسائية)',
    gender: 'female_adult',
    style: 'traditional',
    lowerBodyStyle: 'robe',
    points: [
      { id: 'length', label: 'الطول الكلي', x: 23, y: 90 },
      { id: 'chest', label: 'دورة الصدر', x: 24, y: 31 },
      { id: 'waist', label: 'دورة الحزام', x: 24, y: 44 },
    ],
    createdAt: '2026-01-01T00:00:08Z'
  },
  {
    id: 'child_djellaba',
    name: 'جلابة أطفال',
    gender: 'female_child',
    style: 'traditional',
    lowerBodyStyle: 'robe',
    points: [
      { id: 'length', label: 'الطول الكلي', x: 23, y: 80 },
      { id: 'shoulders', label: 'عرض الكتاف', x: 23, y: 25 },
      { id: 'sleeveLength', label: 'طول الكم', x: 12, y: 45 },
    ],
    createdAt: '2026-01-01T00:00:09Z'
  }
];

export async function initializeDatabaseCache() {
  try {
    await initSQLite();
    
    // SQLite operates as the ground truth. LocalStorage is strictly a synchronous memory cache.
    const sqliteKeys = await sqliteGetAllKeys();
    const memoryKeys = Object.keys(localStorage).filter(k => k.startsWith('khayatpro_'));
    
    // Migration: if SQLite is empty but we have local memory data, migrate to SQLite (First boot up)
    if (sqliteKeys.length === 0 && memoryKeys.length > 0) {
      console.info('Migrating existing client data to SQLite Native Engine...');
      for (const key of memoryKeys) {
        const val = localStorage.getItem(key);
        if (val) await sqliteSet(key, val);
      }
    } else if (sqliteKeys.length > 0) {
       console.info('Loading SQLite Native Database into synchronous memory cache...');
       for (const key of sqliteKeys) {
         const val = await sqliteGet(key);
         if (val) localStorage.setItem(key, val);
       }
    }
  } catch (err) {
    console.error('Failed to initialize SQLite Database Engine', err);
  }
}

// Simple pseudo-ORM using Native SQLite behind the scenes for demo/offline-first MVP
class LocalDB {
  private get<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading ${key} from memory cache`, e);
      return [];
    }
  }

  private set<T>(key: string, data: T[]): void {
    try {
      const strData = JSON.stringify(data);
      // Synchronous update for instant React render
      localStorage.setItem(key, strData);
      // Asynchronous non-blocking background save to SQLite (WAL mode handles concurrency)
      sqliteSet(key, strData).catch(e => console.error(`Error writing ${key} to SQLite DB`, e));
    } catch (e) {
      console.error(`Error writing ${key}`, e);
    }
  }

  // --- Customers ---
  getCustomers(): Customer[] {
    return this.get<Customer>(STORAGE_KEYS.CUSTOMERS);
  }
  
  saveCustomer(customer: Customer) {
    const customers = this.getCustomers();
    const existing = customers.findIndex(c => c.id === customer.id);
    if (existing !== -1) customers[existing] = customer;
    else customers.push(customer);
    this.set(STORAGE_KEYS.CUSTOMERS, customers);
  }

  deleteCustomer(customerId: string) {
    const customers = this.get<Customer>(STORAGE_KEYS.CUSTOMERS).filter(c => c.id !== customerId);
    this.set(STORAGE_KEYS.CUSTOMERS, customers);
    
    // Cleanup related data
    const profiles = this.get<CustomerMeasurementProfile>(STORAGE_KEYS.MEASUREMENT_PROFILES).filter(p => p.customerId !== customerId);
    this.set(STORAGE_KEYS.MEASUREMENT_PROFILES, profiles);
    
    const orders = this.get<Order>(STORAGE_KEYS.ORDERS).filter(o => o.customerId !== customerId);
    this.set(STORAGE_KEYS.ORDERS, orders);
    
    const invoices = this.get<Invoice>(STORAGE_KEYS.INVOICES).filter(i => i.customerId !== customerId);
    this.set(STORAGE_KEYS.INVOICES, invoices);
  }

  // --- Orders ---
  getOrders(includeArchived = false): Order[] {
    const raw = this.get<Order>(STORAGE_KEYS.ORDERS);
    return includeArchived ? raw : raw.filter(o => !o.isArchived);
  }

  saveOrder(order: Order) {
    const orders = this.get<Order>(STORAGE_KEYS.ORDERS);
    const existing = orders.findIndex(o => o.id === order.id);
    if (existing !== -1) orders[existing] = order;
    else orders.push(order);
    this.set(STORAGE_KEYS.ORDERS, orders);
  }

  deleteOrder(orderId: string) {
    const orders = this.get<Order>(STORAGE_KEYS.ORDERS).filter(o => o.id !== orderId);
    this.set(STORAGE_KEYS.ORDERS, orders);
  }

  restoreOrderAndInvoices(orderId: string) {
    const orders = this.getOrders(true);
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      orders[orderIndex].isArchived = false;
      this.set(STORAGE_KEYS.ORDERS, orders);
      
      const invoices = this.getInvoices(true);
      for (const inv of invoices) {
        if (inv.orderId === orderId) {
          inv.isArchived = false;
        }
      }
      this.set(STORAGE_KEYS.INVOICES, invoices);

      const subId = orders[orderIndex].subscriptionId;
      if (subId) {
        try {
           const subsData = localStorage.getItem('khayatpro_subscriptions');
           if (subsData) {
             const subs = JSON.parse(subsData);
             const subIndex = subs.findIndex((s: any) => s.id === subId);
             if (subIndex !== -1) {
                subs[subIndex].isArchived = false;
                subs[subIndex].status = 'active';
                const str = JSON.stringify(subs);
                localStorage.setItem('khayatpro_subscriptions', str);
                sqliteSet('khayatpro_subscriptions', str).catch(e => console.error(e));
             }
           }
        } catch(e) {}
      }
    }
  }

  archiveOrderAndInvoices(orderId: string) {
    const orders = this.get<Order>(STORAGE_KEYS.ORDERS);
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      // Archive the order
      orders[orderIndex].isArchived = true;
      this.set(STORAGE_KEYS.ORDERS, orders);
      
      // Archive invoices too
      const invoices = this.get<Invoice>(STORAGE_KEYS.INVOICES);
      for (const inv of invoices) {
        if (inv.orderId === orderId) {
          inv.isArchived = true;
        }
      }
      this.set(STORAGE_KEYS.INVOICES, invoices);

      // Subscriptions
      const subId = orders[orderIndex].subscriptionId;
      if (subId) {
        try {
           const subsData = localStorage.getItem('khayatpro_subscriptions');
           if (subsData) {
             const subs = JSON.parse(subsData);
             const subIndex = subs.findIndex((s: any) => s.id === subId);
             if (subIndex !== -1) {
                subs[subIndex].isArchived = true;
                subs[subIndex].status = 'paused';
                const str = JSON.stringify(subs);
                localStorage.setItem('khayatpro_subscriptions', str);
                sqliteSet('khayatpro_subscriptions', str).catch(e => console.error(e));
             }
           }
        } catch(e) {}
      }
    }
  }

  // --- Measurement Profiles ---
  getMeasurementProfiles(customerId: string): CustomerMeasurementProfile[] {
    return this.get<CustomerMeasurementProfile>(STORAGE_KEYS.MEASUREMENT_PROFILES)
      .filter(p => p.customerId === customerId);
  }

  saveMeasurementProfile(profile: CustomerMeasurementProfile) {
    const profiles = this.get<CustomerMeasurementProfile>(STORAGE_KEYS.MEASUREMENT_PROFILES);
    const existing = profiles.findIndex(p => p.id === profile.id);
    if (existing !== -1) profiles[existing] = profile;
    else profiles.push(profile);
    this.set(STORAGE_KEYS.MEASUREMENT_PROFILES, profiles);
  }

  // --- Invoices ---
  getInvoices(includeArchived = false): Invoice[] {
    const raw = this.get<Invoice>(STORAGE_KEYS.INVOICES);
    return includeArchived ? raw : raw.filter(i => !i.isArchived);
  }

  saveInvoice(invoice: Invoice) {
    const invoices = this.get<Invoice>(STORAGE_KEYS.INVOICES);
    const existing = invoices.findIndex(i => i.id === invoice.id);
    if (existing !== -1) invoices[existing] = invoice;
    else invoices.push(invoice);
    this.set(STORAGE_KEYS.INVOICES, invoices);
  }

  deleteInvoice(invoiceId: string) {
    const invoices = this.get<Invoice>(STORAGE_KEYS.INVOICES).filter(i => i.id !== invoiceId);
    this.set(STORAGE_KEYS.INVOICES, invoices);
  }

  // --- Attire Templates ---
  getAttireTemplates(): AttireTemplate[] {
    const storedTemplates = this.get<AttireTemplate>(STORAGE_KEYS.ATTIRE_TEMPLATES);
    
    // Merge defaults with stored templates, giving priority to stored ones if IDs match
    // but ensure all defaults are present at least once
    const merged = [...storedTemplates];
    
    defaultTemplates.forEach(def => {
      if (!merged.some(t => t.id === def.id)) {
        merged.push(def);
      }
    });

    return merged;
  }

  saveAttireTemplate(template: AttireTemplate) {
    const templates = this.getAttireTemplates();
    const existing = templates.findIndex(t => t.id === template.id);
    if (existing !== -1) templates[existing] = template;
    else templates.push(template);
    this.set(STORAGE_KEYS.ATTIRE_TEMPLATES, templates);
  }

  deleteAttireTemplate(templateId: string) {
    const templates = this.get<AttireTemplate>(STORAGE_KEYS.ATTIRE_TEMPLATES).filter(t => t.id !== templateId);
    this.set(STORAGE_KEYS.ATTIRE_TEMPLATES, templates);
  }

  // --- Backup & Restore Utilities ---
  /**
   * Generates a full data dump of all khayatpro_ keys in localStorage
   */
  exportDataDump(): string {
    const dump: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('khayatpro_')) {
        dump[key] = localStorage.getItem(key) || '';
      }
    }
    return JSON.stringify({
      data: dump,
      metadata: {
        version: '3.0.0', // Architectural upgrade to local-first + drive backup
        timestamp: new Date().toISOString(),
        deviceId: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device'
      }
    });
  }

  /**
   * Restores data from a JSON dump string
   */
  importDataDump(dumpStr: string): boolean {
    try {
      const parsed = JSON.parse(dumpStr);
      if (!parsed || !parsed.data) return false;

      // Filter and restore keys
      Object.keys(parsed.data).forEach(key => {
        if (key.startsWith('khayatpro_')) {
          localStorage.setItem(key, parsed.data[key]);
        }
      });
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  /**
   * Clears all local data (Atomic wipe)
   */
  clearAllData() {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('khayatpro_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

export const db = new LocalDB();

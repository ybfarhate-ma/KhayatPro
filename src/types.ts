export type AttireType = 'جلابة' | 'قفطان' | 'تكشيطة' | 'جابادور' | 'كندورة' | 'سلهام' | 'بدلة' | 'قميص' | 'عباية' | 'بشت' | 'ثوب سعودي' | 'دراعة' | 'أخرى';
export type OrderStatus = 'new' | 'in_progress' | 'ready' | 'delivered' | 'canceled';
export type PriorityLevel = 'low' | 'medium' | 'high';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'other';

export interface MeasurementPoint {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface AttireTemplate {
  id: string;
  name: string;
  gender: 'male_adult' | 'female_adult' | 'male_teen' | 'female_teen' | 'male_child' | 'female_child' | 'infant';
  style: 'traditional' | 'modern';
  lowerBodyStyle: 'pants' | 'robe' | 'skirt';
  points: MeasurementPoint[];
  fixedMeasurements?: Record<string, string | number>;
  createdAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  address?: string;
  gender: 'male' | 'female';
  createdAt: string;
  notes?: string;
  imageUrl?: string;
}

export interface MeasurementValues {
  [key: string]: number | string | undefined;
}

// Stores previously used measurements for a specific client and attire type
export interface CustomerMeasurementProfile {
  id: string;
  customerId: string;
  attireType: AttireType | 'default_male' | 'default_female';
  measurements: MeasurementValues;
  updatedAt: string;
}

export interface CostFieldSetting {
  id: string;
  label: string;
  isEnabled: boolean;
  isTaxable: boolean;
}

export interface CostDetails {
  fields: Record<string, number>; // Dynamic fields defined in settings
  taxRate: number; // percentage
  totalPriceOverride?: number; // If user wants to manually set the price
}

export interface Order {
  id: string;
  orderNumber: string; // Sequential recognizable ID
  customerId: string;
  attireType: AttireType | string;
  description: string;
  status: OrderStatus;
  priority: PriorityLevel;
  createdAt: string;
  deliveryDate: string;
  notes?: string;
  materialsPurchased?: boolean;
  
  // Specific measurements for this order (snapshot)
  measurements: MeasurementValues;
  
  // Financials
  costs: CostDetails;
  totalCost: number; // Sum of expenses (fabric, labor, etc) inside calculations
  finalPrice: number; // Price charged to the client
  
  referenceImages?: string[];
  resultImages?: string[];
  
  // Subscription flags
  isSubscription?: boolean;
  subscriptionId?: string;
  
  isArchived?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customerId: string;
  createdAt: string;
  dueDate?: string;
  
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  
  status: PaymentStatus;
  payments: PaymentRecord[];

  isArchived?: boolean;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: PaymentMethod;
}

export interface CustomTemplate {
  id: string;
  name: string;
  body: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  customerName: string; // for easier display
  attireType: string;
  amount: number;
  itemPrice?: number;
  quantity?: number;
  frequency: 'weekly' | 'bi-weekly' | 'monthly';
  startDate: string; // ISO date
  endDate?: string; // Optional end date
  nextDeliveryDate?: string; // ISO date
  lastGeneratedDate: string | null; // ISO date
  status: 'active' | 'paused';
  isAutoCharge?: boolean;
  isArchived?: boolean;
}

export interface BrandingVisibility {
  showShopName: boolean;
  showTailorName: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
  showLegalInfo: boolean;
  showLogo: boolean;
}

export const DEFAULT_BRANDING_VISIBILITY: BrandingVisibility = {
  showShopName: true,
  showTailorName: true,
  showPhone: true,
  showEmail: true,
  showAddress: true,
  showLegalInfo: true,
  showLogo: true,
};

// Pre-defined measurement fields based on typical Moroccan attire
export const DEFAULT_COST_FIELDS: CostFieldSetting[] = [
  { id: 'fabric', label: 'ثمن الثوب', isEnabled: true, isTaxable: true },
  { id: 'labor', label: 'كلفة الخياطة (اليد)', isEnabled: true, isTaxable: true },
  { id: 'accessories', label: 'اللوازم (العقاد، السفيفة...)', isEnabled: true, isTaxable: true },
  { id: 'embroidery', label: 'الطرز / الرندة', isEnabled: true, isTaxable: true },
  { id: 'profit', label: 'هامش الربح', isEnabled: true, isTaxable: true },
  { id: 'other', label: 'مصاريف أخرى', isEnabled: true, isTaxable: true },
];
export const MEASUREMENT_FIELDS = [
  { id: 'length', label: 'الطول الكلي' },
  { id: 'shoulders', label: 'عرض الكتاف' },
  { id: 'shoulders_to_waist', label: 'طول ربع الصدر (الهبطة)' },
  { id: 'chest', label: 'دورة الصدر' },
  { id: 'waist', label: 'دورة الحزام' },
  { id: 'hips', label: 'دورة الحوض (الباسان)' },
  { id: 'sleeveLength', label: 'طول الكم' },
  { id: 'sleeveOpening', label: 'فم الكم' },
  { id: 'armhole', label: 'التركيز' },
  { id: 'bicep', label: 'دورة الذراع (الكم)' },
  { id: 'neck', label: 'دورة العنق' },
  { id: 'bottom_width', label: 'عرض الجليل (الأسفل)' },
  { id: 'trousers_length', label: 'طول السروال' },
  { id: 'trousers_waist', label: 'حزام السروال' },
  { id: 'trousers_bottom', label: 'راس السروال (التحت)' },
];

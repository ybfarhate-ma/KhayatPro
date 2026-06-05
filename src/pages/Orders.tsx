import { useState, useEffect } from 'react';
import { db } from '../store/db';
import { Order, Customer } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Scissors, ChevronLeft, Search, Edit3, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { clsx } from 'clsx';
import { useUI } from '../store/ui';
import { getSubscriptions, saveSubscription } from '../lib/subscriptions';

export default function Orders() {
  const navigate = useNavigate();
  const { showToast, confirm } = useUI();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual');

  useEffect(() => {
    setOrders(db.getOrders().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setCustomers(db.getCustomers());
  }, []);

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.fullName || 'عميل محذوف';

  const handleDeleteOrder = async (o: Order) => {
    const freshOrder = db.getOrders(true).find(ord => ord.id === o.id);
    if (!freshOrder) return;

    const invoice = db.getInvoices(true).find(i => i.orderId === freshOrder.id);
    const hasPayments = invoice && invoice.amountPaid > 0;
    
    let message = 'هل أنت متأكد من رغبتك في أرشفة وإلغاء هذا الطلب؟ سيتم خصم مبلغه المتبقي من ديون العميل والحسابات.';
    if (hasPayments) {
      message += `\n\nتنبيه: هذا الطلب يحتوي على دفعات مسبقة مستلمة بقيمة ${invoice.amountPaid}. أرشفته ستخفي هذه الدفعة من السجلات، يرجى الاستمرار إذا كنت متأكداً فقط.`;
    }
    if (freshOrder.isSubscription && freshOrder.subscriptionId) {
      message += '\n\nملاحظة: هذا الطلب ناتج عن اشتراك دوري. أرشفتك للطلب لن توقف الاشتراك تلقائياً (يمكنك إيقافه من صفحة الزبون).';
    }

    const confirmed = await confirm({
      title: 'أرشفة الطلب وإلغاء الدين',
      message: message,
      confirmText: 'نعم، أرشفة وإلغاء الدين',
      cancelText: 'إلغاء',
      isDestructive: true
    });
    
    if (confirmed) {
       db.archiveOrderAndInvoices(freshOrder.id);
       setOrders(db.getOrders().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
       showToast({ message: 'تم أرشفة الطلب وتحديث السجل المالي' });
    }
  };

  const individualOrders = orders.filter(o => !o.isSubscription);
  const bulkOrders = orders.filter(o => o.isSubscription);

  const displayedOrdersCount = activeTab === 'individual' ? individualOrders.length : bulkOrders.length;

  const filteredOrders = orders.filter(o => {
    const isSub = !!o.isSubscription;
    if (activeTab === 'individual' && isSub) return false;
    if (activeTab === 'bulk' && !isSub) return false;

    const matchesSearch = getCustomerName(o.customerId).toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filter === 'all') return true;
    if (filter === 'active') return ['new', 'in_progress'].includes(o.status);
    if (filter === 'ready') return o.status === 'ready';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'new': return <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold">جديد</span>;
      case 'in_progress': return <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-[10px] font-bold">يفصل حالياً</span>;
      case 'ready': return <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-[10px] font-bold">جاهز للتسليم</span>;
      case 'delivered': return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold">سُلِّم</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 font-sans">
        <div>
          <h2 className="text-xl font-bold text-primary-800">إدارة الطلبات</h2>
        </div>
        <Link to="/orders/new" className="bg-primary-600 text-white p-3 rounded-xl hover:bg-primary-700 transition">
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      {/* Tabs Selection Container */}
      <div className="bg-gray-100 p-1.5 rounded-2xl flex border border-gray-200/60 font-sans" dir="rtl">
        <button 
          onClick={() => { setActiveTab('individual'); setFilter('all'); }}
          className={clsx(
            "flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer",
            activeTab === 'individual' 
              ? "bg-primary-800 text-white shadow-sm" 
              : "text-gray-500 hover:text-gray-800"
          )}
        >
          👤 طلبات فردية ({individualOrders.length})
        </button>
        <button 
          onClick={() => { setActiveTab('bulk'); setFilter('all'); }}
          className={clsx(
            "flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer",
            activeTab === 'bulk' 
              ? "bg-primary-800 text-white shadow-sm" 
              : "text-gray-500 hover:text-gray-800"
          )}
        >
          📦 طلبات جملة (اشتراكات) ({bulkOrders.length})
        </button>
      </div>

      <div className="relative font-sans">
        <input 
          type="text" 
          placeholder="ابحث باسم العميل..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl px-12 py-3 outline-none focus:border-primary-500 shadow-sm text-right"
        />
        <Search className="w-5 h-5 text-gray-400 absolute right-4 top-3.5" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide font-sans">
        <button onClick={() => setFilter('all')} className={clsx("px-4 py-2 rounded-xl text-sm whitespace-nowrap transition", filter === 'all' ? "bg-primary-800 text-white" : "bg-white border border-gray-200")}>الكل ({displayedOrdersCount})</button>
        <button onClick={() => setFilter('active')} className={clsx("px-4 py-2 rounded-xl text-sm whitespace-nowrap transition", filter === 'active' ? "bg-orange-600 text-white" : "bg-white border border-gray-200")}>قيد العمل</button>
        <button onClick={() => setFilter('ready')} className={clsx("px-4 py-2 rounded-xl text-sm whitespace-nowrap transition", filter === 'ready' ? "bg-green-600 text-white" : "bg-white border border-gray-200")}>تنتظر التسليم</button>
      </div>

      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center p-8 text-gray-400 bg-white rounded-2xl border border-gray-100">
            لا توجد طلبات هنا
          </div>
        ) : (
          filteredOrders.map(o => (
            <div key={o.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-primary-300 transition">
              <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => navigate(`/orders/${o.id}`)}>
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-primary-500 border border-gray-100 flex-shrink-0">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-800 flex items-center gap-2">
                    {getCustomerName(o.customerId)}
                  </h3>
                  <div className="flex items-center text-xs text-gray-500 mt-1 gap-2">
                    <span>{db.getAttireTemplates().find(t => t.id === o.attireType)?.name || o.attireType}</span>
                    <span>•</span>
                    <span dir="ltr" className="font-mono font-medium text-primary-800">{formatCurrency(o.finalPrice)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(o.status)}
                  <span className="text-[10px] text-gray-400">{formatDate(o.createdAt)}</span>
                </div>
                <div className="flex gap-1 ml-2">
                   <button onClick={() => navigate(`/orders/${o.id}/edit`)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg">
                     <Edit3 className="w-4 h-4" />
                   </button>
                   <button onClick={() => handleDeleteOrder(o)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

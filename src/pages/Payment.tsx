// PaymentsTab.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DollarSign, TrendingUp, TrendingDown, Calendar, Download,
  Filter, Eye, CreditCard, Wallet, Banknote, PieChart,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle, XCircle,
  Receipt, Users, Building2, IndianRupee, Activity, BarChart4,
  XCircle as CloseIcon, Loader2, Search, ChevronLeft, ChevronRight,
  FileText, Printer
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { BASE_URL } from "@/Service/api";

// Types
interface PaymentData {
  id: number;
  userId: number;
  orderId: string;
  paymentId: string;
  signature: string;
  amount: number;
  status: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  organizationName?: string;
  userEmail?: string;
  userName?: string;
  organization?: {
    organizationName: string;
  };
}

interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  averageTransactionValue: number;
  growthRate: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  transactions: number;
}

const PaymentsTab = () => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    averageTransactionValue: 0,
    growthRate: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    // Filter payments based on search term
    const filtered = payments.filter(payment => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (payment.paymentId?.toLowerCase().includes(searchLower) || false) ||
        (payment.orderId?.toLowerCase().includes(searchLower) || false) ||
        (payment.organizationName?.toLowerCase().includes(searchLower) || false) ||
        (payment.userName?.toLowerCase().includes(searchLower) || false) ||
        (payment.userEmail?.toLowerCase().includes(searchLower) || false) ||
        (payment.status?.toLowerCase().includes(searchLower) || false) ||
        (payment.amount?.toString().includes(searchLower) || false)
      );
    });
    setFilteredPayments(filtered);
    setCurrentPage(1);
  }, [searchTerm, payments]);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPayments = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");

    const cleanToken = token?.startsWith("Bearer ") ? token : `Bearer ${token}`;

    try {
      const response = await fetch(`${BASE_URL}/api/payment/get-all`, {
        method: "GET",
        headers: {
          "Authorization": cleanToken,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const paymentsData = data.data || [];
        setPayments(paymentsData);
        setFilteredPayments(paymentsData);
        calculateStats(paymentsData);
        prepareMonthlyData(paymentsData);
      } else {
        console.error("Failed to fetch payments:", data.message);
        showToast("error", data.message || "Failed to fetch payments");
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
      showToast("error", "Network error while fetching payments");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData: PaymentData[]) => {
    const successful = paymentsData.filter(p => p.status === "SUCCESS");
    const total = successful.reduce((sum, p) => sum + (p.amount || 0), 0);
    const avg = successful.length > 0 ? total / successful.length : 0;

    const now = new Date();
    const last30Start = new Date(now);
    last30Start.setDate(now.getDate() - 30);
    const previous30Start = new Date(now);
    previous30Start.setDate(now.getDate() - 60);

    const last30Revenue = successful
      .filter(p => new Date(p.createdAt) >= last30Start)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const previous30Revenue = successful
      .filter(p => new Date(p.createdAt) >= previous30Start && new Date(p.createdAt) < last30Start)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const growthRate = previous30Revenue > 0
      ? ((last30Revenue - previous30Revenue) / previous30Revenue) * 100
      : 0;

    setStats({
      totalRevenue: total,
      totalTransactions: paymentsData.length,
      successfulPayments: successful.length,
      pendingPayments: paymentsData.filter(p => p.status === "PENDING").length,
      failedPayments: paymentsData.filter(p => p.status === "FAILED").length,
      averageTransactionValue: avg,
      growthRate: growthRate
    });
  };

  const prepareMonthlyData = (paymentsData: PaymentData[]) => {
    const monthlyMap = new Map();

    paymentsData.forEach(payment => {
      const date = new Date(payment.createdAt);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;

      if (!monthlyMap.has(monthYear)) {
        monthlyMap.set(monthYear, { revenue: 0, transactions: 0 });
      }

      const data = monthlyMap.get(monthYear);
      if (payment.status === "SUCCESS") {
        data.revenue += payment.amount || 0;
      }
      data.transactions += 1;
      monthlyMap.set(monthYear, data);
    });

    const monthlyArray = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      transactions: data.transactions
    }));

    setMonthlyData(monthlyArray);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SUCCESS":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0"><CheckCircle className="h-3 w-3 mr-1" /> Success</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status || 'UNKNOWN'}</Badge>;
    }
  };

  const formatAmount = (amount: number) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTimeOnly = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const downloadReceipt = (payment: PaymentData) => {
    try {
      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Receipt - ${payment.paymentId}</title>
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f5f5f5;
            }
            .receipt {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #10b981, #059669);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .header p {
              margin: 5px 0 0;
              opacity: 0.9;
            }
            .content {
              padding: 30px;
            }
            .details {
              margin-bottom: 30px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .label {
              font-weight: 600;
              color: #4b5563;
            }
            .value {
              color: #1f2937;
            }
            .amount {
              font-size: 24px;
              font-weight: bold;
              color: #10b981;
              margin-top: 20px;
              text-align: center;
              padding: 20px;
              background: #f0fdf4;
              border-radius: 12px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              background: #f9fafb;
              font-size: 12px;
              color: #6b7280;
            }
            .status {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
            }
            .status-success {
              background: #d1fae5;
              color: #065f46;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .receipt {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>Payment Receipt</h1>
              <p>Transaction Confirmation</p>
            </div>
            <div class="content">
              <div class="details">
                <div class="row">
                  <span class="label">Payment ID:</span>
                  <span class="value">${payment.paymentId || 'N/A'}</span>
                </div>
                <div class="row">
                  <span class="label">Order ID:</span>
                  <span class="value">${payment.orderId || 'N/A'}</span>
                </div>
                <div class="row">
                  <span class="label">Date:</span>
                  <span class="value">${formatDate(payment.createdAt)}</span>
                </div>
                <div class="row">
                  <span class="label">Organization:</span>
                  <span class="value">${payment.organizationName || payment.organization?.organizationName || 'N/A'}</span>
                </div>
                <div class="row">
                  <span class="label">Status:</span>
                  <span class="value"><span class="status status-success">${payment.status || 'SUCCESS'}</span></span>
                </div>
                ${payment.userEmail ? `<div class="row"><span class="label">Email:</span><span class="value">${payment.userEmail}</span></div>` : ''}
              </div>
              <div class="amount">
                Total Amount: ${formatAmount(payment.amount)}
              </div>
            </div>
            <div class="footer">
              <p>Thank you for your payment!</p>
              <p>This is a computer-generated receipt and does not require a signature.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([receiptHtml], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${payment.paymentId || payment.orderId || 'payment'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast("success", "Receipt downloaded successfully!");
    } catch (error) {
      console.error("Receipt download error:", error);
      showToast("error", "Failed to download receipt");
    }
  };

  const exportToCSV = () => {
    setExportLoading(true);

    try {
      const headers = [
        'Payment ID',
        'Order ID',
        'Amount',
        'Status',
        'Organization',
        'Date',
        'Time'
      ];

      const csvData = filteredPayments.map(p => [
        p.paymentId || 'N/A',
        p.orderId || 'N/A',
        p.amount || 0,
        p.status || 'N/A',
        p.organizationName || p.organization?.organizationName || 'N/A',
        formatDateOnly(p.createdAt),
        formatTimeOnly(p.createdAt)
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast("success", "Export successful!");
    } catch (error) {
      console.error("Export error:", error);
      showToast("error", "Failed to export data");
    } finally {
      setExportLoading(false);
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-${color}-50`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : trend < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{title}</p>
        </div>
      </CardContent>
    </Card>
  );

  const PaymentDetailsModal = ({ payment, isOpen, onClose }: any) => {
    if (!isOpen || !payment) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4" onClick={onClose}>
        <div className="max-h-[calc(100svh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl duration-200 animate-in fade-in zoom-in" onClick={e => e.stopPropagation()}>
          <div className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-gray-900">Payment Details</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-emerald-50 p-4 sm:col-span-2">
                  <label className="text-xs text-emerald-600 uppercase tracking-wide">Amount</label>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">{formatAmount(payment.amount)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Payment ID</label>
                  <p className="text-sm font-mono mt-1 break-all bg-gray-50 p-2 rounded">{payment.paymentId || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Order ID</label>
                  <p className="text-sm font-mono mt-1 break-all bg-gray-50 p-2 rounded">{payment.orderId || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
                  <div className="mt-1">{getStatusBadge(payment.status)}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Organization</label>
                  <p className="text-sm font-medium mt-1">{payment.organizationName || payment.organization?.organizationName || 'N/A'}</p>
                </div>
               
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Date</label>
                  <p className="text-sm mt-1">{payment.createdAt ? formatDateOnly(payment.createdAt) : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Time</label>
                  <p className="text-sm mt-1">{formatTimeOnly(payment.createdAt)}</p>
                </div>
              </div>

              {/* Removed Print button, only keeping Download Receipt */}
              <div className="border-t pt-4 mt-4">
                <Button 
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                  onClick={() => downloadReceipt(payment)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-emerald-600">Revenue: {formatAmount(payload[0].value)}</p>
          {payload[1] && (
            <p className="text-blue-600">Transactions: {payload[1].value}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const getFilteredData = () => {
    if (monthlyData.length === 0) return [];
    let filtered = [...monthlyData];
    switch (selectedPeriod) {
      case 'weekly': return filtered.slice(-4);
      case 'monthly': return filtered;
      case 'quarterly': return filtered.slice(-3);
      case 'yearly': return filtered;
      default: return filtered;
    }
  };

  const successRate = stats.totalTransactions > 0
    ? ((stats.successfulPayments / stats.totalTransactions) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <PaymentDetailsModal
        payment={selectedPayment}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />

      {/* Header Section */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Analytics</h2>
          <p className="text-gray-500 mt-1">Track and manage all payment transactions</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={exportToCSV}
            disabled={exportLoading || filteredPayments.length === 0}
          >
            {exportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Report
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={fetchPayments}
            disabled={loading}
          >
            <Filter className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <StatCard
          title="Total Revenue"
          value={formatAmount(stats.totalRevenue)}
          icon={IndianRupee}
          trend={stats.growthRate}
          color="emerald"
        />
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions}
          icon={CreditCard}
          color="blue"
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Avg. Transaction"
          value={formatAmount(stats.averageTransactionValue)}
          icon={Wallet}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <CardTitle>Revenue Overview</CardTitle>
              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
                {['weekly', 'monthly', 'quarterly', 'yearly'].map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod(period)}
                    className={selectedPeriod === period ? "bg-emerald-600" : ""}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                No payment data available
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getFilteredData()}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `₹${value / 1000}K`} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                      name="Revenue"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="transactions"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name="Transactions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-semibold text-emerald-600">{successRate}%</span>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-100">
                  <div
                    style={{ width: `${successRate}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500 transition-all duration-500"
                  ></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-sm text-gray-600">Successful</span>
                  </div>
                  <span className="text-sm font-semibold">{stats.successfulPayments}</span>
                </div>
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-sm text-gray-600">Pending</span>
                  </div>
                  <span className="text-sm font-semibold">{stats.pendingPayments}</span>
                </div>
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-gray-600">Failed</span>
                  </div>
                  <span className="text-sm font-semibold">{stats.failedPayments}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Organizations</span>
                  <span className="text-lg font-bold text-gray-900">
                    {new Set(payments.map(p => p.organizationId)).size}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table with Search and Pagination */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <CardTitle>Transactions</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by ID, org, user, amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No transactions found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or refresh the page</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Transaction ID</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-sm font-mono text-gray-600">
                          {payment.paymentId ? payment.paymentId.slice(0, 12) + '...' : 'N/A'}
                        </td>
                        <td className="p-3 text-sm font-medium text-gray-900">
                          {payment.organizationName || payment.organization?.organizationName || 'N/A'}
                        </td>
                        <td className="p-3 text-sm font-semibold text-gray-900">
                          {formatAmount(payment.amount)}
                        </td>
                        <td className="p-3">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {formatDateOnly(payment.createdAt)}
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {formatTimeOnly(payment.createdAt)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowDetailsModal(true);
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadReceipt(payment)}
                              title="Download Receipt"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredPayments.length)} of {filteredPayments.length} entries
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={currentPage === pageNum ? "bg-emerald-600" : ""}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsTab;

import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, ChevronDown, ChevronUp, Download, Mail, 
  MoreVertical, CheckSquare, Square, Eye, ShieldCheck, UserCheck, 
  AlertCircle, Sparkles, UserPlus, CreditCard, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function SaaSCustomerTable({ onSelectCustomer }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('mrr');
  const [sortOrder, setSortOrder] = useState('desc');

  const itemsPerPage = 6;

  // Realistic mock data for SaaS subscribers
  const mockCustomers = [
    {
      id: 'usr_9021',
      name: 'Alexandre Dubois',
      email: 'alex.d@vertexlabs.io',
      company: 'Vertex AI Inc.',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      plan: 'Enterprise Core',
      status: 'Active',
      mrr: 4500,
      seats: 120,
      billingCycle: 'Annual',
      lastActive: '2 mins ago',
      joinDate: 'Jan 12, 2025'
    },
    {
      id: 'usr_9022',
      name: 'Elena Rostova',
      email: 'elena@cyberdyne.tech',
      company: 'CyberDyne Systems',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      plan: 'Enterprise Core',
      status: 'Active',
      mrr: 7200,
      seats: 250,
      billingCycle: 'Annual',
      lastActive: '14 mins ago',
      joinDate: 'Nov 04, 2024'
    },
    {
      id: 'usr_9023',
      name: 'Marcus Vance',
      email: 'm.vance@starlight.cloud',
      company: 'Starlight Cloud',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
      plan: 'Business Pro',
      status: 'Trialing',
      mrr: 890,
      seats: 25,
      billingCycle: 'Monthly',
      lastActive: '1 hour ago',
      joinDate: 'Sep 18, 2026'
    },
    {
      id: 'usr_9024',
      name: 'Sophia Chen',
      email: 'sophia@quantumcode.dev',
      company: 'Quantum Code Studio',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
      plan: 'Business Pro',
      status: 'Active',
      mrr: 1200,
      seats: 45,
      billingCycle: 'Monthly',
      lastActive: '3 hours ago',
      joinDate: 'Mar 29, 2025'
    },
    {
      id: 'usr_9025',
      name: 'David K. Miller',
      email: 'd.miller@apexlogistics.com',
      company: 'Apex Global Logistics',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      plan: 'Growth Startup',
      status: 'Past Due',
      mrr: 450,
      seats: 12,
      billingCycle: 'Monthly',
      lastActive: '5 hours ago',
      joinDate: 'Feb 15, 2026'
    },
    {
      id: 'usr_9026',
      name: 'Hana Takahashi',
      email: 'hana@neotokyo.design',
      company: 'NeoTokyo Interactive',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
      plan: 'Enterprise Core',
      status: 'Active',
      mrr: 3800,
      seats: 95,
      billingCycle: 'Annual',
      lastActive: 'Just now',
      joinDate: 'May 08, 2025'
    },
    {
      id: 'usr_9027',
      name: 'Liam O’Connor',
      email: 'liam@celticsolutions.ie',
      company: 'Celtic Financial Tech',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      plan: 'Starter Tier',
      status: 'Canceled',
      mrr: 149,
      seats: 5,
      billingCycle: 'Monthly',
      lastActive: '3 days ago',
      joinDate: 'Jan 02, 2026'
    },
    {
      id: 'usr_9028',
      name: 'Fatima Al-Mansoor',
      email: 'fatima@desertsun.ae',
      company: 'Desert Sun Ventures',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
      plan: 'Business Pro',
      status: 'Active',
      mrr: 1550,
      seats: 50,
      billingCycle: 'Annual',
      lastActive: '12 mins ago',
      joinDate: 'Jun 19, 2025'
    }
  ];

  // Defensive filtering and sorting
  const filteredCustomers = useMemo(() => {
    return (mockCustomers || []).filter((c) => {
      const nameMatch = String(c.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = String(c.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const companyMatch = String(c.company || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = nameMatch || emailMatch || companyMatch;

      const matchesPlan = selectedPlan === 'ALL' || c.plan === selectedPlan;
      const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;

      return matchesSearch && matchesPlan && matchesStatus;
    }).sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchQuery, selectedPlan, selectedStatus, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedRowIds.length === paginatedCustomers.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(paginatedCustomers.map(c => c.id));
    }
  };

  const toggleSelectRow = (id) => {
    if (selectedRowIds.includes(id)) {
      setSelectedRowIds(selectedRowIds.filter(i => i !== id));
    } else {
      setSelectedRowIds([...selectedRowIds, id]);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Trialing':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Past Due':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Canceled':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/70 p-5 shadow-2xl backdrop-blur-xl">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Subscribers & Account Oversight</h3>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-bold text-indigo-400 border border-indigo-500/20">
              {filteredCustomers.length} Accounts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage user seats, subscription plans, MRR billing statuses, and account health.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-90 transition-all">
            <UserPlus className="h-4 w-4" /> Provision User
          </button>
          <button className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all">
            <Download className="h-4 w-4 text-indigo-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, company..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Plan & Status Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Plan Filter */}
          <select
            value={selectedPlan}
            onChange={(e) => {
              setSelectedPlan(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Plans</option>
            <option value="Enterprise Core">Enterprise Core</option>
            <option value="Business Pro">Business Pro</option>
            <option value="Growth Startup">Growth Startup</option>
            <option value="Starter Tier">Starter Tier</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Trialing">Trialing</option>
            <option value="Past Due">Past Due</option>
            <option value="Canceled">Canceled</option>
          </select>
        </div>
      </div>

      {/* Bulk Operations Floating Bar (When items are selected) */}
      {selectedRowIds.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-indigo-950/60 border border-indigo-500/30 px-4 py-2 text-xs">
          <span className="font-semibold text-indigo-300">
            {selectedRowIds.length} subscriber(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button className="rounded-lg bg-indigo-600 px-2.5 py-1 text-white font-semibold hover:bg-indigo-500 transition-all">
              Batch Email
            </button>
            <button className="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-200 font-semibold hover:bg-slate-700 transition-all">
              Change Plan
            </button>
            <button 
              onClick={() => setSelectedRowIds([])}
              className="text-slate-400 hover:text-white underline ml-2"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Data Table Container */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-3 w-10 text-center">
                <button onClick={toggleSelectAll} className="focus:outline-none">
                  {selectedRowIds.length > 0 && selectedRowIds.length === paginatedCustomers.length ? (
                    <CheckSquare className="h-4 w-4 text-indigo-400" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-600" />
                  )}
                </button>
              </th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
                Subscriber / Organization
              </th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('plan')}>
                Plan Tier
              </th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('status')}>
                Status
              </th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('mrr')}>
                Monthly Spend
              </th>
              <th className="p-3">Seats</th>
              <th className="p-3">Last Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 text-xs">
            {(paginatedCustomers || []).length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-500">
                  No subscribers match your current filter parameters.
                </td>
              </tr>
            ) : (
              paginatedCustomers.map((c) => {
                const isSelected = selectedRowIds.includes(c.id);
                return (
                  <tr
                    key={c.id}
                    className={`group transition-all hover:bg-slate-900/80 cursor-pointer ${
                      isSelected ? 'bg-indigo-950/20' : ''
                    }`}
                    onClick={() => onSelectCustomer(c)}
                  >
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelectRow(c.id)}>
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-indigo-400" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-600 group-hover:text-slate-400" />
                        )}
                      </button>
                    </td>

                    {/* Customer Info */}
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.avatar}
                          alt={c.name}
                          className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-700"
                        />
                        <div>
                          <p className="font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
                            {c.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{c.email} • <span className="text-slate-300 font-sans">{c.company}</span></p>
                        </div>
                      </div>
                    </td>

                    {/* Plan Tier */}
                    <td className="p-3">
                      <span className="font-semibold text-slate-200">{c.plan}</span>
                      <p className="text-[10px] text-slate-500">{c.billingCycle} billing</p>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusBadge(c.status)}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {c.status}
                      </span>
                    </td>

                    {/* Spend */}
                    <td className="p-3 font-mono font-bold text-emerald-400">
                      ${c.mrr.toLocaleString()} / mo
                    </td>

                    {/* Seats */}
                    <td className="p-3 text-slate-300 font-mono">
                      {c.seats} seats
                    </td>

                    {/* Last Active */}
                    <td className="p-3 text-slate-400 text-[11px]">
                      {c.lastActive}
                    </td>

                    {/* Quick Action Button */}
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectCustomer(c)}
                        className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:border-slate-700 hover:text-white transition-all"
                        title="View Detailed Profile"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <p>
          Showing <span className="font-bold text-slate-200">{Math.min(filteredCustomers.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
          <span className="font-bold text-slate-200">{Math.min(filteredCustomers.length, currentPage * itemsPerPage)}</span> of{' '}
          <span className="font-bold text-slate-200">{filteredCustomers.length}</span> entries
        </p>

        <div className="flex items-center gap-1.5">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="px-2 font-mono font-bold text-slate-200">
            {currentPage} / {totalPages}
          </span>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

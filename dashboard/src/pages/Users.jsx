import { useState } from 'react';
import { users } from '../data/mock';

export default function Users() {
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.phone_number.includes(search);
    const matchKyc = kycFilter === 'all' || u.kyc_status === kycFilter;
    return matchSearch && matchKyc;
  });

  if (selectedUser) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedUser(null)}
          className="text-sm text-navy-600 hover:text-navy-700 font-medium"
        >
          &larr; Back to users
        </button>
        <UserProfile user={selectedUser} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-navy-700">Users</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brick-500 focus:border-transparent outline-none text-sm"
        />
        <select
          value={kycFilter}
          onChange={(e) => setKycFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brick-500 outline-none"
        >
          <option value="all">All KYC</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Phone</th>
                <th className="px-5 py-3 text-left">KYC</th>
                <th className="px-5 py-3 text-right">Meters</th>
                <th className="px-5 py-3 text-left">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-navy-700">{u.full_name}</td>
                  <td className="px-5 py-3 text-gray-500">{u.phone_number}</td>
                  <td className="px-5 py-3">
                    <KycBadge status={u.kyc_status} />
                  </td>
                  <td className="px-5 py-3 text-right">{u.meters}</td>
                  <td className="px-5 py-3 text-gray-400">{u.created_at}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="text-xs text-brick-500 hover:text-brick-600 font-semibold"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400">{filtered.length} of {users.length} users</p>
    </div>
  );
}

function UserProfile({ user }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center text-lg font-bold text-navy-700">
          {user.full_name[0]}
        </div>
        <div>
          <h2 className="text-lg font-bold text-navy-700">{user.full_name}</h2>
          <p className="text-sm text-gray-400">{user.phone_number}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400">KYC Status</p>
          <KycBadge status={user.kyc_status} />
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400">Registered Meters</p>
          <p className="text-sm font-bold text-navy-700">{user.meters}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400">User ID</p>
          <p className="text-sm font-bold text-navy-700">{user.id}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400">Joined</p>
          <p className="text-sm font-bold text-navy-700">{user.created_at}</p>
        </div>
      </div>
    </div>
  );
}

function KycBadge({ status }) {
  const styles = {
    verified: 'bg-green-50 text-green-700',
    pending:  'bg-yellow-50 text-yellow-700',
    rejected: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || ''}`}>
      {status}
    </span>
  );
}

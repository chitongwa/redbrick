import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/dashboard_provider.dart';
import '../providers/meter_provider.dart';
import '../widgets/bolt_icon.dart';
import '../widgets/error_banner.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDashboard());
  }

  void _loadDashboard() {
    final meter = ref.read(selectedMeterProvider);
    if (meter != null) {
      ref.read(dashboardProvider.notifier).load(meter.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final dashState = ref.watch(dashboardProvider);
    final user = authState.value;
    final userName = user?.fullName ?? 'Customer';

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const BoltIcon(size: 22, color: AppColors.brick),
            const SizedBox(width: 6),
            RichText(text: const TextSpan(
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              children: [
                TextSpan(text: 'Red', style: TextStyle(color: AppColors.white)),
                TextSpan(text: 'Brick', style: TextStyle(color: AppColors.brick)),
              ],
            )),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _loadDashboard(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Welcome
            Text('Welcome back, $userName',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.navy)),
            const SizedBox(height: 4),
            Text(
              'Meter: ${ref.watch(selectedMeterProvider)?.meterNumber ?? '—'}',
              style: const TextStyle(color: AppColors.grey400, fontSize: 12),
            ),
            const SizedBox(height: 16),

            // Balance card / Loading / Error
            dashState.when(
              loading: () => _buildBalanceCardLoading(),
              error: (e, _) => ErrorBanner(message: friendlyError(e), onRetry: _loadDashboard),
              data: (data) => _buildBalanceCard(data),
            ),

            const SizedBox(height: 16),

            // Quick actions
            Row(
              children: [
                _actionButton('Top Up', Icons.bolt_rounded, AppColors.navy, () {}),
                const SizedBox(width: 10),
                _actionButton('Pay Later', Icons.credit_card, AppColors.brick, () => context.push('/pay-later')),
                const SizedBox(width: 10),
                _actionButton('History', Icons.history, AppColors.grey400, () => context.push('/history')),
              ],
            ),
            const SizedBox(height: 24),

            // Recent transactions
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('RECENT TRANSACTIONS',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.navy, letterSpacing: 1)),
                GestureDetector(
                  onTap: () => context.push('/history'),
                  child: const Text('View all', style: TextStyle(color: AppColors.brick, fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            const SizedBox(height: 8),

            dashState.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const SizedBox.shrink(),
              data: (data) => _buildRecentTx(data.recentTransactions),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceCardLoading() {
    return Container(
      height: 160,
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [AppColors.navy, AppColors.navyDark]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Center(child: CircularProgressIndicator(color: AppColors.brick)),
    );
  }

  Widget _buildBalanceCard(DashboardData data) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [AppColors.navy, AppColors.navyDark]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('ZESCO Account Balance', style: TextStyle(color: AppColors.grey400, fontSize: 12)),
              BoltIcon(size: 20, color: AppColors.brick),
            ],
          ),
          const SizedBox(height: 4),
          Text('ZMW ${data.balanceZmw.toStringAsFixed(2)}',
              style: const TextStyle(color: AppColors.white, fontSize: 28, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          Container(height: 1, color: AppColors.navy.withAlpha(120)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Credit Limit', style: TextStyle(color: AppColors.grey400, fontSize: 10)),
                  Text('ZMW ${data.creditLimit.toStringAsFixed(2)}',
                      style: const TextStyle(color: AppColors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                ]),
              ),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Outstanding', style: TextStyle(color: AppColors.grey400, fontSize: 10)),
                  Text('ZMW ${data.outstandingBorrowed.toStringAsFixed(2)}',
                      style: const TextStyle(color: AppColors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                ]),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _actionButton(String label, IconData icon, Color color, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            children: [
              Icon(icon, color: AppColors.white, size: 22),
              const SizedBox(height: 4),
              Text(label, style: const TextStyle(color: AppColors.white, fontSize: 12, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentTx(List<Map<String, dynamic>> txs) {
    if (txs.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(24),
        child: Center(child: Text('No transactions yet', style: TextStyle(color: AppColors.grey400))),
      );
    }
    return Column(
      children: txs.map((tx) {
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [BoxShadow(color: Colors.black.withAlpha(12), blurRadius: 4, offset: const Offset(0, 2))],
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.navyLight,
                child: const BoltIcon(size: 16, color: AppColors.navy),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Electricity top-up', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.navy)),
                  Text(tx['purchased_at']?.toString().substring(0, 10) ?? '', style: const TextStyle(fontSize: 11, color: AppColors.grey400)),
                ]),
              ),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('ZMW ${(tx['amount_zmw'] as num).toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.navy)),
                Text('${(tx['units_purchased'] as num).toStringAsFixed(1)} kWh',
                    style: const TextStyle(fontSize: 11, color: AppColors.grey400)),
              ]),
            ],
          ),
        );
      }).toList(),
    );
  }
}

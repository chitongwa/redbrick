import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../models/trade_credit_order.dart';
import '../providers/auth_provider.dart';
import '../providers/dashboard_provider.dart';
import '../providers/meter_provider.dart';
import '../widgets/bolt_icon.dart';
import '../widgets/error_banner.dart';
import '../widgets/tier_badge.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDashboard());
    // Tick every second for countdown timer
    _countdownTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) { if (mounted) setState(() {}); },
    );
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
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
            // ── Welcome + Tier badge ─────────────────────────────────
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Welcome back, $userName',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.navy)),
                      const SizedBox(height: 4),
                      Text(
                        'Meter: ${ref.watch(selectedMeterProvider)?.meterNumber ?? '—'}',
                        style: const TextStyle(color: AppColors.grey400, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                dashState.whenOrNull(
                  data: (data) => TierBadge(tier: data.tier),
                ) ?? const SizedBox.shrink(),
              ],
            ),
            const SizedBox(height: 12),

            // ── Frozen account banner ────────────────────────────────
            dashState.whenOrNull(
              data: (data) => data.accountFrozen ? _buildFrozenBanner() : null,
            ) ?? const SizedBox.shrink(),

            // ── Outstanding order banner with countdown ──────────────
            dashState.whenOrNull(
              data: (data) {
                if (data.outstandingOrder != null && data.outstandingOrder!.isPending) {
                  return _buildOutstandingBanner(data.outstandingOrder!);
                }
                return null;
              },
            ) ?? const SizedBox.shrink(),

            // ── Balance card / Loading / Error ───────────────────────
            dashState.when(
              loading: () => _buildBalanceCardLoading(),
              error: (e, _) => ErrorBanner(message: friendlyError(e), onRetry: _loadDashboard),
              data: (data) => _buildBalanceCard(data),
            ),

            const SizedBox(height: 12),

            // ── Graduation progress (Tier 1 only) ───────────────────
            dashState.whenOrNull(
              data: (data) => data.isTier1 ? _buildGraduationProgress(data) : null,
            ) ?? const SizedBox.shrink(),

            const SizedBox(height: 12),

            // ── Quick actions ────────────────────────────────────────
            dashState.when(
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
              data: (data) => _buildQuickActions(data),
            ),
            const SizedBox(height: 24),

            // ── Recent transactions ──────────────────────────────────
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

  // ── Frozen account banner ──────────────────────────────────────────────

  Widget _buildFrozenBanner() {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.redLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.red.withAlpha(60)),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock_rounded, color: AppColors.red, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Account Frozen',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.red)),
                const SizedBox(height: 2),
                const Text('You have an overdue trade credit payment.',
                    style: TextStyle(fontSize: 12, color: AppColors.red)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: () => context.go('/get-electricity'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.red,
              foregroundColor: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              minimumSize: Size.zero,
              textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            ),
            child: const Text('Pay Now'),
          ),
        ],
      ),
    );
  }

  // ── Outstanding order banner with countdown ────────────────────────────

  Widget _buildOutstandingBanner(TradeCreditOrder order) {
    final remaining = order.timeRemaining;
    final isOverdue = order.isOverdue;

    String countdownText;
    if (remaining == null || isOverdue) {
      countdownText = 'OVERDUE';
    } else {
      final h = remaining.inHours;
      final m = remaining.inMinutes % 60;
      final s = remaining.inSeconds % 60;
      countdownText = '${h}h ${m}m ${s}s';
    }

    final bgColor = isOverdue ? AppColors.redLight : AppColors.goldLight;
    final accentColor = isOverdue ? AppColors.red : AppColors.gold;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: accentColor.withAlpha(60)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.timer_outlined, color: accentColor, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Outstanding: ZMW ${order.totalDue.toStringAsFixed(2)}',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: accentColor),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: accentColor.withAlpha(30),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  countdownText,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'monospace',
                    color: accentColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.go('/get-electricity'),
              style: ElevatedButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: AppColors.white,
                minimumSize: const Size.fromHeight(36),
                textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              ),
              child: Text('Pay ZMW ${order.totalDue.toStringAsFixed(2)} Now'),
            ),
          ),
        ],
      ),
    );
  }

  // ── Graduation progress bar (Tier 1) ──────────────────────────────────

  Widget _buildGraduationProgress(DashboardData data) {
    final progress = data.graduationProgress;
    const target = 6;
    final pct = (progress / target).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 4, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.star_rounded, size: 18, color: AppColors.gold),
              const SizedBox(width: 6),
              const Text('Path to Credit Member',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.navy)),
              const Spacer(),
              Text('$progress of $target',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.gold)),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 8,
              backgroundColor: AppColors.grey200,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.gold),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            progress >= target
                ? 'You may qualify for Credit Member status!'
                : '$progress of $target transactions completed towards Credit Member status',
            style: const TextStyle(fontSize: 11, color: AppColors.grey400),
          ),
        ],
      ),
    );
  }

  // ── Balance card ──────────────────────────────────────────────────────

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
                  Text(data.isTier2 ? 'Credit Limit' : 'Service Fee',
                      style: const TextStyle(color: AppColors.grey400, fontSize: 10)),
                  Text(
                    data.isTier2 ? 'ZMW ${data.creditLimit.toStringAsFixed(2)}' : '4% per purchase',
                    style: const TextStyle(color: AppColors.white, fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                ]),
              ),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(data.isTier2 ? 'Outstanding' : 'Completed',
                      style: const TextStyle(color: AppColors.grey400, fontSize: 10)),
                  Text(
                    data.isTier2
                        ? 'ZMW ${data.outstandingBorrowed.toStringAsFixed(2)}'
                        : '${data.tradeCreditTransactions} transactions',
                    style: const TextStyle(color: AppColors.white, fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                ]),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Quick actions (tier-aware) ────────────────────────────────────────

  Widget _buildQuickActions(DashboardData data) {
    if (data.isTier2) {
      return Row(
        children: [
          _actionButton('Top Up', Icons.bolt_rounded, AppColors.navy, () {}),
          const SizedBox(width: 10),
          _actionButton('Borrow', Icons.account_balance_wallet_rounded, AppColors.gold, () => context.push('/credit')),
          const SizedBox(width: 10),
          _actionButton('History', Icons.history, AppColors.grey400, () => context.push('/history')),
        ],
      );
    }

    return Row(
      children: [
        _actionButton('Get\nElectricity', Icons.bolt_rounded, AppColors.brick, () => context.push('/get-electricity')),
        const SizedBox(width: 10),
        _actionButton('History', Icons.history, AppColors.navy, () => context.push('/history')),
        const SizedBox(width: 10),
        _actionButton('Account', Icons.person_outline, AppColors.grey400, () => context.push('/account')),
      ],
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
              Text(label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.white, fontSize: 12, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }

  // ── Recent transactions ───────────────────────────────────────────────

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

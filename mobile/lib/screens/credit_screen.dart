import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../providers/dashboard_provider.dart';
import '../providers/meter_provider.dart';
import '../services/api_client.dart';
import '../widgets/bolt_icon.dart';
import '../widgets/error_banner.dart';
import '../widgets/loading_overlay.dart';
import '../widgets/tier_badge.dart';

/// Tier 2 — Credit Member borrow screen.
class CreditScreen extends ConsumerStatefulWidget {
  const CreditScreen({super.key});

  @override
  ConsumerState<CreditScreen> createState() => _CreditScreenState();
}

class _CreditScreenState extends ConsumerState<CreditScreen> {
  double _amount = 50;
  bool _loading = false;
  String? _error;

  // Success state
  bool _confirmed = false;
  String? _tokenCode;
  double? _unitsKwh;
  String? _dueDate;
  double? _loanFee;
  double? _totalRepayment;

  Future<void> _confirm() async {
    final meter = ref.read(selectedMeterProvider);
    if (meter == null) return;

    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiClient.instance.borrow(meter.id, _amount);
      final data = res.data as Map<String, dynamic>;
      final loan = data['loan'] as Map<String, dynamic>;
      final token = data['token'] as Map<String, dynamic>;

      setState(() {
        _confirmed = true;
        _tokenCode = token['code'] as String;
        _unitsKwh = (token['units_kwh'] as num).toDouble();
        _dueDate = (loan['due_date'] as String).substring(0, 10);
        _loanFee = _amount * 0.05;
        _totalRepayment = _amount + (_loanFee ?? 0);
      });
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dash = ref.watch(dashboardProvider).value;
    final creditLimit = dash?.creditLimit ?? 250;
    final available = dash?.availableCredit ?? 250;
    final maxBorrow = available.clamp(20.0, 500.0);
    final meter = ref.watch(selectedMeterProvider);

    if (_confirmed) return _buildSuccess(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Credit'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: TierBadge(tier: 'loan_credit'),
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _loading,
        message: 'Processing loan...',
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Credit Member badge banner ────────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF4A3B1F), Color(0xFF7A6225)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.gold.withAlpha(40),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.star_rounded, color: AppColors.gold, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Credit Member',
                          style: TextStyle(color: AppColors.gold, fontSize: 16, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Row(children: [
                        Text('Limit: ZMW ${creditLimit.toStringAsFixed(0)}',
                            style: const TextStyle(color: Colors.white70, fontSize: 12)),
                        const SizedBox(width: 12),
                        Container(width: 1, height: 12, color: Colors.white30),
                        const SizedBox(width: 12),
                        Text('Available: ZMW ${available.toStringAsFixed(0)}',
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                      ]),
                    ]),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            if (_error != null) ...[
              ErrorBanner(message: _error!),
              const SizedBox(height: 12),
            ],

            // ── Borrow form ──────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(20)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                // Meter
                const Text('Meter', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.navy)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.grey200),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(meter?.meterNumber ?? '—',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
                const SizedBox(height: 20),

                // Amount
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  const Text('Borrow Amount',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.navy)),
                  Text('ZMW 20 – ${maxBorrow.toInt()}',
                      style: const TextStyle(fontSize: 11, color: AppColors.grey400)),
                ]),
                const SizedBox(height: 8),
                Slider(
                  value: _amount.clamp(20, maxBorrow),
                  min: 20,
                  max: maxBorrow < 20 ? 20 : maxBorrow,
                  divisions: ((maxBorrow - 20) / 5).round().clamp(1, 200),
                  activeColor: AppColors.gold,
                  label: 'ZMW ${_amount.toInt()}',
                  onChanged: (v) => setState(() => _amount = v),
                ),
                Center(
                  child: Text('ZMW ${_amount.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.navy)),
                ),
                const SizedBox(height: 16),

                // Units preview
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.navyLight,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(children: [
                    CircleAvatar(radius: 18, backgroundColor: AppColors.white,
                        child: BoltIcon(size: 18, color: AppColors.navy)),
                    const SizedBox(width: 12),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('You will receive',
                          style: TextStyle(fontSize: 11, color: AppColors.grey400)),
                      Text('${(_amount / 2.5).toStringAsFixed(1)} kWh',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.navy)),
                    ]),
                    const Spacer(),
                    const Text('@ ZMW 2.50/unit',
                        style: TextStyle(fontSize: 11, color: AppColors.grey400)),
                  ]),
                ),
                const SizedBox(height: 12),

                // Fee breakdown
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.goldLight,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.gold.withAlpha(40)),
                  ),
                  child: Column(children: [
                    _feeRow('Loan amount', 'ZMW ${_amount.toStringAsFixed(2)}'),
                    const SizedBox(height: 4),
                    _feeRow('Fee (5% / 30 days)', 'ZMW ${(_amount * 0.05).toStringAsFixed(2)}'),
                    const Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Divider(height: 1)),
                    _feeRow('Total repayment', 'ZMW ${(_amount * 1.05).toStringAsFixed(2)}',
                        bold: true, color: AppColors.goldDark),
                    const SizedBox(height: 6),
                    Row(children: [
                      Icon(Icons.discount_rounded, size: 12, color: AppColors.green),
                      const SizedBox(width: 4),
                      const Expanded(child: Text(
                        '1% discount if repaid within 7 days!',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.green),
                      )),
                    ]),
                  ]),
                ),
                const SizedBox(height: 12),

                const Row(children: [
                  Icon(Icons.info_outline, size: 14, color: AppColors.grey400),
                  SizedBox(width: 4),
                  Expanded(child: Text(
                    'Repayment due within 30 days. 1% early repayment discount if paid within 7 days.',
                    style: TextStyle(fontSize: 11, color: AppColors.grey400),
                  )),
                ]),
                const SizedBox(height: 20),

                ElevatedButton(
                  onPressed: _loading ? null : _confirm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.gold,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Confirm & Get Tokens'),
                ),
              ]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _feeRow(String label, String value, {bool bold = false, Color? color}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 12, color: color ?? AppColors.grey700)),
        Text(value, style: TextStyle(
            fontSize: 12, fontWeight: bold ? FontWeight.w800 : FontWeight.w600, color: color ?? AppColors.navy)),
      ],
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Success screen
  // ═════════════════════════════════════════════════════════════════════════

  Widget _buildSuccess(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tokens Issued')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.goldLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.star_rounded, size: 36, color: AppColors.gold),
              ),
              const SizedBox(height: 16),
              const Text('Credit Tokens Issued!',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.navy)),
              const SizedBox(height: 8),
              Text('ZMW ${_amount.toStringAsFixed(2)} credit applied.',
                  style: const TextStyle(color: AppColors.grey400, fontSize: 13)),
              const SizedBox(height: 24),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: AppColors.navyLight, borderRadius: BorderRadius.circular(16)),
                child: Column(children: [
                  const Text('YOUR ZESCO TOKEN',
                      style: TextStyle(fontSize: 10, letterSpacing: 1, color: AppColors.grey400)),
                  const SizedBox(height: 8),
                  Text(_tokenCode ?? '', style: const TextStyle(
                      fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.navy, letterSpacing: 2, fontFamily: 'monospace')),
                ]),
              ),
              const SizedBox(height: 16),
              Row(children: [
                _infoTile('Units', '${_unitsKwh?.toStringAsFixed(1)} kWh'),
                const SizedBox(width: 12),
                _infoTile('Due', _dueDate ?? ''),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                _infoTile('Fee (5%)', 'ZMW ${(_loanFee ?? 0).toStringAsFixed(2)}'),
                const SizedBox(width: 12),
                _infoTile('Total Due', 'ZMW ${(_totalRepayment ?? 0).toStringAsFixed(2)}'),
              ]),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy),
                  onPressed: () => context.go('/home'),
                  child: const Text('Back to Dashboard'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoTile(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppColors.grey50, borderRadius: BorderRadius.circular(12)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.grey400)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.navy)),
        ]),
      ),
    );
  }
}

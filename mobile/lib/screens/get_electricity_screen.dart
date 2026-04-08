import 'dart:async';
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

/// Tier 1 — "Get Now, Pay in 24hrs" screen.
/// Handles both purchasing tokens and paying outstanding orders.
class GetElectricityScreen extends ConsumerStatefulWidget {
  const GetElectricityScreen({super.key});

  @override
  ConsumerState<GetElectricityScreen> createState() => _GetElectricityScreenState();
}

class _GetElectricityScreenState extends ConsumerState<GetElectricityScreen> {
  double _amount = 50;
  bool _loading = false;
  String? _error;

  // Success states
  bool _purchased = false;
  String? _tokenCode;
  double? _unitsKwh;
  double? _totalDue;
  String? _dueAt;
  int? _orderId;

  // Payment state
  bool _paying = false;
  bool _paid = false;
  String? _paymentRef;
  String? _selectedMethod;

  // Outstanding order payment (from dashboard)
  bool _payingExisting = false;
  double? _existingTotalDue;
  int? _existingOrderId;

  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    _countdownTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) { if (mounted) setState(() {}); },
    );
    // Check if there's an outstanding order to pay
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final dash = ref.read(dashboardProvider).value;
      if (dash?.outstandingOrder != null && dash!.outstandingOrder!.isPending) {
        setState(() {
          _payingExisting = true;
          _existingTotalDue = dash.outstandingOrder!.totalDue;
          _existingOrderId = int.tryParse(dash.outstandingOrder!.id);
        });
      }
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  double get _serviceFee => (_amount * 0.04 * 100).roundToDouble() / 100;
  double get _total => _amount + _serviceFee;
  double get _estimatedKwh => _amount / 2.5;

  Future<void> _purchase() async {
    final meter = ref.read(selectedMeterProvider);
    if (meter == null) return;

    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiClient.instance.purchaseTradeCredit(meter.id, _amount);
      final data = res.data as Map<String, dynamic>;
      final order = data['order'] as Map<String, dynamic>;
      final token = data['token'] as Map<String, dynamic>;
      final payment = data['payment'] as Map<String, dynamic>;

      setState(() {
        _purchased = true;
        _tokenCode = token['code'] as String?;
        _unitsKwh = (token['units_kwh'] as num?)?.toDouble();
        _totalDue = (payment['total_due'] as num?)?.toDouble() ?? _total;
        _dueAt = payment['due_at'] as String?;
        _orderId = order['id'] is int ? order['id'] : int.tryParse(order['id'].toString());
      });
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _payOrder(int orderId, double amount) async {
    if (_selectedMethod == null) {
      setState(() => _error = 'Select a payment method');
      return;
    }
    setState(() { _paying = true; _error = null; });
    try {
      final res = await ApiClient.instance.payTradeCredit(orderId, _selectedMethod!);
      final data = res.data as Map<String, dynamic>;
      setState(() {
        _paid = true;
        _paymentRef = data['payment_reference'] as String?;
      });
      // Check for graduation hint
      final hint = data['graduation_hint'] as String?;
      if (hint != null && mounted) {
        // Navigate to graduation screen after a short delay
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) context.push('/graduation');
        });
      }
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_paid) return _buildPaymentSuccess();
    if (_purchased) return _buildTokenDelivered();
    if (_payingExisting) return _buildPayExisting();
    return _buildPurchaseForm();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Purchase form
  // ═════════════════════════════════════════════════════════════════════════

  Widget _buildPurchaseForm() {
    final meter = ref.watch(selectedMeterProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Get Now, Pay in 24hrs')),
      body: LoadingOverlay(
        isLoading: _loading,
        message: 'Getting your tokens...',
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_error != null) ...[
              ErrorBanner(message: _error!),
              const SizedBox(height: 12),
            ],

            // Meter info
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.navyLight,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  CircleAvatar(radius: 18, backgroundColor: AppColors.white,
                      child: BoltIcon(size: 16, color: AppColors.navy)),
                  const SizedBox(width: 12),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Meter', style: TextStyle(fontSize: 11, color: AppColors.grey400)),
                    Text(meter?.meterNumber ?? '—',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.navy)),
                  ]),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Amount selector
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(20)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Text('Electricity Amount',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.navy)),
                const SizedBox(height: 4),
                const Text('Select how much electricity you need (ZMW)',
                    style: TextStyle(fontSize: 11, color: AppColors.grey400)),
                const SizedBox(height: 16),

                // Quick amount buttons
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [20, 50, 100, 150, 200].map((v) {
                    final selected = _amount == v.toDouble();
                    return ChoiceChip(
                      label: Text('ZMW $v'),
                      selected: selected,
                      selectedColor: AppColors.brick,
                      labelStyle: TextStyle(
                        color: selected ? AppColors.white : AppColors.navy,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                      onSelected: (_) => setState(() => _amount = v.toDouble()),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                Slider(
                  value: _amount.clamp(10, 500),
                  min: 10,
                  max: 500,
                  divisions: 49,
                  activeColor: AppColors.brick,
                  label: 'ZMW ${_amount.toInt()}',
                  onChanged: (v) => setState(() => _amount = (v / 10).round() * 10.0),
                ),
                Center(
                  child: Text('ZMW ${_amount.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.navy)),
                ),
                const SizedBox(height: 20),

                // ── Fee breakdown ──────────────────────────────────────
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.grey50,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.grey200),
                  ),
                  child: Column(
                    children: [
                      _feeRow('Electricity', 'ZMW ${_amount.toStringAsFixed(2)}'),
                      const SizedBox(height: 6),
                      _feeRow('Service fee (4%)', 'ZMW ${_serviceFee.toStringAsFixed(2)}'),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Divider(height: 1),
                      ),
                      _feeRow('Total due', 'ZMW ${_total.toStringAsFixed(2)}',
                          bold: true, color: AppColors.brick),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.bolt_rounded, size: 14, color: AppColors.navy),
                          const SizedBox(width: 4),
                          Text('You receive: ${_estimatedKwh.toStringAsFixed(1)} kWh',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.navy)),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                const Row(children: [
                  Icon(Icons.schedule_rounded, size: 14, color: AppColors.grey400),
                  SizedBox(width: 4),
                  Expanded(child: Text(
                    'Tokens delivered instantly. Pay within 48 hours.',
                    style: TextStyle(fontSize: 11, color: AppColors.grey400),
                  )),
                ]),
                const SizedBox(height: 20),

                ElevatedButton(
                  onPressed: _loading ? null : _purchase,
                  child: Text('Get ${_estimatedKwh.toStringAsFixed(0)} kWh Now'),
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
        Text(label, style: TextStyle(fontSize: 13, color: color ?? AppColors.grey700)),
        Text(value, style: TextStyle(
          fontSize: 13,
          fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
          color: color ?? AppColors.navy,
        )),
      ],
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Token delivered — show token + pay buttons
  // ═════════════════════════════════════════════════════════════════════════

  Widget _buildTokenDelivered() {
    final remaining = _dueAt != null
        ? DateTime.tryParse(_dueAt!)?.difference(DateTime.now())
        : null;
    final h = remaining?.inHours ?? 48;
    final m = (remaining?.inMinutes ?? 0) % 60;

    return Scaffold(
      appBar: AppBar(title: const Text('Tokens Delivered')),
      body: LoadingOverlay(
        isLoading: _paying,
        message: 'Processing payment...',
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Success header
            const CircleAvatar(radius: 32, backgroundColor: Color(0xFFDCFCE7),
                child: Icon(Icons.check, size: 36, color: AppColors.green)),
            const SizedBox(height: 12),
            const Center(child: Text('Tokens Delivered!',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.navy))),
            const SizedBox(height: 4),
            Center(child: Text('Enter this token in your meter',
                style: TextStyle(fontSize: 13, color: AppColors.grey400))),
            const SizedBox(height: 20),

            // Token code
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.navyLight, borderRadius: BorderRadius.circular(16)),
              child: Column(children: [
                const Text('YOUR ZESCO TOKEN', style: TextStyle(fontSize: 10, letterSpacing: 1, color: AppColors.grey400)),
                const SizedBox(height: 8),
                Text(_tokenCode ?? '', style: const TextStyle(
                    fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.navy, letterSpacing: 2, fontFamily: 'monospace')),
                const SizedBox(height: 8),
                Text('${_unitsKwh?.toStringAsFixed(1)} kWh',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.navy)),
              ]),
            ),
            const SizedBox(height: 16),

            // Payment due banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.goldLight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.gold.withAlpha(60)),
              ),
              child: Column(
                children: [
                  Row(children: [
                    const Icon(Icons.timer_outlined, color: AppColors.gold, size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(
                      'Pay ZMW ${(_totalDue ?? _total).toStringAsFixed(2)} within ${h}h ${m}m',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.goldDark),
                    )),
                  ]),
                  if (_dueAt != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Due by ${_formatDueDate(_dueAt!)}',
                      style: const TextStyle(fontSize: 11, color: AppColors.goldDark),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            if (_error != null) ...[
              ErrorBanner(message: _error!),
              const SizedBox(height: 12),
            ],

            // Payment methods
            const Text('Pay Now', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.navy)),
            const SizedBox(height: 12),

            _buildPaymentMethod(
              'mtn', 'MTN MoMo', 'M', AppColors.mtnYellow, Colors.black,
              'Dial *115# → Send Money → Enter amount',
            ),
            const SizedBox(height: 10),
            _buildPaymentMethod(
              'airtel', 'Airtel Money', 'A', AppColors.airtelRed, AppColors.white,
              'Dial *778# → Make Payments → Enter amount',
            ),
            const SizedBox(height: 20),

            ElevatedButton(
              onPressed: (_paying || _selectedMethod == null) ? null : () => _payOrder(_orderId!, _totalDue ?? _total),
              child: Text(_selectedMethod == null
                  ? 'Select payment method'
                  : 'Pay ZMW ${(_totalDue ?? _total).toStringAsFixed(2)} via ${_selectedMethod == 'mtn' ? 'MTN MoMo' : 'Airtel Money'}'),
            ),
            const SizedBox(height: 12),
            Center(
              child: TextButton(
                onPressed: () => context.go('/home'),
                child: const Text('Pay Later', style: TextStyle(color: AppColors.grey400)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Pay existing outstanding order
  // ═════════════════════════════════════════════════════════════════════════

  Widget _buildPayExisting() {
    final dash = ref.watch(dashboardProvider).value;
    final order = dash?.outstandingOrder;
    final amount = _existingTotalDue ?? order?.totalDue ?? 0;
    final ordId = _existingOrderId ?? int.tryParse(order?.id ?? '');

    return Scaffold(
      appBar: AppBar(title: const Text('Pay Outstanding')),
      body: LoadingOverlay(
        isLoading: _paying,
        message: 'Processing payment...',
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Amount due
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.brick, AppColors.brickDark]),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Amount Due', style: TextStyle(color: AppColors.brickLight, fontSize: 12)),
                const SizedBox(height: 4),
                Text('ZMW ${amount.toStringAsFixed(2)}',
                    style: const TextStyle(color: AppColors.white, fontSize: 28, fontWeight: FontWeight.w800)),
                if (order?.timeRemaining != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Due in ${order!.timeRemaining!.inHours}h ${order.timeRemaining!.inMinutes % 60}m',
                    style: const TextStyle(color: AppColors.brickLight, fontSize: 13),
                  ),
                ],
              ]),
            ),
            const SizedBox(height: 20),

            if (_error != null) ...[
              ErrorBanner(message: _error!),
              const SizedBox(height: 12),
            ],

            const Text('Select Payment Method',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.navy)),
            const SizedBox(height: 12),

            _buildPaymentMethod(
              'mtn', 'MTN MoMo', 'M', AppColors.mtnYellow, Colors.black,
              'Dial *115# → Send Money → Enter amount',
            ),
            const SizedBox(height: 10),
            _buildPaymentMethod(
              'airtel', 'Airtel Money', 'A', AppColors.airtelRed, AppColors.white,
              'Dial *778# → Make Payments → Enter amount',
            ),
            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: (_paying || _selectedMethod == null || ordId == null)
                  ? null
                  : () => _payOrder(ordId, amount),
              child: Text(_selectedMethod == null
                  ? 'Select payment method'
                  : 'Pay ZMW ${amount.toStringAsFixed(2)} Now'),
            ),
            const SizedBox(height: 12),
            Center(
              child: TextButton(
                onPressed: () {
                  setState(() => _payingExisting = false);
                },
                child: const Text('Buy More Electricity Instead', style: TextStyle(color: AppColors.brick)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Payment success
  // ═════════════════════════════════════════════════════════════════════════

  Widget _buildPaymentSuccess() {
    return Scaffold(
      appBar: AppBar(title: const Text('Payment Complete')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircleAvatar(radius: 32, backgroundColor: Color(0xFFDCFCE7),
                  child: Icon(Icons.check, size: 36, color: AppColors.green)),
              const SizedBox(height: 16),
              const Text('Payment Successful',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.navy)),
              const SizedBox(height: 8),
              const Text('Your trade credit has been settled.',
                  style: TextStyle(color: AppColors.grey400, fontSize: 13)),
              const SizedBox(height: 24),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.navyLight, borderRadius: BorderRadius.circular(16)),
                child: Column(children: [
                  _receiptRow('Amount Paid', 'ZMW ${(_totalDue ?? _existingTotalDue ?? 0).toStringAsFixed(2)}'),
                  _receiptRow('Method', _selectedMethod == 'mtn' ? 'MTN MoMo' : 'Airtel Money'),
                  if (_paymentRef != null) _receiptRow('Reference', _paymentRef!),
                ]),
              ),
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

  // ── Helpers ────────────────────────────────────────────────────────────

  Widget _buildPaymentMethod(
    String value, String label, String initial,
    Color bgColor, Color textColor, String ussdCode,
  ) {
    final selected = _selectedMethod == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedMethod = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: selected ? bgColor : AppColors.grey200, width: selected ? 2 : 1),
          color: selected ? bgColor.withAlpha(20) : AppColors.white,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            CircleAvatar(radius: 20, backgroundColor: bgColor,
                child: Text(initial, style: TextStyle(fontWeight: FontWeight.w800, color: textColor, fontSize: 18))),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.navy)),
              const SizedBox(height: 2),
              Text(ussdCode, style: const TextStyle(fontSize: 11, color: AppColors.grey400)),
            ])),
            if (selected)
              Icon(Icons.check_circle, size: 22, color: bgColor),
          ],
        ),
      ),
    );
  }

  Widget _receiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: const TextStyle(color: AppColors.grey400, fontSize: 13)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.navy)),
      ]),
    );
  }

  String _formatDueDate(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    final now = DateTime.now();
    final tomorrow = DateTime(now.year, now.month, now.day + 1);
    final dayLabel = dt.day == tomorrow.day && dt.month == tomorrow.month
        ? 'tomorrow' : '${dt.day}/${dt.month}/${dt.year}';
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')} $dayLabel';
  }
}

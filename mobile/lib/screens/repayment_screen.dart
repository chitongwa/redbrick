import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../services/api_client.dart';
import '../widgets/error_banner.dart';
import '../widgets/loading_overlay.dart';

class RepaymentScreen extends ConsumerStatefulWidget {
  final int loanId;
  final double outstanding;

  const RepaymentScreen({super.key, required this.loanId, required this.outstanding});

  @override
  ConsumerState<RepaymentScreen> createState() => _RepaymentScreenState();
}

class _RepaymentScreenState extends ConsumerState<RepaymentScreen> {
  final _amountCtl = TextEditingController();
  String? _method;
  bool _loading = false;
  String? _error;
  bool _paid = false;
  String? _reference;
  double _remaining = 0;

  @override
  void initState() {
    super.initState();
    _remaining = widget.outstanding;
  }

  @override
  void dispose() {
    _amountCtl.dispose();
    super.dispose();
  }

  void _setQuick(double fraction) {
    _amountCtl.text = (widget.outstanding * fraction).toStringAsFixed(2);
  }

  Future<void> _pay() async {
    final amount = double.tryParse(_amountCtl.text);
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Enter a valid amount');
      return;
    }
    if (_method == null) {
      setState(() => _error = 'Select a payment method');
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiClient.instance.repay(widget.loanId, amount, _method!);
      final data = res.data as Map<String, dynamic>;
      setState(() {
        _paid = true;
        _reference = data['payment_reference'] as String?;
        _remaining = (data['loan_remaining'] as num).toDouble();
      });
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_paid) return _buildSuccess(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Repayment')),
      body: LoadingOverlay(
        isLoading: _loading,
        message: 'Processing payment...',
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Outstanding card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.brick, AppColors.brickDark]),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Outstanding Balance', style: TextStyle(color: AppColors.brickLight, fontSize: 12)),
                const SizedBox(height: 4),
                Text('ZMW ${widget.outstanding.toStringAsFixed(2)}',
                    style: const TextStyle(color: AppColors.white, fontSize: 28, fontWeight: FontWeight.w800)),
              ]),
            ),
            const SizedBox(height: 16),

            if (_error != null) ErrorBanner(message: _error!),

            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(20)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                // Amount
                TextField(
                  controller: _amountCtl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.navy),
                  decoration: const InputDecoration(labelText: 'Payment Amount (ZMW)'),
                ),
                const SizedBox(height: 12),

                // Quick fills
                Row(children: [
                  _quickBtn('25%', () => _setQuick(0.25)),
                  const SizedBox(width: 6),
                  _quickBtn('50%', () => _setQuick(0.50)),
                  const SizedBox(width: 6),
                  _quickBtn('75%', () => _setQuick(0.75)),
                  const SizedBox(width: 6),
                  _quickBtn('Full', () => _setQuick(1.0)),
                ]),
                const SizedBox(height: 20),

                // Method
                const Text('Payment Method', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.navy)),
                const SizedBox(height: 12),
                Row(children: [
                  _methodBtn('mtn', 'MTN MoMo', 'M', AppColors.mtnYellow, Colors.black),
                  const SizedBox(width: 12),
                  _methodBtn('airtel', 'Airtel Money', 'A', AppColors.airtelRed, AppColors.white),
                ]),
                const SizedBox(height: 24),

                ElevatedButton(
                  onPressed: _loading ? null : _pay,
                  child: const Text('Pay Now'),
                ),
              ]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _quickBtn(String label, VoidCallback onTap) {
    return Expanded(
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 10),
          side: const BorderSide(color: AppColors.grey200),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.navy)),
      ),
    );
  }

  Widget _methodBtn(String value, String label, String initial, Color bgColor, Color textColor) {
    final selected = _method == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _method = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(color: selected ? bgColor : AppColors.grey200, width: selected ? 2 : 1),
            color: selected ? bgColor.withAlpha(25) : AppColors.white,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(children: [
            CircleAvatar(radius: 20, backgroundColor: bgColor,
                child: Text(initial, style: TextStyle(fontWeight: FontWeight.w800, color: textColor))),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            if (selected) ...[
              const SizedBox(height: 4),
              Icon(Icons.check_circle, size: 18, color: bgColor),
            ],
          ]),
        ),
      ),
    );
  }

  Widget _buildSuccess(BuildContext context) {
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
              const Text('Payment Successful', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.navy)),
              const SizedBox(height: 8),
              const Text('Your credit has been restored.',
                  style: TextStyle(color: AppColors.grey400, fontSize: 13)),
              const SizedBox(height: 24),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.navyLight, borderRadius: BorderRadius.circular(16)),
                child: Column(children: [
                  _receiptRow('Amount Paid', 'ZMW ${_amountCtl.text}'),
                  _receiptRow('Method', _method == 'mtn' ? 'MTN MoMo' : 'Airtel Money'),
                  _receiptRow('Remaining', 'ZMW ${_remaining.toStringAsFixed(2)}'),
                  if (_reference != null) _receiptRow('Reference', _reference!),
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

  Widget _receiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: const TextStyle(color: AppColors.grey400, fontSize: 13)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.navy)),
      ]),
    );
  }
}

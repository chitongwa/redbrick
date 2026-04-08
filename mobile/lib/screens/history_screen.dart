import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../models/transaction.dart';
import '../providers/meter_provider.dart';
import '../services/api_client.dart';
import '../widgets/bolt_icon.dart';
import '../widgets/error_banner.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  List<Transaction> _txs = [];
  bool _loading = true;
  String? _error;
  int _total = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final meter = ref.read(selectedMeterProvider);
    if (meter == null) return;

    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiClient.instance.getTransactions(meter.id, limit: 50);
      final data = res.data as Map<String, dynamic>;
      final list = (data['transactions'] as List)
          .map((e) => Transaction.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      setState(() {
        _txs = list;
        _total = (data['pagination'] as Map)['total'] as int;
      });
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final meter = ref.watch(selectedMeterProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Transaction History')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.brick))
          : _error != null
              ? Padding(
                  padding: const EdgeInsets.all(16),
                  child: ErrorBanner(message: _error!, onRetry: _load),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _txs.length + 1, // +1 for header
                    itemBuilder: (ctx, i) {
                      if (i == 0) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text('$_total transactions',
                              style: const TextStyle(color: AppColors.grey400, fontSize: 13)),
                        );
                      }
                      final tx = _txs[i - 1];
                      final isEven = (i - 1) % 2 == 0;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 2),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isEven ? AppColors.white : AppColors.navyLight,
                          borderRadius: i == 1
                              ? const BorderRadius.vertical(top: Radius.circular(16))
                              : i == _txs.length
                                  ? const BorderRadius.vertical(bottom: Radius.circular(16))
                                  : BorderRadius.zero,
                        ),
                        child: Row(children: [
                          CircleAvatar(
                            radius: 16,
                            backgroundColor: AppColors.navyLight,
                            child: BoltIcon(size: 14, color: AppColors.navy),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text('ZMW ${tx.amountZmw.toStringAsFixed(2)}',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.navy)),
                              const SizedBox(height: 2),
                              Text('${tx.unitsPurchased.toStringAsFixed(1)} kWh',
                                  style: const TextStyle(fontSize: 11, color: AppColors.grey400)),
                              Text('Meter: ${meter?.meterNumber ?? '—'}',
                                  style: const TextStyle(fontSize: 11, color: AppColors.grey400)),
                              Text(tx.purchasedAt.substring(0, 10),
                                  style: const TextStyle(fontSize: 11, color: AppColors.grey400)),
                            ]),
                          ),
                          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF0FDF4),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(tx.source == 'redbrick' ? 'RedBrick' : 'ZESCO',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: tx.source == 'redbrick' ? AppColors.brick : AppColors.green,
                                  )),
                            ),
                            const SizedBox(height: 6),
                            GestureDetector(
                              onTap: () => context.push('/pay-later'),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: AppColors.brick,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Text('Buy Again',
                                    style: TextStyle(color: AppColors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                              ),
                            ),
                          ]),
                        ]),
                      );
                    },
                  ),
                ),
    );
  }
}

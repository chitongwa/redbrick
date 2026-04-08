import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';

/// Dashboard data: balance, credit limit, recent transactions.
final dashboardProvider =
    StateNotifierProvider<DashboardNotifier, AsyncValue<DashboardData>>((ref) {
  return DashboardNotifier();
});

class DashboardData {
  final double balanceZmw;
  final double unitsKwh;
  final double creditLimit;
  final double availableCredit;
  final double outstandingBorrowed;
  final List<Map<String, dynamic>> recentTransactions;

  DashboardData({
    required this.balanceZmw,
    required this.unitsKwh,
    required this.creditLimit,
    required this.availableCredit,
    required this.outstandingBorrowed,
    required this.recentTransactions,
  });
}

class DashboardNotifier extends StateNotifier<AsyncValue<DashboardData>> {
  DashboardNotifier() : super(const AsyncValue.loading());

  final _api = ApiClient.instance;

  Future<void> load(int meterId) async {
    state = const AsyncValue.loading();
    try {
      final results = await Future.wait([
        _api.getMeterBalance(meterId),
        _api.getCreditLimit(meterId),
        _api.getTransactions(meterId, limit: 3),
      ]);

      final balance = results[0].data as Map<String, dynamic>;
      final credit = results[1].data as Map<String, dynamic>;
      final txData = results[2].data as Map<String, dynamic>;

      final txList = (txData['transactions'] as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();

      state = AsyncValue.data(DashboardData(
        balanceZmw: (balance['balance_zmw'] as num).toDouble(),
        unitsKwh: (balance['units_kwh'] as num).toDouble(),
        creditLimit: (credit['credit_limit'] as num? ?? 0).toDouble(),
        availableCredit: (credit['available_credit'] as num? ?? 0).toDouble(),
        outstandingBorrowed: (credit['outstanding_borrowed'] as num? ?? 0).toDouble(),
        recentTransactions: txList,
      ));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

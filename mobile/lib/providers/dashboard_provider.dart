import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';
import '../models/trade_credit_order.dart';

/// Dashboard data: balance, credit limit, tier info, outstanding orders.
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

  // Tier info (from /users/me)
  final String tier;
  final int tradeCreditTransactions;
  final int tradeCreditDefaultCount;
  final bool accountFrozen;

  // Outstanding trade credit order (if any)
  final TradeCreditOrder? outstandingOrder;

  DashboardData({
    required this.balanceZmw,
    required this.unitsKwh,
    required this.creditLimit,
    required this.availableCredit,
    required this.outstandingBorrowed,
    required this.recentTransactions,
    this.tier = 'trade_credit',
    this.tradeCreditTransactions = 0,
    this.tradeCreditDefaultCount = 0,
    this.accountFrozen = false,
    this.outstandingOrder,
  });

  bool get isTier2 => tier == 'loan_credit';
  bool get isTier1 => !isTier2;
  int get graduationProgress => tradeCreditTransactions.clamp(0, 6);
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
        _api.getMe(),
        _api.getTradeCreditOrders(limit: 5),
      ]);

      final balance = results[0].data as Map<String, dynamic>;
      final credit = results[1].data as Map<String, dynamic>;
      final txData = results[2].data as Map<String, dynamic>;
      final userData = results[3].data as Map<String, dynamic>;
      final ordersData = results[4].data as Map<String, dynamic>;

      final txList = (txData['transactions'] as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();

      // Find pending outstanding trade credit order
      TradeCreditOrder? outstandingOrder;
      final orders = ordersData['orders'] as List? ?? [];
      for (final o in orders) {
        final order = TradeCreditOrder.fromJson(Map<String, dynamic>.from(o as Map));
        if (order.isPending) {
          outstandingOrder = order;
          break;
        }
      }

      // User data might be nested under 'user' key or be flat
      final user = userData.containsKey('user')
          ? userData['user'] as Map<String, dynamic>
          : userData;

      state = AsyncValue.data(DashboardData(
        balanceZmw: (balance['balance_zmw'] as num).toDouble(),
        unitsKwh: (balance['units_kwh'] as num).toDouble(),
        creditLimit: (credit['credit_limit'] as num? ?? 0).toDouble(),
        availableCredit: (credit['available_credit'] as num? ?? 0).toDouble(),
        outstandingBorrowed: (credit['outstanding_borrowed'] as num? ?? 0).toDouble(),
        recentTransactions: txList,
        tier: user['tier'] as String? ?? 'trade_credit',
        tradeCreditTransactions: user['trade_credit_transactions'] as int? ?? 0,
        tradeCreditDefaultCount: user['trade_credit_default_count'] as int? ?? 0,
        accountFrozen: user['account_frozen'] as bool? ?? false,
        outstandingOrder: outstandingOrder,
      ));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

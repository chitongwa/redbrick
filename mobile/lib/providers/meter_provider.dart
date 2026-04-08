import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';
import '../models/meter.dart';

/// Holds the user's list of meters.
final meterListProvider = StateNotifierProvider<MeterListNotifier, AsyncValue<List<Meter>>>((ref) {
  return MeterListNotifier();
});

/// Currently selected meter (for Pay Later, History, etc.)
final selectedMeterProvider = StateProvider<Meter?>((ref) => null);

class MeterListNotifier extends StateNotifier<AsyncValue<List<Meter>>> {
  MeterListNotifier() : super(const AsyncValue.data([]));

  final _api = ApiClient.instance;

  Future<Meter?> addMeter(String meterNumber) async {
    try {
      final res = await _api.addMeter(meterNumber);
      final data = res.data as Map<String, dynamic>;
      final meter = Meter.fromJson(data['meter'] as Map<String, dynamic>);
      final current = state.value ?? [];
      state = AsyncValue.data([...current, meter]);
      return meter;
    } catch (e) {
      rethrow;
    }
  }
}

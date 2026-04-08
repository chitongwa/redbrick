import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';
import '../services/secure_storage.dart';
import '../models/user.dart';

/// Authentication state — null means logged out.
final authProvider = StateNotifierProvider<AuthNotifier, AsyncValue<User?>>((ref) {
  return AuthNotifier();
});

class AuthNotifier extends StateNotifier<AsyncValue<User?>> {
  AuthNotifier() : super(const AsyncValue.data(null));

  final _api = ApiClient.instance;

  /// Check for existing session on app start.
  Future<void> tryRestore() async {
    final hasToken = await SecureStorage.hasToken();
    if (!hasToken) {
      state = const AsyncValue.data(null);
      return;
    }
    final name = await SecureStorage.getUserName() ?? '';
    final phone = await SecureStorage.getUserPhone() ?? '';
    final id = int.tryParse(await SecureStorage.getUserId() ?? '') ?? 0;
    state = AsyncValue.data(User(id: id, phoneNumber: phone, fullName: name, kycStatus: 'verified'));
  }

  Future<void> requestOtp(String phone) async {
    state = const AsyncValue.loading();
    try {
      await _api.requestOtp(phone);
      state = const AsyncValue.data(null); // still logged out, OTP sent
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<bool> verifyOtp(String phone, String otp) async {
    state = const AsyncValue.loading();
    try {
      final res = await _api.verifyOtp(phone, otp);
      final data = res.data as Map<String, dynamic>;
      final token = data['token'] as String;
      final user = User.fromJson(data['user'] as Map<String, dynamic>);

      await SecureStorage.saveToken(token);
      await SecureStorage.saveUser(
        id: user.id,
        phone: user.phoneNumber,
        name: user.fullName,
      );

      state = AsyncValue.data(user);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<void> logout() async {
    await SecureStorage.clearAll();
    state = const AsyncValue.data(null);
  }
}

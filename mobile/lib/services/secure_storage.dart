import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Wrapper around flutter_secure_storage for JWT + user data.
class SecureStorage {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'jwt_token';
  static const _userIdKey = 'user_id';
  static const _phoneKey = 'user_phone';
  static const _nameKey = 'user_name';

  // ── Token ──
  static Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  static Future<String?> getToken() =>
      _storage.read(key: _tokenKey);

  static Future<bool> hasToken() async =>
      (await _storage.read(key: _tokenKey)) != null;

  // ── User info ──
  static Future<void> saveUser({
    required int id,
    required String phone,
    required String name,
  }) async {
    await _storage.write(key: _userIdKey, value: id.toString());
    await _storage.write(key: _phoneKey, value: phone);
    await _storage.write(key: _nameKey, value: name);
  }

  static Future<String?> getUserName() => _storage.read(key: _nameKey);
  static Future<String?> getUserPhone() => _storage.read(key: _phoneKey);
  static Future<String?> getUserId() => _storage.read(key: _userIdKey);

  // ── Clear all ──
  static Future<void> clearAll() => _storage.deleteAll();
}

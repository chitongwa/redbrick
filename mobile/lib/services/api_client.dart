import 'package:dio/dio.dart';
import '../config/api.dart';
import 'secure_storage.dart';

/// Singleton API client with automatic JWT injection.
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  final Dio _dio = Dio(BaseOptions(
    baseUrl: apiBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'Content-Type': 'application/json'},
  ));

  Dio get dio => _dio;

  /// Attach the stored JWT to every request.
  Future<void> _injectToken() async {
    final token = await SecureStorage.getToken();
    if (token != null) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────

  Future<Response> requestOtp(String phone) =>
      _dio.post('/auth/request-otp', data: {'phone_number': phone});

  Future<Response> verifyOtp(String phone, String otp) =>
      _dio.post('/auth/verify-otp', data: {
        'phone_number': phone,
        'otp': otp,
      });

  // ── Users ─────────────────────────────────────────────────────────────

  Future<Response> getMe() async {
    await _injectToken();
    return _dio.get('/users/me');
  }

  // ── Meters ────────────────────────────────────────────────────────────

  Future<Response> addMeter(String meterNumber) async {
    await _injectToken();
    return _dio.post('/meters/add', data: {'meter_number': meterNumber});
  }

  Future<Response> getMeterBalance(int meterId) async {
    await _injectToken();
    return _dio.get('/meters/$meterId/balance');
  }

  Future<Response> getCreditLimit(int meterId) async {
    await _injectToken();
    return _dio.get('/meters/$meterId/credit-limit');
  }

  Future<Response> getTransactions(int meterId, {int page = 1, int limit = 20}) async {
    await _injectToken();
    return _dio.get('/meters/$meterId/transactions', queryParameters: {
      'page': page,
      'limit': limit,
    });
  }

  // ── Trade Credit (Tier 1) ────────────────────────────────────────────

  Future<Response> purchaseTradeCredit(int meterId, double amount) async {
    await _injectToken();
    return _dio.post('/trade-credit/purchase', data: {
      'meter_id': meterId,
      'amount': amount,
    });
  }

  Future<Response> payTradeCredit(int orderId, String method) async {
    await _injectToken();
    return _dio.post('/trade-credit/pay', data: {
      'order_id': orderId,
      'payment_method': method,
    });
  }

  Future<Response> getTradeCreditOrders({int page = 1, int limit = 20}) async {
    await _injectToken();
    return _dio.get('/trade-credit/orders', queryParameters: {
      'page': page,
      'limit': limit,
    });
  }

  // ── Loans (Tier 2) ───────────────────────────────────────────────────

  Future<Response> borrow(int meterId, double amount) async {
    await _injectToken();
    return _dio.post('/loans/borrow', data: {
      'meter_id': meterId,
      'amount': amount,
    });
  }

  Future<Response> getLoan(int loanId) async {
    await _injectToken();
    return _dio.get('/loans/$loanId');
  }

  // ── Repayments ────────────────────────────────────────────────────────

  Future<Response> repay(int loanId, double amount, String method) async {
    await _injectToken();
    return _dio.post('/repayments/pay', data: {
      'loan_id': loanId,
      'amount': amount,
      'payment_method': method,
    });
  }

  // ── Pricing ───────────────────────────────────────────────────────────

  Future<Response> getPricingPreview(double amount, {String? userId}) async {
    if (userId != null) {
      return _dio.get('/pricing/preview/$amount/$userId');
    }
    return _dio.get('/pricing/preview/$amount');
  }

  Future<Response> calculatePricing(String tier, double amount, {String? userId}) async {
    return _dio.post('/pricing/calculate', data: {
      'tier': tier,
      'amount': amount,
      if (userId != null) 'user_id': userId,
    });
  }

  // ── Graduation ────────────────────────────────────────────────────────

  Future<Response> getGraduationStatus(String userId) async {
    await _injectToken();
    return _dio.get('/graduation/status/$userId');
  }
}

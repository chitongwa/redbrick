class User {
  final int id;
  final String phoneNumber;
  final String fullName;
  final String kycStatus;
  final String tier;
  final int tradeCreditTransactions;
  final int tradeCreditDefaultCount;
  final bool accountFrozen;

  User({
    required this.id,
    required this.phoneNumber,
    required this.fullName,
    required this.kycStatus,
    this.tier = 'trade_credit',
    this.tradeCreditTransactions = 0,
    this.tradeCreditDefaultCount = 0,
    this.accountFrozen = false,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] is int ? json['id'] as int : int.tryParse(json['id'].toString()) ?? 0,
      phoneNumber: json['phone_number'] as String? ?? '',
      fullName: json['full_name'] as String? ?? '',
      kycStatus: json['kyc_status'] as String? ?? 'unknown',
      tier: json['tier'] as String? ?? 'trade_credit',
      tradeCreditTransactions: json['trade_credit_transactions'] as int? ?? 0,
      tradeCreditDefaultCount: json['trade_credit_default_count'] as int? ?? 0,
      accountFrozen: json['account_frozen'] as bool? ?? false,
    );
  }

  bool get isTier2 => tier == 'loan_credit';
  bool get isTier1 => !isTier2;
  int get graduationProgress => tradeCreditTransactions.clamp(0, 6);
  bool get graduationReady => tradeCreditTransactions >= 6;
}

class TradeCreditOrder {
  final String id;
  final double electricityAmt;
  final double serviceFee;
  final double totalDue;
  final double? unitsKwh;
  final String? tokenDelivered;
  final String status;
  final String? paymentDueAt;
  final String? createdAt;
  final String? paidAt;
  final double? hoursToPay;

  TradeCreditOrder({
    required this.id,
    required this.electricityAmt,
    required this.serviceFee,
    required this.totalDue,
    this.unitsKwh,
    this.tokenDelivered,
    required this.status,
    this.paymentDueAt,
    this.createdAt,
    this.paidAt,
    this.hoursToPay,
  });

  factory TradeCreditOrder.fromJson(Map<String, dynamic> json) {
    return TradeCreditOrder(
      id: json['id'].toString(),
      electricityAmt: (json['electricity_amt'] as num? ?? 0).toDouble(),
      serviceFee: (json['service_fee'] as num? ?? 0).toDouble(),
      totalDue: (json['total_due'] as num? ?? 0).toDouble(),
      unitsKwh: (json['units_kwh'] as num?)?.toDouble(),
      tokenDelivered: json['token_delivered'] as String?,
      status: json['status'] as String? ?? 'unknown',
      paymentDueAt: json['payment_due_at'] as String?,
      createdAt: json['created_at'] as String?,
      paidAt: json['paid_at'] as String?,
      hoursToPay: (json['hours_to_pay'] as num?)?.toDouble(),
    );
  }

  bool get isPending =>
      status == 'pending_payment' || status == 'token_delivered';

  bool get isOverdue {
    if (paymentDueAt == null || !isPending) return false;
    return DateTime.tryParse(paymentDueAt!)?.isBefore(DateTime.now()) ?? false;
  }

  Duration? get timeRemaining {
    if (paymentDueAt == null) return null;
    final due = DateTime.tryParse(paymentDueAt!);
    if (due == null) return null;
    final diff = due.difference(DateTime.now());
    return diff.isNegative ? Duration.zero : diff;
  }
}

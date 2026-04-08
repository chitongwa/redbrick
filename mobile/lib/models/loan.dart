class Loan {
  final int id;
  final int meterId;
  final String? meterNumber;
  final double amountBorrowed;
  final String? tokenDelivered;
  final String status;
  final String createdAt;
  final String dueDate;
  final String? repaidAt;

  Loan({
    required this.id,
    required this.meterId,
    this.meterNumber,
    required this.amountBorrowed,
    this.tokenDelivered,
    required this.status,
    required this.createdAt,
    required this.dueDate,
    this.repaidAt,
  });

  factory Loan.fromJson(Map<String, dynamic> json) {
    return Loan(
      id: json['id'] as int,
      meterId: json['meter_id'] as int,
      meterNumber: json['meter_number'] as String?,
      amountBorrowed: (json['amount_borrowed'] as num).toDouble(),
      tokenDelivered: json['token_delivered'] as String?,
      status: json['status'] as String,
      createdAt: json['created_at'] as String,
      dueDate: json['due_date'] as String,
      repaidAt: json['repaid_at'] as String?,
    );
  }

  bool get isActive => status == 'active' || status == 'pending';
}

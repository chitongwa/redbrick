class Transaction {
  final int id;
  final double amountZmw;
  final double unitsPurchased;
  final String purchasedAt;
  final String source;

  Transaction({
    required this.id,
    required this.amountZmw,
    required this.unitsPurchased,
    required this.purchasedAt,
    required this.source,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as int,
      amountZmw: (json['amount_zmw'] as num).toDouble(),
      unitsPurchased: (json['units_purchased'] as num).toDouble(),
      purchasedAt: json['purchased_at'] as String,
      source: json['source'] as String,
    );
  }
}

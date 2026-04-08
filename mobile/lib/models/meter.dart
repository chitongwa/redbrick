class Meter {
  final int id;
  final String meterNumber;
  final bool zescoVerified;

  Meter({
    required this.id,
    required this.meterNumber,
    required this.zescoVerified,
  });

  factory Meter.fromJson(Map<String, dynamic> json) {
    return Meter(
      id: json['id'] as int,
      meterNumber: json['meter_number'] as String,
      zescoVerified: json['zesco_verified'] as bool,
    );
  }
}

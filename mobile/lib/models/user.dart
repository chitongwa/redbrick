class User {
  final int id;
  final String phoneNumber;
  final String fullName;
  final String kycStatus;

  User({
    required this.id,
    required this.phoneNumber,
    required this.fullName,
    required this.kycStatus,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as int,
      phoneNumber: json['phone_number'] as String,
      fullName: json['full_name'] as String,
      kycStatus: json['kyc_status'] as String,
    );
  }
}

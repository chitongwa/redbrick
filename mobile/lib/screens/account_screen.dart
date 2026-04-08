import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/meter_provider.dart';
import '../widgets/bolt_icon.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final meters = ref.watch(meterListProvider).value ?? [];
    final user = authState.value;

    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profile card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(20)),
            child: Row(children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: AppColors.navyLight,
                child: Text(
                  (user?.fullName ?? '?')[0].toUpperCase(),
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.navy),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(user?.fullName ?? 'Customer',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.navy)),
                  const SizedBox(height: 4),
                  Text(user?.phoneNumber ?? '',
                      style: const TextStyle(color: AppColors.grey400, fontSize: 13)),
                  const SizedBox(height: 2),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: user?.kycStatus == 'verified' ? const Color(0xFFF0FDF4) : AppColors.brickLight,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'KYC: ${user?.kycStatus ?? 'unknown'}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: user?.kycStatus == 'verified' ? AppColors.green : AppColors.brick,
                      ),
                    ),
                  ),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 24),

          // Meters
          const Text('REGISTERED METERS',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.navy, letterSpacing: 1)),
          const SizedBox(height: 8),

          if (meters.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(16)),
              child: const Center(child: Text('No meters registered', style: TextStyle(color: AppColors.grey400))),
            )
          else
            ...meters.map((m) {
              final isSelected = ref.read(selectedMeterProvider)?.id == m.id;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: isSelected ? Border.all(color: AppColors.brick, width: 2) : null,
                ),
                child: Row(children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: AppColors.navyLight,
                    child: BoltIcon(size: 16, color: AppColors.navy),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(m.meterNumber,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.navy)),
                      Text(
                        m.zescoVerified ? 'Verified' : 'Pending verification',
                        style: TextStyle(
                          fontSize: 11,
                          color: m.zescoVerified ? AppColors.green : AppColors.grey400,
                        ),
                      ),
                    ]),
                  ),
                  if (isSelected)
                    const Icon(Icons.check_circle, color: AppColors.brick, size: 20)
                  else
                    TextButton(
                      onPressed: () => ref.read(selectedMeterProvider.notifier).state = m,
                      child: const Text('Select', style: TextStyle(color: AppColors.brick, fontSize: 12)),
                    ),
                ]),
              );
            }),

          const SizedBox(height: 32),

          // Logout
          OutlinedButton.icon(
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/onboarding');
            },
            icon: const Icon(Icons.logout, color: AppColors.brick),
            label: const Text('Log Out', style: TextStyle(color: AppColors.brick)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.brick),
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}

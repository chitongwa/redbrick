import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await Future.delayed(const Duration(seconds: 2));
    await ref.read(authProvider.notifier).tryRestore();
    if (!mounted) return;
    final user = ref.read(authProvider).value;
    if (user != null) {
      context.go('/home');
    } else {
      context.go('/onboarding');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.bolt_rounded, size: 64, color: AppColors.brick),
            const SizedBox(height: 16),
            RichText(
              text: const TextSpan(
                style: TextStyle(fontSize: 36, fontWeight: FontWeight.w800),
                children: [
                  TextSpan(text: 'Red', style: TextStyle(color: AppColors.white)),
                  TextSpan(text: 'Brick', style: TextStyle(color: AppColors.brick)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Electricity credit, instantly',
              style: TextStyle(color: AppColors.grey400, fontSize: 14),
            ),
            const SizedBox(height: 48),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: AppColors.brick,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

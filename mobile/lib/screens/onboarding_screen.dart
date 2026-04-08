import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/meter_provider.dart';
import '../widgets/error_banner.dart';
import '../widgets/loading_overlay.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _meterCtl = TextEditingController();
  final _phoneCtl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _meterCtl.dispose();
    _phoneCtl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final meter = _meterCtl.text.trim();
    final phone = _phoneCtl.text.trim();
    if (meter.isEmpty || phone.isEmpty) {
      setState(() => _error = 'Please fill in both fields');
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).requestOtp(phone);
      if (!mounted) return;
      context.push('/otp', extra: {'phone': phone, 'meter': meter});
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: LoadingOverlay(
        isLoading: _loading,
        message: 'Sending OTP...',
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 48),
                // Logo
                Center(
                  child: Column(
                    children: [
                      const Icon(Icons.bolt_rounded, size: 48, color: AppColors.brick),
                      const SizedBox(height: 8),
                      RichText(
                        text: const TextSpan(
                          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                          children: [
                            TextSpan(text: 'Red', style: TextStyle(color: AppColors.white)),
                            TextSpan(text: 'Brick', style: TextStyle(color: AppColors.brick)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Electricity credit, instantly',
                        style: TextStyle(color: AppColors.grey400, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 48),

                // Card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Get started',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.navy),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Enter your ZESCO meter number and phone number.',
                        style: TextStyle(color: AppColors.grey400, fontSize: 13),
                      ),
                      const SizedBox(height: 20),

                      if (_error != null) ErrorBanner(message: _error!),

                      TextField(
                        controller: _meterCtl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Meter Number',
                          hintText: 'e.g. 12345678',
                          prefixIcon: Icon(Icons.electric_meter_outlined),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _phoneCtl,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Phone Number',
                          hintText: '+260 97X XXX XXX',
                          prefixIcon: Icon(Icons.phone_outlined),
                        ),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        child: const Text('Send OTP'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

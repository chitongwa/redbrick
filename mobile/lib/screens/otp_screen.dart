import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/meter_provider.dart';
import '../widgets/error_banner.dart';
import '../widgets/loading_overlay.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String phone;
  final String meter;

  const OtpScreen({super.key, required this.phone, required this.meter});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final List<TextEditingController> _controllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  bool _loading = false;
  String? _error;
  int _resendCooldown = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startCooldown();
  }

  void _startCooldown() {
    _resendCooldown = 60;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_resendCooldown <= 0) {
        t.cancel();
      } else {
        setState(() => _resendCooldown--);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _otp => _controllers.map((c) => c.text).join();

  Future<void> _verify() async {
    if (_otp.length < 6) {
      setState(() => _error = 'Please enter all 6 digits');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final ok = await ref.read(authProvider.notifier).verifyOtp(widget.phone, _otp);
      if (!ok || !mounted) return;

      // Add meter
      try {
        final meter = await ref.read(meterListProvider.notifier).addMeter(widget.meter);
        if (meter != null) {
          ref.read(selectedMeterProvider.notifier).state = meter;
        }
      } catch (_) {
        // Meter may already exist — continue to home
      }

      if (mounted) context.go('/home');
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    if (_resendCooldown > 0) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).requestOtp(widget.phone);
      _startCooldown();
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
        message: 'Verifying...',
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 48),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.sms_outlined, size: 48, color: AppColors.navy),
                      const SizedBox(height: 16),
                      const Text(
                        'Verify your number',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.navy),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'We sent a 6-digit code to ${widget.phone}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.grey400, fontSize: 13),
                      ),
                      const SizedBox(height: 24),

                      if (_error != null) ErrorBanner(message: _error!),

                      // OTP boxes
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(6, (i) {
                          return Container(
                            width: 44,
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            child: TextField(
                              controller: _controllers[i],
                              focusNode: _focusNodes[i],
                              keyboardType: TextInputType.number,
                              textAlign: TextAlign.center,
                              maxLength: 1,
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                              decoration: const InputDecoration(counterText: ''),
                              onChanged: (v) {
                                if (v.isNotEmpty && i < 5) _focusNodes[i + 1].requestFocus();
                                if (v.isEmpty && i > 0) _focusNodes[i - 1].requestFocus();
                              },
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 24),

                      ElevatedButton(
                        onPressed: _loading ? null : _verify,
                        child: const Text('Verify & Continue'),
                      ),
                      const SizedBox(height: 16),

                      TextButton(
                        onPressed: _resendCooldown > 0 ? null : _resend,
                        child: Text(
                          _resendCooldown > 0
                              ? 'Resend in ${_resendCooldown}s'
                              : 'Resend code',
                          style: TextStyle(
                            color: _resendCooldown > 0 ? AppColors.grey400 : AppColors.brick,
                          ),
                        ),
                      ),

                      TextButton(
                        onPressed: () => context.pop(),
                        child: const Text('← Change number',
                            style: TextStyle(color: AppColors.navy)),
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

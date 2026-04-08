import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../widgets/tier_badge.dart';

/// Congratulations screen shown when a user graduates from Tier 1 to Tier 2.
class GraduationScreen extends StatefulWidget {
  final double? creditLimit;

  const GraduationScreen({super.key, this.creditLimit});

  @override
  State<GraduationScreen> createState() => _GraduationScreenState();
}

class _GraduationScreenState extends State<GraduationScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _scaleAnim = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );
    _fadeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.3, 1.0, curve: Curves.easeIn)),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final limit = widget.creditLimit ?? 75;

    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF4A3B1F), Color(0xFF1E3A5F)],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Spacer(flex: 2),

                // ── Animated star icon ────────────────────────────────
                ScaleTransition(
                  scale: _scaleAnim,
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.gold.withAlpha(40),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.gold.withAlpha(60),
                          blurRadius: 40,
                          spreadRadius: 10,
                        ),
                      ],
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.gold.withAlpha(80),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.star_rounded, size: 56, color: AppColors.gold),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // ── Text content ──────────────────────────────────────
                FadeTransition(
                  opacity: _fadeAnim,
                  child: Column(
                    children: [
                      const Text(
                        'Congratulations!',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: AppColors.gold,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        "You've been upgraded to",
                        style: TextStyle(fontSize: 16, color: Colors.white70),
                      ),
                      const SizedBox(height: 8),
                      const TierBadge(tier: 'loan_credit', large: true),
                      const SizedBox(height: 24),

                      // Credit limit card
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.gold.withAlpha(40)),
                        ),
                        child: Column(
                          children: [
                            const Text(
                              'Your Credit Limit',
                              style: TextStyle(fontSize: 13, color: Colors.white60),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'ZMW ${limit.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontSize: 40,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                letterSpacing: -1,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppColors.green.withAlpha(30),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Text(
                                'Available immediately',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.green,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Benefits list
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(10),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('What you get:',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white60)),
                            const SizedBox(height: 10),
                            _benefitRow(Icons.account_balance_wallet_rounded, 'Borrow up to ZMW ${limit.toStringAsFixed(0)}'),
                            _benefitRow(Icons.schedule_rounded, '30-day repayment period'),
                            _benefitRow(Icons.discount_rounded, '1% early repayment discount'),
                            _benefitRow(Icons.trending_up_rounded, 'Credit limit grows with usage'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const Spacer(flex: 3),

                // ── CTA button ────────────────────────────────────────
                FadeTransition(
                  opacity: _fadeAnim,
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context.go('/home'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.gold,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                      child: const Text('Start Using Your Credit'),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _benefitRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.gold),
          const SizedBox(width: 10),
          Expanded(child: Text(text,
              style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}

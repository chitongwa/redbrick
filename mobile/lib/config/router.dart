import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/splash_screen.dart';
import '../screens/onboarding_screen.dart';
import '../screens/otp_screen.dart';
import '../screens/home_screen.dart';
import '../screens/get_electricity_screen.dart';
import '../screens/credit_screen.dart';
import '../screens/history_screen.dart';
import '../screens/repayment_screen.dart';
import '../screens/account_screen.dart';
import '../screens/graduation_screen.dart';
import 'theme.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
    GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
    GoRoute(
      path: '/otp',
      builder: (_, state) {
        final extra = state.extra as Map<String, String>? ?? {};
        return OtpScreen(
          phone: extra['phone'] ?? '',
          meter: extra['meter'] ?? '',
        );
      },
    ),

    // Main app with bottom nav
    ShellRoute(
      builder: (context, state, child) => _AppShell(state: state, child: child),
      routes: [
        GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
        GoRoute(path: '/get-electricity', builder: (_, __) => const GetElectricityScreen()),
        GoRoute(path: '/credit', builder: (_, __) => const CreditScreen()),
        GoRoute(path: '/history', builder: (_, __) => const HistoryScreen()),
        GoRoute(path: '/account', builder: (_, __) => const AccountScreen()),
      ],
    ),

    // Full-screen routes (no bottom nav)
    GoRoute(
      path: '/repayment',
      builder: (_, state) {
        final extra = state.extra as Map<String, dynamic>? ?? {};
        return RepaymentScreen(
          loanId: extra['loan_id'] as int? ?? 0,
          outstanding: (extra['outstanding'] as num?)?.toDouble() ?? 0,
        );
      },
    ),
    GoRoute(
      path: '/graduation',
      builder: (_, state) {
        final extra = state.extra as Map<String, dynamic>?;
        return GraduationScreen(
          creditLimit: (extra?['credit_limit'] as num?)?.toDouble(),
        );
      },
    ),
  ],
);

/// Bottom navigation shell — adapts labels based on current route context.
class _AppShell extends StatelessWidget {
  final GoRouterState state;
  final Widget child;

  const _AppShell({required this.state, required this.child});

  int _index(String location) {
    if (location.startsWith('/get-electricity')) return 1;
    if (location.startsWith('/credit')) return 1;
    if (location.startsWith('/history')) return 2;
    if (location.startsWith('/account')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final idx = _index(state.uri.toString());
    final loc = state.uri.toString();
    final isCredit = loc.startsWith('/credit');

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: idx,
        backgroundColor: AppColors.white,
        indicatorColor: isCredit ? AppColors.goldLight : AppColors.brickLight,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        onDestinationSelected: (i) {
          switch (i) {
            case 0: context.go('/home');
            case 1: context.go('/get-electricity');
            case 2: context.go('/history');
            case 3: context.go('/account');
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: AppColors.brick),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.bolt_outlined),
            selectedIcon: Icon(Icons.bolt, color: AppColors.brick),
            label: 'Electricity',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history, color: AppColors.brick),
            label: 'History',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: AppColors.brick),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}

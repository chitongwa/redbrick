import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config/theme.dart';
import 'config/router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: RedBrickApp()));
}

class RedBrickApp extends StatelessWidget {
  const RedBrickApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'RedBrick',
      debugShowCheckedModeBanner: false,
      theme: appTheme(),
      routerConfig: appRouter,
    );
  }
}

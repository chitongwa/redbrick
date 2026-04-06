import 'package:flutter/material.dart';

void main() {
  runApp(const RedBrickApp());
}

class RedBrickApp extends StatelessWidget {
  const RedBrickApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RedBrick',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1E3A5F),
          primary: const Color(0xFF1E3A5F),
          secondary: const Color(0xFFE8533A),
        ),
        useMaterial3: true,
      ),
      home: const Scaffold(
        body: Center(
          child: Text(
            'RedBrick',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }
}

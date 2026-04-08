import 'package:flutter/material.dart';

class AppColors {
  static const navy       = Color(0xFF1E3A5F);
  static const navyLight  = Color(0xFFE8EDF4);
  static const navyDark   = Color(0xFF122339);
  static const brick      = Color(0xFFE8533A);
  static const brickLight = Color(0xFFFDEEED);
  static const brickDark  = Color(0xFFB03C2A);
  static const white      = Colors.white;
  static const grey50     = Color(0xFFF9FAFB);
  static const grey200    = Color(0xFFE5E7EB);
  static const grey400    = Color(0xFF9CA3AF);
  static const grey700    = Color(0xFF374151);
  static const green      = Color(0xFF16A34A);
  static const mtnYellow  = Color(0xFFFFCC00);
  static const airtelRed  = Color(0xFFDC2626);
  static const gold       = Color(0xFFD4A017);
  static const goldLight  = Color(0xFFFDF8E8);
  static const goldDark   = Color(0xFF9A7611);
  static const red        = Color(0xFFDC2626);
  static const redLight   = Color(0xFFFEF2F2);
}

ThemeData appTheme() {
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.navy,
      primary: AppColors.navy,
      secondary: AppColors.brick,
    ),
    scaffoldBackgroundColor: AppColors.grey50,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.navy,
      foregroundColor: AppColors.white,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: AppColors.white,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.brick,
        foregroundColor: AppColors.white,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.grey200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.grey200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.brick, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
  );
}

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Extracts a user-friendly message from a Dio error or fallback.
String friendlyError(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data.containsKey('error')) return data['error'] as String;
    if (error.type == DioExceptionType.connectionTimeout) return 'Connection timed out';
    if (error.type == DioExceptionType.connectionError) return 'Could not reach the server';
    return 'Network error — please try again';
  }
  return error.toString();
}

class ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const ErrorBanner({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.brickLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.brick, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: const TextStyle(color: AppColors.brickDark, fontSize: 13))),
          if (onRetry != null)
            TextButton(onPressed: onRetry, child: const Text('Retry', style: TextStyle(color: AppColors.brick))),
        ],
      ),
    );
  }
}

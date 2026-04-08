import 'package:flutter/material.dart';
import '../config/theme.dart';

class TierBadge extends StatelessWidget {
  final String tier;
  final bool large;

  const TierBadge({super.key, required this.tier, this.large = false});

  bool get _isGold => tier == 'loan_credit';

  @override
  Widget build(BuildContext context) {
    final bgColor = _isGold ? AppColors.goldLight : AppColors.navyLight;
    final textColor = _isGold ? AppColors.goldDark : AppColors.navy;
    final dotColor = _isGold ? AppColors.gold : AppColors.navy;
    final icon = _isGold ? Icons.star_rounded : Icons.bolt_rounded;
    final label = _isGold ? 'Credit Member' : 'Trade Credit';

    if (large) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: dotColor.withAlpha(60)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: dotColor),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: textColor,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: dotColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }
}

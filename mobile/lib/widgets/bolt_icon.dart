import 'package:flutter/material.dart';

class BoltIcon extends StatelessWidget {
  final double size;
  final Color? color;

  const BoltIcon({super.key, this.size = 24, this.color});

  @override
  Widget build(BuildContext context) {
    return Icon(Icons.bolt_rounded, size: size, color: color);
  }
}

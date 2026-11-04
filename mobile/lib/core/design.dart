import 'package:flutter/material.dart';

const rose = Color(0xFFD83577);
const ink = Color(0xFF282733);
const cream = Color(0xFFFFFBF5);

ThemeData auraTheme() => ThemeData(
  useMaterial3: true,
  fontFamily: 'Quicksand',
  colorScheme: ColorScheme.fromSeed(
    seedColor: rose,
    brightness: Brightness.light,
    surface: cream,
    primary: rose,
    onSurface: ink,
  ),
  scaffoldBackgroundColor: cream,
  appBarTheme: const AppBarTheme(
    backgroundColor: cream,
    centerTitle: false,
    titleTextStyle: TextStyle(
      color: ink,
      fontFamily: 'Quicksand',
      fontSize: 24,
      fontWeight: FontWeight.w700,
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: Colors.white,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: const BorderSide(color: Color(0xFFE9E1DE)),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: const BorderSide(color: Color(0xFFE9E1DE)),
    ),
    contentPadding: const EdgeInsets.all(18),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: const Size(48, 54),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      textStyle: const TextStyle(
        fontFamily: 'Quicksand',
        fontSize: 16,
        fontWeight: FontWeight.w600,
      ),
    ),
  ),
  navigationBarTheme: const NavigationBarThemeData(
    backgroundColor: Colors.white,
    indicatorColor: Color(0xFFFBE3ED),
  ),
);

class Brand extends StatelessWidget {
  const Brand({super.key, this.subtitle = 'A little closer, every day.'});
  final String subtitle;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: const Color(0xFFFBE3ED),
          borderRadius: BorderRadius.circular(30),
        ),
        child: const Icon(Icons.favorite_rounded, color: rose, size: 38),
      ),
      const SizedBox(height: 22),
      const Text(
        'Aura',
        style: TextStyle(
          fontSize: 42,
          fontWeight: FontWeight.w800,
          letterSpacing: -2,
          color: ink,
        ),
      ),
      const SizedBox(height: 8),
      Text(
        subtitle,
        textAlign: TextAlign.center,
        style: const TextStyle(color: Color(0xFF726A76), fontSize: 16),
      ),
    ],
  );
}

class PageBody extends StatelessWidget {
  const PageBody({super.key, required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 560),
      child: ListView(padding: const EdgeInsets.all(24), children: children),
    ),
  );
}

class ErrorNotice extends StatelessWidget {
  const ErrorNotice(this.message, {super.key, this.retry});
  final String message;
  final VoidCallback? retry;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Semantics(
      liveRegion: true,
      child: Column(
        children: [
          Text(
            message,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
          if (retry != null)
            TextButton(onPressed: retry, child: const Text('Try again')),
        ],
      ),
    ),
  );
}

class EmptyState extends StatelessWidget {
  const EmptyState(this.icon, this.title, this.detail, {super.key});
  final IconData icon;
  final String title, detail;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 48, color: rose),
          const SizedBox(height: 18),
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(detail, textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}

String? requiredText(String? value) =>
    value == null || value.trim().isEmpty ? 'Please fill this in.' : null;
String? emailValidator(String? value) =>
    value != null &&
        RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value.trim())
    ? null
    : 'Enter a valid email address.';
String? passwordValidator(String? value) =>
    value != null && value.length >= 8 ? null : 'Use at least 8 characters.';

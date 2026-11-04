class AppConfig {
  const AppConfig(this.url, this.key);

  static const environment = AppConfig(
    String.fromEnvironment('SUPABASE_URL'),
    String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
  );

  final String url;
  final String key;

  bool get isValid {
    final uri = Uri.tryParse(url);
    if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) return false;
    // Only the project's publishable key belongs in a distributed app.
    return key.startsWith('sb_publishable_') && key.trim() == key;
  }
}

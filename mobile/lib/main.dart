import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app.dart';
import 'core/config.dart';
import 'core/design.dart';
import 'core/repository.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const config = AppConfig.environment;
  if (!config.isValid) {
    runApp(const StartupProblem(configuration: true));
    return;
  }
  try {
    await Supabase.initialize(
      url: config.url,
      publishableKey: config.key,
      authOptions: FlutterAuthClientOptions(
        localStorage: SecureSessionStorage(),
        pkceAsyncStorage: SecurePkceStorage(),
        detectSessionInUriPredicate: (uri) =>
            uri.scheme == 'com.aura.couples' &&
            uri.host == 'auth' &&
            uri.path == '/callback',
      ),
    );
    runApp(AuraApp(repository: SupabaseRepository(Supabase.instance.client)));
  } catch (_) {
    runApp(const StartupProblem(configuration: false));
  }
}

class StartupProblem extends StatelessWidget {
  const StartupProblem({super.key, required this.configuration});
  final bool configuration;
  @override
  Widget build(BuildContext context) => MaterialApp(
    theme: auraTheme(),
    debugShowCheckedModeBanner: false,
    home: Scaffold(
      body: SafeArea(
        child: PageBody(
          children: [
            const SizedBox(height: 48),
            const Brand(),
            const SizedBox(height: 32),
            Text(
              configuration
                  ? 'This build needs its connection settings.'
                  : 'Aura couldn’t start securely.',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            Text(
              configuration
                  ? 'Please install a configured Aura build.'
                  : 'Close and reopen Aura. If it keeps happening, contact support.',
            ),
          ],
        ),
      ),
    ),
  );
}

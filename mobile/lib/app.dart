import 'dart:async';
import 'package:flutter/material.dart';
import 'core/design.dart';
import 'core/repository.dart';
import 'features/auth.dart';
import 'features/home.dart';
import 'features/onboarding.dart';

class AuraApp extends StatelessWidget {
  const AuraApp({super.key, required this.repository});
  final AuraRepository repository;
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Aura',
    debugShowCheckedModeBanner: false,
    theme: auraTheme(),
    home: AccountGate(repository: repository),
  );
}

class AccountGate extends StatefulWidget {
  const AccountGate({super.key, required this.repository});
  final AuraRepository repository;
  @override
  State<AccountGate> createState() => _AccountGateState();
}

class _AccountGateState extends State<AccountGate> {
  StreamSubscription<bool>? subscription;
  String? userId;
  Future<Account>? account;
  bool recovery = false;
  @override
  void initState() {
    super.initState();
    userId = widget.repository.userId;
    if (userId != null) account = widget.repository.account();
    subscription = widget.repository.authChanges.listen((isRecovery) {
      if (!mounted) return;
      final id = widget.repository.userId;
      if (id != userId || isRecovery) {
        if (userId != null && id != userId) {
          Navigator.of(context).popUntil((route) => route.isFirst);
        }
        setState(() {
          userId = id;
          recovery = isRecovery;
          account = id == null ? null : widget.repository.account();
        });
      }
    });
  }

  @override
  void dispose() {
    subscription?.cancel();
    super.dispose();
  }

  void reload() => setState(() {
    account = widget.repository.account();
  });
  @override
  Widget build(BuildContext context) {
    if (userId == null) return AuthScreen(repository: widget.repository);
    if (recovery) {
      return RecoveryScreen(
        repository: widget.repository,
        onDone: () => setState(() {
          recovery = false;
          account = widget.repository.account();
        }),
      );
    }
    return FutureBuilder<Account>(
      future: account,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            body: SafeArea(
              child: PageBody(
                children: [
                  const Brand(),
                  const SizedBox(height: 32),
                  ErrorNotice(
                    'Your account couldn’t load. Please try again.',
                    retry: reload,
                  ),
                  SignOutButton(repository: widget.repository),
                ],
              ),
            ),
          );
        }
        if (snapshot.connectionState != ConnectionState.done ||
            !snapshot.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        final profile = snapshot.data!;
        if (!profile.complete) {
          return ProfileScreen(
            key: ValueKey(profile.id),
            repository: widget.repository,
            account: profile,
            onDone: reload,
          );
        }
        if (profile.coupleId == null) {
          return LinkingScreen(repository: widget.repository, onLinked: reload);
        }
        return HomeScreen(
          key: ValueKey(profile.coupleId),
          repository: widget.repository,
          account: profile,
        );
      },
    );
  }
}

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../core/design.dart';
import '../core/repository.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    super.key,
    required this.repository,
    required this.account,
    required this.onDone,
  });
  final AuraRepository repository;
  final Account account;
  final VoidCallback onDone;
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final form = GlobalKey<FormState>();
  late final name = TextEditingController(text: widget.account.name);
  late final nickname = TextEditingController(text: widget.account.nickname);
  String gender = 'Prefer not to say';
  String? error;
  bool busy = false;
  @override
  void dispose() {
    name.dispose();
    nickname.dispose();
    super.dispose();
  }

  Future<void> save() async {
    if (busy || !form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.repository.saveProfile(name.text, gender, nickname.text);
      if (mounted) widget.onDone();
    } catch (e) {
      if (mounted) setState(() => error = friendlyError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Make it yours')),
    body: PageBody(
      children: [
        const Brand(subtitle: 'Every great story starts with you.'),
        const SizedBox(height: 32),
        Form(
          key: form,
          child: Column(
            children: [
              TextFormField(
                controller: name,
                maxLength: 100,
                validator: requiredText,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Your name'),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: gender,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Gender'),
                items: ['Male', 'Female', 'Other', 'Prefer not to say']
                    .map((g) => DropdownMenuItem(value: g, child: Text(g)))
                    .toList(),
                onChanged: busy ? null : (g) => setState(() => gender = g!),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: nickname,
                maxLength: 100,
                validator: requiredText,
                decoration: const InputDecoration(
                  labelText: 'Partner nickname',
                ),
              ),
            ],
          ),
        ),
        if (error != null) ErrorNotice(error!),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: busy ? null : save,
          child: Text(busy ? 'Saving…' : 'Continue'),
        ),
        SignOutButton(repository: widget.repository),
      ],
    ),
  );
}

class LinkingScreen extends StatefulWidget {
  const LinkingScreen({
    super.key,
    required this.repository,
    required this.onLinked,
  });
  final AuraRepository repository;
  final VoidCallback onLinked;
  @override
  State<LinkingScreen> createState() => _LinkingScreenState();
}

class _LinkingScreenState extends State<LinkingScreen>
    with WidgetsBindingObserver {
  final code = TextEditingController();
  JsonRow? invite;
  String? error;
  bool busy = false, polling = false;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    timer = Timer.periodic(const Duration(seconds: 5), (_) => refresh());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    timer?.cancel();
    if (state == AppLifecycleState.resumed) {
      refresh();
      timer = Timer.periodic(const Duration(seconds: 5), (_) => refresh());
    }
  }

  Future<void> refresh() async {
    if (polling || busy) return;
    polling = true;
    try {
      final account = await widget.repository.account();
      if (mounted && account.coupleId != null) widget.onLinked();
    } catch (_) {
      /* Manual actions report errors; background checks may retry. */
    } finally {
      polling = false;
    }
  }

  @override
  void dispose() {
    timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    code.dispose();
    super.dispose();
  }

  Future<void> act(bool create) async {
    if (busy) return;
    if (!create && !RegExp(r'^[a-fA-F0-9]{24}$').hasMatch(code.text.trim())) {
      setState(
        () => error = 'Enter the 24-character invitation from your partner.',
      );
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      if (create) {
        final result = await widget.repository.createInvite();
        if (mounted) setState(() => invite = result);
      } else {
        await widget.repository.acceptInvite(code.text);
        if (mounted) widget.onLinked();
      }
    } catch (e) {
      if (mounted) setState(() => error = friendlyError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Find your person')),
    body: PageBody(
      children: [
        const Brand(subtitle: 'Two people. One private little world.'),
        const SizedBox(height: 32),
        const Text(
          'Invite your partner',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'Send an invitation privately. It works once and expires after 24 hours.',
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: busy ? null : () => act(true),
          icon: const Icon(Icons.favorite_outline),
          label: Text(
            invite == null ? 'Create invitation' : 'Replace invitation',
          ),
        ),
        if (invite != null) ...[
          const SizedBox(height: 16),
          SelectableText(
            invite!['code'],
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 20, letterSpacing: 1),
          ),
          Text(
            'Expires ${DateFormat.MMMd().add_jm().format(DateTime.parse(invite!['expires_at']).toLocal())}',
            textAlign: TextAlign.center,
          ),
          TextButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: invite!['code']));
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Invitation copied')),
                );
              }
            },
            icon: const Icon(Icons.copy_outlined),
            label: const Text('Copy invitation'),
          ),
        ],
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 24),
          child: Divider(),
        ),
        const Text(
          'Already have an invitation?',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: code,
          maxLength: 24,
          autocorrect: false,
          enableSuggestions: false,
          decoration: const InputDecoration(
            labelText: 'Partner invitation code',
          ),
        ),
        if (error != null) ErrorNotice(error!),
        OutlinedButton(
          onPressed: busy ? null : () => act(false),
          child: const Text('Connect with my partner'),
        ),
        SignOutButton(repository: widget.repository),
      ],
    ),
  );
}

class SignOutButton extends StatefulWidget {
  const SignOutButton({super.key, required this.repository});
  final AuraRepository repository;
  @override
  State<SignOutButton> createState() => _SignOutButtonState();
}

class _SignOutButtonState extends State<SignOutButton> {
  bool busy = false;
  @override
  Widget build(BuildContext context) => TextButton(
    onPressed: busy
        ? null
        : () async {
            setState(() => busy = true);
            try {
              await widget.repository.signOut();
            } catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text(friendlyError(e))));
              }
            } finally {
              if (mounted) setState(() => busy = false);
            }
          },
    child: Text(busy ? 'Signing out…' : 'Sign out'),
  );
}

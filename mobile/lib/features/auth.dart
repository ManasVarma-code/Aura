import 'package:flutter/material.dart';
import '../core/design.dart';
import '../core/repository.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.repository});
  final AuraRepository repository;
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final form = GlobalKey<FormState>();
  final email = TextEditingController(), password = TextEditingController();
  bool signup = false, busy = false, visible = false, reset = false;
  String? error, notice;
  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (busy || !form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      error = null;
      notice = null;
    });
    try {
      if (reset) {
        await widget.repository.resetPassword(email.text);
        if (mounted) {
          setState(
            () => notice =
                'If this address has an account, a reset link is on its way.',
          );
        }
      } else if (signup) {
        final confirmation = await widget.repository.signUp(
          email.text,
          password.text,
        );
        if (mounted && confirmation) {
          setState(
            () => notice =
                'Check your email to confirm your account, then sign in.',
          );
        }
      } else {
        await widget.repository.signIn(email.text, password.text);
      }
    } catch (e) {
      if (mounted) setState(() => error = friendlyError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: AutofillGroup(
        child: PageBody(
          children: [
            const SizedBox(height: 36),
            const Brand(),
            const SizedBox(height: 40),
            Text(
              reset
                  ? 'Find your way back.'
                  : signup
                  ? 'Your story starts here.'
                  : 'Welcome to your space.',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              reset
                  ? 'We’ll send you a password reset link.'
                  : 'A private place for you and your person.',
            ),
            const SizedBox(height: 24),
            Form(
              key: form,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    validator: emailValidator,
                    decoration: const InputDecoration(
                      labelText: 'Email address',
                      prefixIcon: Icon(Icons.mail_outline),
                    ),
                  ),
                  if (!reset) ...[
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: password,
                      obscureText: !visible,
                      autofillHints: [
                        signup
                            ? AutofillHints.newPassword
                            : AutofillHints.password,
                      ],
                      validator: signup ? passwordValidator : requiredText,
                      onFieldSubmitted: (_) => submit(),
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          tooltip: visible ? 'Hide password' : 'Show password',
                          onPressed: () => setState(() => visible = !visible),
                          icon: Icon(
                            visible
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                          ),
                        ),
                      ),
                    ),
                  ],
                  if (error != null) ErrorNotice(error!),
                  if (notice != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Semantics(liveRegion: true, child: Text(notice!)),
                    ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: busy ? null : submit,
                    child: Text(
                      busy
                          ? 'Please wait…'
                          : reset
                          ? 'Send reset link'
                          : signup
                          ? 'Create account'
                          : 'Sign in',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: busy
                  ? null
                  : () => setState(() {
                      signup = !signup;
                      reset = false;
                      error = null;
                      notice = null;
                    }),
              child: Text(
                reset
                    ? 'Back to sign in'
                    : signup
                    ? 'Already have an account? Sign in'
                    : 'New here? Create an account',
              ),
            ),
            if (!reset && !signup)
              TextButton(
                onPressed: busy
                    ? null
                    : () => setState(() {
                        reset = true;
                        error = null;
                        notice = null;
                      }),
                child: const Text('Forgot password?'),
              ),
            const SizedBox(height: 24),
            const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.lock_outline, size: 14, color: rose),
                SizedBox(width: 6),
                Flexible(
                  child: Text(
                    'Just the two of you. Always.',
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}

class RecoveryScreen extends StatefulWidget {
  const RecoveryScreen({
    super.key,
    required this.repository,
    required this.onDone,
  });
  final AuraRepository repository;
  final VoidCallback onDone;
  @override
  State<RecoveryScreen> createState() => _RecoveryScreenState();
}

class _RecoveryScreenState extends State<RecoveryScreen> {
  final form = GlobalKey<FormState>();
  final password = TextEditingController();
  bool busy = false;
  String? error;
  @override
  void dispose() {
    password.dispose();
    super.dispose();
  }

  Future<void> save() async {
    if (busy || !form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.repository.updatePassword(password.text);
      if (mounted) widget.onDone();
    } catch (e) {
      if (mounted) setState(() => error = friendlyError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('A fresh start')),
    body: PageBody(
      children: [
        Form(
          key: form,
          child: TextFormField(
            controller: password,
            obscureText: true,
            validator: passwordValidator,
            decoration: const InputDecoration(labelText: 'New password'),
          ),
        ),
        if (error != null) ErrorNotice(error!),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: busy ? null : save,
          child: const Text('Update password'),
        ),
      ],
    ),
  );
}

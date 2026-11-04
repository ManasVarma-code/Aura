import 'dart:async';
import 'package:aura_mobile/app.dart';
import 'package:aura_mobile/core/config.dart';
import 'package:aura_mobile/core/design.dart';
import 'package:aura_mobile/core/repository.dart';
import 'package:aura_mobile/features/chat.dart';
import 'package:aura_mobile/features/collections.dart';
import 'package:aura_mobile/features/onboarding.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeRepository implements AuraRepository {
  final changes = StreamController<bool>.broadcast();
  @override
  String? userId;
  @override
  String? email = 'test@example.com';
  @override
  Stream<bool> get authChanges => changes.stream;
  Account profile = const Account(
    id: 'user',
    name: 'Sam',
    nickname: 'Love',
    gender: 'Other',
    coupleId: 'couple',
  );
  bool failSignIn = false, failSend = false, confirmation = true;
  int signInCalls = 0, acceptCalls = 0;
  final sends = <String>[], events = <String>[], notes = <String>[];
  @override
  Future<void> signIn(String email, String password) async {
    signInCalls++;
    if (failSignIn) throw Exception('Please check your email and password.');
    userId = 'user';
    changes.add(false);
  }

  @override
  Future<bool> signUp(String email, String password) async => confirmation;
  @override
  Future<void> resetPassword(String email) async {}
  @override
  Future<void> updatePassword(String password) async {}
  @override
  Future<void> signOut() async {
    userId = null;
    changes.add(false);
  }

  @override
  Future<Account> account() async => profile;
  @override
  Future<void> saveProfile(String name, String gender, String nickname) async {
    profile = Account(
      id: 'user',
      name: name,
      gender: gender,
      nickname: nickname,
    );
  }

  @override
  Future<JsonRow> createInvite() async => {
    'code': '1234567890abcdef12345678',
    'expires_at': '2026-12-01T12:00:00Z',
  };
  @override
  Future<void> acceptInvite(String code) async {
    acceptCalls++;
  }

  @override
  Stream<List<JsonRow>> watch(String table, String coupleId) =>
      Stream.value([]);
  @override
  Future<List<JsonRow>> olderMessages(String coupleId, JsonRow before) async =>
      [];
  @override
  Future<void> sendMessage(String coupleId, String body, String id) async {
    sends.add(id);
    if (failSend) {
      failSend = false;
      throw Exception('Connection interrupted. Try sending again.');
    }
  }

  @override
  Future<void> addEvent(String coupleId, String title, String date) async {
    events.add(title);
  }

  @override
  Future<void> deleteEvent(String id) async {}
  @override
  Future<String> memoryImage(String path) async => 'https://example.com/photo';
  @override
  Future<void> addNote(String coupleId, String title, String content) async {
    notes.add(title);
  }
}

Future<void> reveal(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    160,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pumpAndSettle();
}

void main() {
  test('mobile configuration rejects private keys and insecure endpoints', () {
    expect(
      const AppConfig(
        'https://project.supabase.co',
        'sb_publishable_public',
      ).isValid,
      isTrue,
    );
    expect(
      const AppConfig(
        'https://project.supabase.co',
        'sb_secret_private',
      ).isValid,
      isFalse,
    );
    expect(
      const AppConfig(
        'http://project.supabase.co',
        'sb_publishable_public',
      ).isValid,
      isFalse,
    );
    expect(
      const AppConfig(
        'https://project.supabase.co',
        ' sb_publishable_public',
      ).isValid,
      isFalse,
    );
  });

  testWidgets('invalid form does not submit; network failure retains inputs', (
    tester,
  ) async {
    final repo = FakeRepository()..failSignIn = true;
    await tester.pumpWidget(AuraApp(repository: repo));
    await reveal(tester, find.widgetWithText(FilledButton, 'Sign in'));
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
    expect(repo.signInCalls, 0);
    expect(find.text('Enter a valid email address.'), findsOneWidget);
    await tester.enterText(
      find.byType(TextFormField).first,
      'test@example.com',
    );
    await tester.enterText(find.byType(TextFormField).last, 'password123');
    await reveal(tester, find.widgetWithText(FilledButton, 'Sign in'));
    await reveal(tester, find.widgetWithText(FilledButton, 'Sign in'));
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Please check your email and password.'), findsOneWidget);
    expect(find.text('test@example.com'), findsOneWidget);
    expect(repo.signInCalls, 1);
    await tester.pumpWidget(const SizedBox());
    await repo.changes.close();
  });

  testWidgets(
    'confirmation signup remains signed out and explains email confirmation',
    (tester) async {
      final repo = FakeRepository();
      await tester.pumpWidget(AuraApp(repository: repo));
      await reveal(tester, find.text('New here? Create an account'));
      await tester.tap(find.text('New here? Create an account'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextFormField).first,
        'test@example.com',
      );
      await tester.enterText(find.byType(TextFormField).last, 'password123');
      await reveal(tester, find.widgetWithText(FilledButton, 'Create account'));
      await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
      await tester.pumpAndSettle();
      expect(repo.userId, isNull);
      expect(
        find.text('Check your email to confirm your account, then sign in.'),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox());
      await repo.changes.close();
    },
  );

  testWidgets('completed login reaches native shell; logout returns to sign in', (
    tester,
  ) async {
    final repo = FakeRepository()..userId = 'user';
    await tester.pumpWidget(AuraApp(repository: repo));
    await tester.pumpAndSettle();
    expect(find.text('A world that’s\njust for two.'), findsOneWidget);
    await tester.tap(find.byTooltip('Account'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    // Route overlays must not leave authenticated UI above the signed-out screen.
    expect(find.text('Welcome to your space.'), findsOneWidget);
    expect(find.text(repo.email!), findsNothing);
    await tester.pumpWidget(const SizedBox());
    await repo.changes.close();
  });

  testWidgets('profile form saves before partner linking', (tester) async {
    final repo = FakeRepository()
      ..userId = 'user'
      ..profile = const Account(id: 'user', name: 'Sam', nickname: '');
    await tester.pumpWidget(AuraApp(repository: repo));
    await tester.pumpAndSettle();
    expect(find.text('Make it yours'), findsOneWidget);
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Partner nickname'),
      'Love',
    );
    await reveal(tester, find.widgetWithText(FilledButton, 'Continue'));
    await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
    await tester.pumpAndSettle();
    expect(
      repo.profile.complete,
      isTrue,
      reason:
          'Saved nickname: ${repo.profile.nickname}; gender: ${repo.profile.gender}',
    );
    expect(find.text('Find your person'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    await repo.changes.close();
  });

  testWidgets(
    'partner codes are validated and valid invite uses backend action',
    (tester) async {
      final repo = FakeRepository();
      var linked = false;
      await tester.pumpWidget(
        MaterialApp(
          theme: auraTheme(),
          home: LinkingScreen(repository: repo, onLinked: () => linked = true),
        ),
      );
      await reveal(tester, find.text('Connect with my partner'));
      await tester.tap(find.text('Connect with my partner'));
      await tester.pumpAndSettle();
      expect(repo.acceptCalls, 0);
      await tester.enterText(
        find.byType(TextField),
        '1234567890abcdef12345678',
      );
      await reveal(tester, find.text('Connect with my partner'));
      await tester.tap(find.text('Connect with my partner'));
      await tester.pumpAndSettle();
      expect(repo.acceptCalls, 1);
      expect(linked, isTrue);
      await tester.pumpWidget(const SizedBox());
      await repo.changes.close();
    },
  );

  testWidgets('uncertain message delivery keeps draft and reuses retry ID', (
    tester,
  ) async {
    final repo = FakeRepository()..failSend = true;
    await tester.pumpWidget(
      MaterialApp(
        theme: auraTheme(),
        home: Scaffold(
          body: ChatScreen(repository: repo, account: repo.profile),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Hello, love');
    await tester.tap(find.byTooltip('Send message'));
    await tester.pumpAndSettle();
    expect(find.text('Hello, love'), findsOneWidget);
    await tester.tap(find.byTooltip('Send message'));
    await tester.pumpAndSettle();
    expect(repo.sends.length, 2);
    expect(repo.sends[0], repo.sends[1]);
    expect(find.text('Hello, love'), findsNothing);
    await tester.pumpWidget(const SizedBox());
    await repo.changes.close();
  });

  for (final calendar in [true, false]) {
    testWidgets(
      'native ${calendar ? 'calendar' : 'memory'} form persists through repository',
      (tester) async {
        final repo = FakeRepository();
        await tester.pumpWidget(
          MaterialApp(
            theme: auraTheme(),
            home: Scaffold(
              body: AddEntry(
                repository: repo,
                coupleId: 'couple',
                calendar: calendar,
              ),
            ),
          ),
        );
        await tester.enterText(
          find.widgetWithText(TextFormField, 'Title'),
          'Our moment',
        );
        await reveal(tester, find.text('Save for us'));
        await tester.tap(find.text('Save for us'));
        await tester.pumpAndSettle();
        expect(calendar ? repo.events : repo.notes, ['Our moment']);
        await tester.pumpWidget(const SizedBox());
        await repo.changes.close();
      },
    );
  }
}

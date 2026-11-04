import 'dart:async';
import 'package:aura_mobile/core/repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  const url = String.fromEnvironment('TEST_SUPABASE_URL');
  test(
    'Dart client authenticates, links partners, streams chat, and persists shared data',
    () async {
      final uri = Uri.parse(url);
      expect(uri.host, anyOf('127.0.0.1', 'localhost'));
      final a = SupabaseClient(
        url,
        const String.fromEnvironment('TEST_SUPABASE_KEY'),
      );
      final b = SupabaseClient(
        url,
        const String.fromEnvironment('TEST_SUPABASE_KEY'),
      );
      final first = SupabaseRepository(a), second = SupabaseRepository(b);
      StreamSubscription<List<JsonRow>>? subscription;
      try {
        await first.signIn(
          const String.fromEnvironment('TEST_EMAIL_A'),
          const String.fromEnvironment('TEST_PASSWORD'),
        );
        await second.signIn(
          const String.fromEnvironment('TEST_EMAIL_B'),
          const String.fromEnvironment('TEST_PASSWORD'),
        );
        expect((await first.account()).complete, isFalse);
        await first.saveProfile('First', 'Other', 'Love');
        await second.saveProfile('Second', 'Other', 'Love');
        final invite = await first.createInvite();
        await second.acceptInvite(invite['code']);
        final profile = await first.account();
        expect(profile.coupleId, isNotNull);
        expect((await second.account()).coupleId, profile.coupleId);
        await expectLater(second.acceptInvite(invite['code']), throwsException);
        final messageArrived = Completer<void>();
        subscription = second
            .watch('messages', profile.coupleId!)
            .listen(
              (rows) {
                if (rows.any((row) => row['body'] == 'Hello from Flutter') &&
                    !messageArrived.isCompleted) {
                  messageArrived.complete();
                }
              },
              onError: (Object e) {
                if (!messageArrived.isCompleted) {
                  messageArrived.completeError(e);
                }
              },
            );
        await first.sendMessage(
          profile.coupleId!,
          'Hello from Flutter',
          'b143841d-5a3d-4a28-9a4e-2ccba15ef111',
        );
        await first.sendMessage(
          profile.coupleId!,
          'Hello from Flutter',
          'b143841d-5a3d-4a28-9a4e-2ccba15ef111',
        );
        await messageArrived.future.timeout(const Duration(seconds: 20));
        expect((await b.from('messages').select()).length, 1);
        await first.addEvent(profile.coupleId!, 'Flutter date', '2026-12-01');
        final events = await b.from('calendar_events').select();
        expect(events.single['title'], 'Flutter date');
        await second.deleteEvent(events.single['id']);
        expect(await a.from('calendar_events').select(), isEmpty);
        await first.addNote(
          profile.coupleId!,
          'Flutter memory',
          'Our native app works',
        );
        expect(
          (await b.from('memories').select()).single['content'],
          'Our native app works',
        );
        await first.signOut();
        expect(first.userId, isNull);
        await expectLater(
          a.from('messages').select(),
          throwsA(isA<PostgrestException>()),
        );
      } finally {
        await subscription?.cancel();
        await a.dispose();
        await b.dispose();
      }
    },
    skip: url.isEmpty
        ? 'Run with node tool/test_backend.mjs against isolated local Supabase.'
        : false,
  );
}

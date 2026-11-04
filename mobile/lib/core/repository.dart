import 'dart:async';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

typedef JsonRow = Map<String, dynamic>;

class Account {
  const Account({
    required this.id,
    required this.name,
    required this.nickname,
    this.gender,
    this.coupleId,
  });
  final String id, name, nickname;
  final String? gender, coupleId;
  bool get complete => gender != null && nickname.trim().isNotEmpty;
}

// Refresh tokens are held by the OS credential store on Android and iOS.
class SecureSessionStorage extends LocalStorage {
  SecureSessionStorage() : super();
  static const _key = 'aura.supabase.session';
  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );
  @override
  Future<void> initialize() async {}
  @override
  Future<bool> hasAccessToken() => _storage.containsKey(key: _key);
  @override
  Future<String?> accessToken() => _storage.read(key: _key);
  @override
  Future<void> persistSession(String persistSessionString) =>
      _storage.write(key: _key, value: persistSessionString);
  @override
  Future<void> removePersistedSession() => _storage.delete(key: _key);
}

class SecurePkceStorage extends GotrueAsyncStorage {
  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );
  @override
  Future<String?> getItem({required String key}) =>
      _storage.read(key: 'aura.pkce.$key');
  @override
  Future<void> setItem({required String key, required String value}) =>
      _storage.write(key: 'aura.pkce.$key', value: value);
  @override
  Future<void> removeItem({required String key}) =>
      _storage.delete(key: 'aura.pkce.$key');
}

abstract class AuraRepository {
  String? get userId;
  String? get email;
  Stream<bool> get authChanges; // true indicates password recovery.
  Future<void> signIn(String email, String password);
  Future<bool> signUp(String email, String password);
  Future<void> resetPassword(String email);
  Future<void> updatePassword(String password);
  Future<void> signOut();
  Future<Account> account();
  Future<void> saveProfile(String name, String gender, String nickname);
  Future<JsonRow> createInvite();
  Future<void> acceptInvite(String code);
  Stream<List<JsonRow>> watch(String table, String coupleId);
  Future<List<JsonRow>> olderMessages(String coupleId, JsonRow before);
  Future<void> sendMessage(String coupleId, String body, String id);
  Future<void> addEvent(String coupleId, String title, String date);
  Future<void> deleteEvent(String id);
  Future<void> addNote(String coupleId, String title, String content);
  Future<String> memoryImage(String path);
}

class SupabaseRepository implements AuraRepository {
  SupabaseRepository(this.client);
  final SupabaseClient client;
  static const callback = 'com.aura.couples://auth/callback';
  @override
  String? get userId => client.auth.currentUser?.id;
  @override
  String? get email => client.auth.currentUser?.email;
  @override
  Stream<bool> get authChanges => client.auth.onAuthStateChange.map(
    (event) => event.event == AuthChangeEvent.passwordRecovery,
  );
  @override
  Future<void> signIn(String email, String password) async {
    await client.auth.signInWithPassword(
      email: email.trim(),
      password: password,
    );
  }

  @override
  Future<bool> signUp(String email, String password) async {
    final result = await client.auth.signUp(
      email: email.trim(),
      password: password,
      emailRedirectTo: callback,
    );
    return result.session == null;
  }

  @override
  Future<void> resetPassword(String email) =>
      client.auth.resetPasswordForEmail(email.trim(), redirectTo: callback);
  @override
  Future<void> updatePassword(String password) async {
    await client.auth.updateUser(UserAttributes(password: password));
  }

  @override
  Future<void> signOut() => client.auth.signOut();
  @override
  Future<Account> account() async {
    final id = userId;
    if (id == null) throw const AuthException('Please sign in again.');
    final profile = await client
        .from('profiles')
        .select()
        .eq('id', id)
        .single();
    final member = await client
        .from('couple_members')
        .select('couple_id')
        .eq('profile_id', id)
        .maybeSingle();
    return Account(
      id: id,
      name: profile['name'],
      gender: profile['gender'],
      nickname: profile['partner_nickname'],
      coupleId: member?['couple_id'],
    );
  }

  @override
  Future<void> saveProfile(String name, String gender, String nickname) async {
    await client
        .from('profiles')
        .update({
          'name': name.trim(),
          'gender': gender,
          'partner_nickname': nickname.trim(),
        })
        .eq('id', userId!);
  }

  @override
  Future<JsonRow> createInvite() async {
    final data = Map<String, dynamic>.from(
      await client.rpc('create_partner_invite'),
    );
    if (data['error'] != null) throw Exception(data['error']);
    return data;
  }

  @override
  Future<void> acceptInvite(String code) async {
    final data = await client.rpc(
      'accept_partner_invite',
      params: {'invite_code': code.trim().toLowerCase()},
    );
    if (data['error'] != null) throw Exception(data['error']);
  }

  @override
  Stream<List<JsonRow>> watch(String table, String coupleId) {
    if (!{'messages', 'calendar_events', 'memories'}.contains(table)) {
      throw ArgumentError('Unsupported collection');
    }
    return client
        .from(table)
        .stream(primaryKey: ['id'])
        .eq('couple_id', coupleId)
        .order(
          table == 'calendar_events' ? 'event_date' : 'created_at',
          ascending: table == 'calendar_events',
        )
        .limit(100);
  }

  @override
  Future<List<JsonRow>> olderMessages(
    String coupleId,
    JsonRow before,
  ) async => await client
      .from('messages')
      .select()
      .eq('couple_id', coupleId)
      .or(
        'created_at.lt.${before['created_at']},and(created_at.eq.${before['created_at']},id.lt.${before['id']})',
      )
      .order('created_at', ascending: false)
      .order('id', ascending: false)
      .limit(50);
  @override
  Future<void> sendMessage(String coupleId, String body, String id) async {
    try {
      await client.from('messages').insert({
        'id': id,
        'couple_id': coupleId,
        'author_id': userId,
        'body': body.trim(),
      });
    } on PostgrestException catch (error) {
      if (error.code != '23505') rethrow;
      final row = await client.from('messages').select().eq('id', id).single();
      if (row['couple_id'] != coupleId ||
          row['author_id'] != userId ||
          row['body'] != body.trim()) {
        rethrow;
      }
    }
  }

  @override
  Future<void> addEvent(String coupleId, String title, String date) async {
    await client.from('calendar_events').insert({
      'couple_id': coupleId,
      'title': title.trim(),
      'event_date': date,
    });
  }

  @override
  Future<void> deleteEvent(String id) async {
    await client.from('calendar_events').delete().eq('id', id);
  }

  @override
  Future<String> memoryImage(String path) =>
      client.storage.from('memories').createSignedUrl(path, 900);
  @override
  Future<void> addNote(String coupleId, String title, String content) async {
    await client.from('memories').insert({
      'couple_id': coupleId,
      'type': 'note',
      'title': title.trim(),
      'content': content.trim(),
    });
  }
}

String friendlyError(Object error) {
  if (error is AuthException) return error.message;
  if (error is TimeoutException) return 'That took too long. Please try again.';
  if (error is PostgrestException) {
    return 'Could not save or load your data. Check your connection and try again.';
  }
  final message = error.toString().replaceFirst('Exception: ', '');
  if (message.contains('SocketException') ||
      message.contains('ClientException')) {
    return 'Could not connect. Check your internet connection and try again.';
  }
  return message;
}

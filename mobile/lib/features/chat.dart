import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';
import '../core/design.dart';
import '../core/repository.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({
    super.key,
    required this.repository,
    required this.account,
  });
  final AuraRepository repository;
  final Account account;
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final text = TextEditingController();
  late Stream<List<JsonRow>> stream;
  final history = <String, JsonRow>{};
  bool busy = false, loading = false, more = true;
  String? error, pendingId, pendingBody;
  @override
  void initState() {
    super.initState();
    connect();
  }

  void connect() {
    stream = widget.repository.watch('messages', widget.account.coupleId!);
  }

  @override
  void dispose() {
    text.dispose();
    super.dispose();
  }

  Future<void> send() async {
    final body = text.text.trim();
    if (busy || body.isEmpty) return;
    // Retain the request ID across an uncertain network outcome to avoid duplicates.
    if (pendingBody != body) {
      pendingBody = body;
      pendingId = const Uuid().v4();
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.repository.sendMessage(
        widget.account.coupleId!,
        body,
        pendingId!,
      );
      if (mounted) {
        text.clear();
        pendingId = null;
        pendingBody = null;
      }
    } catch (e) {
      if (mounted) setState(() => error = friendlyError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> loadOlder(JsonRow before) async {
    if (loading) return;
    setState(() => loading = true);
    try {
      final rows = await widget.repository.olderMessages(
        widget.account.coupleId!,
        before,
      );
      if (mounted) {
        setState(() {
          for (final r in rows) {
            history[r['id']] = r;
          }
          more = rows.length == 50;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = friendlyError(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Expanded(
        child: StreamBuilder<List<JsonRow>>(
          stream: stream,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return Center(
                child: ErrorNotice(
                  'Messages couldn’t load.',
                  retry: () => setState(connect),
                ),
              );
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final merged = {...history};
            for (final row in snapshot.data!) {
              merged[row['id']] = row;
            }
            final rows = merged.values.toList()
              ..sort((a, b) {
                final time = (b['created_at'] as String).compareTo(
                  a['created_at'],
                );
                return time == 0
                    ? (b['id'] as String).compareTo(a['id'])
                    : time;
              });
            if (rows.isEmpty) {
              return const Center(
                child: EmptyState(
                  Icons.chat_bubble_outline,
                  'Say a little hello.',
                  'Your conversation starts with one message.',
                ),
              );
            }
            return ListView.builder(
              reverse: true,
              padding: const EdgeInsets.all(20),
              itemCount: rows.length + 1,
              itemBuilder: (context, index) {
                if (index == rows.length) {
                  return more
                      ? TextButton(
                          onPressed: loading
                              ? null
                              : () => loadOlder(rows.last),
                          child: Text(
                            loading ? 'Loading…' : 'Load earlier messages',
                          ),
                        )
                      : const SizedBox(height: 16);
                }
                final row = rows[index],
                    mine = row['author_id'] == widget.account.id;
                return Align(
                  alignment: mine
                      ? Alignment.centerRight
                      : Alignment.centerLeft,
                  child: Container(
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.sizeOf(context).width * .78,
                    ),
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: mine ? rose : Colors.white,
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SelectableText(
                          row['body'],
                          style: TextStyle(
                            fontSize: 16,
                            color: mine ? Colors.white : ink,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          DateFormat.MMMd().add_jm().format(
                            DateTime.parse(row['created_at']).toLocal(),
                          ),
                          style: TextStyle(
                            fontSize: 11,
                            color: mine
                                ? Colors.white
                                : const Color(0xFF736977),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
      if (error != null)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: ErrorNotice(error!),
        ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: text,
                enabled: !busy,
                maxLength: 4000,
                minLines: 1,
                maxLines: 5,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  hintText: 'A little note for your person…',
                  labelText: 'Message',
                  counterText: '',
                ),
              ),
            ),
            const SizedBox(width: 10),
            IconButton.filled(
              onPressed: busy ? null : send,
              tooltip: 'Send message',
              icon: Icon(
                busy ? Icons.hourglass_top : Icons.arrow_upward_rounded,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

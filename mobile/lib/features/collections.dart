import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/design.dart';
import '../core/repository.dart';

class CollectionScreen extends StatefulWidget {
  const CollectionScreen({
    super.key,
    required this.repository,
    required this.account,
    required this.calendar,
  });
  final AuraRepository repository;
  final Account account;
  final bool calendar;
  @override
  State<CollectionScreen> createState() => _CollectionScreenState();
}

class _CollectionScreenState extends State<CollectionScreen> {
  late Stream<List<JsonRow>> stream;
  @override
  void initState() {
    super.initState();
    connect();
  }

  void connect() {
    stream = widget.repository.watch(
      widget.calendar ? 'calendar_events' : 'memories',
      widget.account.coupleId!,
    );
  }

  Future<void> add() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => AddEntry(
        repository: widget.repository,
        coupleId: widget.account.coupleId!,
        calendar: widget.calendar,
      ),
    );
  }

  Future<void> delete(JsonRow row) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove this event?'),
        content: Text(row['title']),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep it'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await widget.repository.deleteEvent(row['id']);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(friendlyError(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) => Stack(
    children: [
      StreamBuilder<List<JsonRow>>(
        stream: stream,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: ErrorNotice(
                'Your shared space couldn’t load.',
                retry: () => setState(connect),
              ),
            );
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final rows = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 100),
            children: [
              Text(
                widget.calendar
                    ? 'Make time for each other.'
                    : 'The little things, kept forever.',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                widget.calendar
                    ? 'Make room for your next moment together.'
                    : 'A collection of the things that matter.',
              ),
              if (rows.isEmpty)
                EmptyState(
                  widget.calendar
                      ? Icons.event_outlined
                      : Icons.auto_awesome_outlined,
                  widget.calendar
                      ? 'Something to look forward to.'
                      : 'Start your collection.',
                  widget.calendar
                      ? 'Plan a date, a walk, or a slow Sunday.'
                      : 'Save a thought you’ll both want to remember.',
                ),
              const SizedBox(height: 24),
              for (final row in rows)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFFEFE7E2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            widget.calendar
                                ? Icons.event_note_outlined
                                : Icons.favorite_outline,
                            color: rose,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              row['title'],
                              style: const TextStyle(
                                fontSize: 19,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (widget.calendar)
                            IconButton(
                              onPressed: () => delete(row),
                              tooltip: 'Remove event',
                              icon: const Icon(Icons.delete_outline),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        DateFormat.yMMMd().format(
                          DateTime.parse(
                            row[widget.calendar ? 'event_date' : 'memory_date'],
                          ),
                        ),
                      ),
                      if (!widget.calendar &&
                          (row['content'] as String).isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(
                          row['content'],
                          style: const TextStyle(height: 1.5),
                        ),
                      ],
                      if (!widget.calendar && row['type'] == 'photo') ...[
                        const SizedBox(height: 12),
                        MemoryImage(
                          repository: widget.repository,
                          path: row['image_path'],
                        ),
                      ],
                    ],
                  ),
                ),
            ],
          );
        },
      ),
      Positioned(
        right: 24,
        bottom: 20,
        child: FloatingActionButton.extended(
          onPressed: add,
          icon: const Icon(Icons.add),
          label: Text(widget.calendar ? 'Plan together' : 'Save a memory'),
        ),
      ),
    ],
  );
}

class AddEntry extends StatefulWidget {
  const AddEntry({
    super.key,
    required this.repository,
    required this.coupleId,
    required this.calendar,
  });
  final AuraRepository repository;
  final String coupleId;
  final bool calendar;
  @override
  State<AddEntry> createState() => _AddEntryState();
}

class _AddEntryState extends State<AddEntry> {
  final form = GlobalKey<FormState>();
  final title = TextEditingController(), content = TextEditingController();
  DateTime date = DateUtils.dateOnly(DateTime.now());
  bool busy = false;
  String? error;
  @override
  void dispose() {
    title.dispose();
    content.dispose();
    super.dispose();
  }

  Future<void> save() async {
    if (busy || !form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      if (widget.calendar) {
        await widget.repository.addEvent(
          widget.coupleId,
          title.text,
          DateFormat('yyyy-MM-dd').format(date),
        );
      } else {
        await widget.repository.addNote(
          widget.coupleId,
          title.text,
          content.text,
        );
      }
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) setState(() => error = friendlyError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !busy,
    child: Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        24,
        24,
        MediaQuery.viewInsetsOf(context).bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                widget.calendar ? 'A plan for two' : 'Keep this moment',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: title,
                validator: requiredText,
                maxLength: 150,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(labelText: 'Title'),
              ),
              if (widget.calendar)
                OutlinedButton.icon(
                  onPressed: busy
                      ? null
                      : () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: date,
                            firstDate: DateTime(1900),
                            lastDate: DateTime(2200),
                          );
                          if (mounted && picked != null) {
                            setState(() => date = picked);
                          }
                        },
                  icon: const Icon(Icons.calendar_month_outlined),
                  label: Text(DateFormat.yMMMd().format(date)),
                )
              else
                TextFormField(
                  controller: content,
                  minLines: 3,
                  maxLines: 6,
                  maxLength: 4000,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(labelText: 'Your memory'),
                ),
              if (error != null) ErrorNotice(error!),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: busy ? null : save,
                child: Text(busy ? 'Saving…' : 'Save for us'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class MemoryImage extends StatefulWidget {
  const MemoryImage({super.key, required this.repository, required this.path});
  final AuraRepository repository;
  final String path;
  @override
  State<MemoryImage> createState() => _MemoryImageState();
}

class _MemoryImageState extends State<MemoryImage> {
  late Future<String> url;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    url = widget.repository.memoryImage(widget.path);
    timer = Timer.periodic(const Duration(minutes: 14), (_) {
      if (mounted) refresh();
    });
  }

  void refresh() => setState(() {
    url = widget.repository.memoryImage(widget.path);
  });
  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<String>(
    future: url,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return ErrorNotice('This photo couldn’t load.', retry: refresh);
      }
      if (!snapshot.hasData) {
        return const SizedBox(
          height: 180,
          child: Center(child: CircularProgressIndicator()),
        );
      }
      return ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Image.network(
          snapshot.data!,
          fit: BoxFit.cover,
          width: double.infinity,
          height: 220,
          semanticLabel: 'Shared memory photo',
          errorBuilder: (context, error, stack) =>
              ErrorNotice('This photo couldn’t load.', retry: refresh),
        ),
      );
    },
  );
}

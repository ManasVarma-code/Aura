import 'package:flutter/material.dart';
import '../core/design.dart';
import '../core/repository.dart';
import 'chat.dart';
import 'collections.dart';
import 'onboarding.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.repository,
    required this.account,
  });
  final AuraRepository repository;
  final Account account;
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int tab = 0;
  static const titles = ['Our space', 'Just us', 'Our plans', 'Our memories'];
  void settings() => showModalBottomSheet<void>(
    context: context,
    useSafeArea: true,
    builder: (context) => Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            widget.account.name,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(widget.repository.email ?? ''),
          const SizedBox(height: 20),
          const Text('Your account is connected to your private space.'),
          const SizedBox(height: 24),
          SignOutButton(repository: widget.repository),
        ],
      ),
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(titles[tab]),
      actions: [
        IconButton(
          onPressed: settings,
          tooltip: 'Account',
          icon: const Icon(Icons.person_outline_rounded),
        ),
        const SizedBox(width: 12),
      ],
    ),
    body: SafeArea(
      child: IndexedStack(
        index: tab,
        children: [
          PageBody(
            children: [
              const SizedBox(height: 12),
              Text(
                'Hey, ${widget.account.name}.',
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 12),
              const Text(
                'A world that’s\njust for two.',
                style: TextStyle(
                  fontSize: 40,
                  height: 1.12,
                  letterSpacing: -1.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: const Color(0xFFFBE3ED),
                  borderRadius: BorderRadius.circular(30),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.favorite_rounded, color: rose, size: 32),
                    const SizedBox(height: 24),
                    Text(
                      'A little closer to ${widget.account.nickname}.',
                      style: const TextStyle(
                        fontSize: 27,
                        fontWeight: FontWeight.w600,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text('Make room for a small conversation today.'),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: () => setState(() => tab = 1),
                      child: const Text('Send a little love'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              const Text(
                'Make a little time',
                style: TextStyle(fontSize: 23, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 16),
              _HomeTile(
                icon: Icons.calendar_month_outlined,
                title: 'Something to look forward to',
                subtitle: 'Plan your next moment together',
                onTap: () => setState(() => tab = 2),
              ),
              const SizedBox(height: 12),
              _HomeTile(
                icon: Icons.auto_awesome_outlined,
                title: 'Keep the good bits',
                subtitle: 'Your collection of us',
                onTap: () => setState(() => tab = 3),
              ),
              const SizedBox(height: 28),
              const Text(
                'The small things are the big things.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF776A75)),
              ),
              const SizedBox(height: 20),
            ],
          ),
          ChatScreen(repository: widget.repository, account: widget.account),
          CollectionScreen(
            repository: widget.repository,
            account: widget.account,
            calendar: true,
          ),
          CollectionScreen(
            repository: widget.repository,
            account: widget.account,
            calendar: false,
          ),
        ],
      ),
    ),
    bottomNavigationBar: MediaQuery.viewInsetsOf(context).bottom > 0
        ? null
        : NavigationBar(
            selectedIndex: tab,
            onDestinationSelected: (value) => setState(() => tab = value),
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home_rounded),
                label: 'Us',
              ),
              NavigationDestination(
                icon: Icon(Icons.chat_bubble_outline),
                selectedIcon: Icon(Icons.chat_bubble),
                label: 'Chat',
              ),
              NavigationDestination(
                icon: Icon(Icons.calendar_month_outlined),
                selectedIcon: Icon(Icons.calendar_month),
                label: 'Plans',
              ),
              NavigationDestination(
                icon: Icon(Icons.favorite_outline),
                selectedIcon: Icon(Icons.favorite),
                label: 'Memories',
              ),
            ],
          ),
  );
}

class _HomeTile extends StatelessWidget {
  const _HomeTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    borderRadius: BorderRadius.circular(24),
    child: ListTile(
      contentPadding: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      leading: Icon(icon, color: rose),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    ),
  );
}

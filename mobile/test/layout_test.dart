import 'dart:io';
import 'dart:ui' as ui;
import 'package:aura_mobile/app.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'app_test.dart' show FakeRepository;

void main() {
  testWidgets(
    'native shell handles small screens, text scaling, and keyboard insets',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repo = FakeRepository()..userId = 'user';
      await tester.pumpWidget(AuraApp(repository: repo));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Chat'));
      await tester.pumpAndSettle();
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      tester.view.viewInsets = const FakeViewPadding(bottom: 320);
      addTearDown(tester.view.resetViewInsets);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      await repo.changes.close();
    },
  );

  testWidgets('capture actual Flutter login and home renderings', (
    tester,
  ) async {
    final font = FontLoader('Quicksand')
      ..addFont(rootBundle.load('assets/fonts/Quicksand.ttf'));
    await font.load();
    final icons = FontLoader('MaterialIcons')
      ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
    await icons.load();
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repo = FakeRepository();
    final key = GlobalKey();
    Future<void> capture(String name) async {
      await tester.pumpWidget(
        RepaintBoundary(
          key: key,
          child: AuraApp(key: ValueKey(name), repository: repo),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final boundary =
          key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      await tester.runAsync(() async {
        final image = await boundary.toImage();
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        await Directory('build/screenshots').create(recursive: true);
        await File(
          'build/screenshots/$name.png',
        ).writeAsBytes(bytes!.buffer.asUint8List());
        image.dispose();
      });
    }

    await capture('aura-native-login');
    repo.userId = 'user';
    await capture('aura-native-home');
    await tester.pumpWidget(const SizedBox());
    await repo.changes.close();
  }, skip: !const bool.fromEnvironment('CAPTURE_NATIVE'));
}

"""Cloud Android build. Use an installed JDK 21 and Android API 36 SDK."""
import os
import pathlib
import shutil
import subprocess
import tempfile
import urllib.parse

root = pathlib.Path(__file__).resolve().parents[1]
flutter = pathlib.Path('/workspace/.flutter-sdk/bin/flutter')
if not flutter.exists():
    flutter = pathlib.Path(shutil.which('flutter') or 'flutter')
environ = dict(os.environ)
environ.setdefault('ANDROID_HOME', '/workspace/.android-sdk')
environ.setdefault('GRADLE_USER_HOME', '/workspace/.gradle')
if not environ.get('JAVA_HOME'):
    candidates = sorted(pathlib.Path('/workspace/.jdks').glob('jdk-21*'))
    if candidates:
        environ['JAVA_HOME'] = str(candidates[-1])
options = environ.get('GRADLE_OPTS', '')
proxy = urllib.parse.urlparse(environ.get('HTTPS_PROXY', ''))
if proxy.hostname:
    options += f' -Dhttps.proxyHost={proxy.hostname} -Dhttps.proxyPort={proxy.port or 80} -Dhttp.proxyHost={proxy.hostname} -Dhttp.proxyPort={proxy.port or 80} -Dhttp.nonProxyHosts="localhost|127.*"'
with tempfile.TemporaryDirectory(prefix='aura-java-trust-') as directory:
    certificate = environ.get('CODEX_PROXY_CERT')
    if certificate:
        trust = pathlib.Path(directory) / 'cacerts'
        shutil.copyfile('/etc/ssl/certs/java/cacerts', trust)
        subprocess.run(['keytool', '-importcert', '-noprompt', '-alias', 'aura-session-proxy', '-file', certificate, '-keystore', str(trust), '-storepass', 'changeit'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        options += f' -Djavax.net.ssl.trustStore={trust} -Djavax.net.ssl.trustStorePassword=changeit'
    environ['GRADLE_OPTS'] = options.strip()
    subprocess.run([str(flutter), 'config', '--android-sdk', environ['ANDROID_HOME'], '--jdk-dir', environ['JAVA_HOME']], cwd=root, env=environ, check=True)
    subprocess.run([str(flutter), 'build', 'apk', '--debug', '--target-platform', 'android-arm64', '--dart-define-from-file=config/supabase.local.json'], cwd=root, env=environ, check=True)

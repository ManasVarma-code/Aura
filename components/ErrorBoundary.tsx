import React from 'react';
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="min-h-screen bg-[#FFFDF0] flex flex-col justify-center items-center gap-4 p-6">
      <h1 className="text-2xl font-bold text-pink-600">Aura needs a moment</h1>
      <p role="alert">Something went wrong while opening this page.</p>
      <button className="rounded-2xl bg-pink-500 text-white px-6 py-3" onClick={() => window.location.reload()}>Reload Aura</button>
    </main>;
    return this.props.children;
  }
}

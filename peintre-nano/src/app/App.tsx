import { LiveAuthShell } from './auth/LiveAuthShell';
import { RuntimeDemoApp } from './demo/RuntimeDemoApp';

const liveAuthEnabled = () => {
  const v = import.meta.env.VITE_LIVE_AUTH as string | undefined;
  return v === 'true' || v === '1';
};

export function App() {
  if (liveAuthEnabled()) {
    return (
      <LiveAuthShell>
        <RuntimeDemoApp />
      </LiveAuthShell>
    );
  }
  return <RuntimeDemoApp />;
}

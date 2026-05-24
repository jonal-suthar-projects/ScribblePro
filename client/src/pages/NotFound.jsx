import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="font-display text-6xl neon-text mb-4">404</h1>
      <p className="text-slate-400 mb-6">This page doesn&apos;t exist</p>
      <Link to="/">
        <Button>Back Home</Button>
      </Link>
    </div>
  );
}

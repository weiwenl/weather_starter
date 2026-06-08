import { Sidebar } from './Sidebar';
import { Hero } from './Hero';
import { ThemeSelector } from './ThemeSelector';

export function Layout() {
  return (
    <div className="flex h-full min-h-screen w-full">
      <ThemeSelector />
      <Sidebar />
      <Hero />
    </div>
  );
}

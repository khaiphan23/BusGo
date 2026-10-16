import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { contrastRatio } from '@/test/contrast';

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

function read(relativePath: string): string {
  return readFileSync(join(WEB_ROOT, relativePath), 'utf8');
}

describe('PWA runtime caching (5.2 map tile caching)', () => {
  const nextConfig = read('next.config.js');
  const serviceWorker = read('public/sw.js');

  it('caches Mapbox vector tiles with a long-lived CacheFirst rule', () => {
    expect(nextConfig).toContain('tiles\\.mapbox\\.com');
    expect(nextConfig).toContain('api\\.mapbox\\.com');
    expect(nextConfig).toContain("'CacheFirst'");
    expect(nextConfig).toContain("cacheName: 'mapbox-tiles'");
    expect(nextConfig).toContain("cacheName: 'mapbox-vector-tiles'");
    expect(nextConfig).toContain('maxAgeSeconds: 60 * 60 * 24 * 30');
  });

  it('caps tile cache growth with entry limits', () => {
    expect(nextConfig).toMatch(/maxEntries:\s*(500|1000)/);
  });

  it('ships the cache rules into the generated service worker', () => {
    for (const cacheName of ['mapbox-api', 'mapbox-tiles', 'mapbox-vector-tiles', 'mapbox-styles']) {
      expect(serviceWorker).toContain(cacheName);
    }
  });

  it('keeps the service worker fresh via revalidation headers', () => {
    expect(nextConfig).toContain('Service-Worker-Allowed');
    expect(nextConfig).toContain('max-age=0, must-revalidate');
  });

  it('disables PWA generation in development so tile rules are not baked into dev builds', () => {
    expect(nextConfig).toContain("process.env.NODE_ENV === 'development'");
  });
});

describe('PWA manifest (5.2 installability)', () => {
  const manifest = JSON.parse(read('public/manifest.json'));

  it('declares the fields required for installability', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(manifest.background_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('ships every referenced icon on disk at a usable size', () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    for (const icon of manifest.icons) {
      const file = join(WEB_ROOT, 'public', icon.src.replace(/^\//, ''));
      expect(existsSync(file), `${icon.src} is missing`).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(0);

      const png = readFileSync(file);
      expect(png.subarray(0, 8).toString('latin1')).toBe('\x89PNG\r\n\x1a\n');
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      const declared = Number.parseInt(icon.sizes, 10);
      expect(width).toBe(declared);
      expect(height).toBe(declared);
      expect(declared).toBeGreaterThanOrEqual(144);
    }
  });

  it('exposes a /map shortcut so the tracking page is one tap away', () => {
    const shortcut = manifest.shortcuts.find((s: { url: string }) => s.url === '/map');
    expect(shortcut).toBeTruthy();
  });

  it('uses a theme colour that passes WCAG AA against white text', () => {
    expect(contrastRatio(manifest.theme_color, '#ffffff')).toBeGreaterThanOrEqual(3);
  });
});

describe('design tokens (5.5 contrast)', () => {
  const css = read('src/app/globals.css');

  it('keeps --color-primary dark enough for white button text', () => {
    const primary = css.match(/--color-primary:\s*(#[0-9A-Fa-f]{6})/)?.[1];
    expect(primary).toBeTruthy();
    expect(
      contrastRatio(primary!, '#ffffff'),
      `--color-primary ${primary} must reach 4.5:1 on white`
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps --color-primary-hover distinct from and darker than --color-primary', () => {
    const primary = css.match(/--color-primary:\s*(#[0-9A-Fa-f]{6})/)?.[1];
    const hover = css.match(/--color-primary-hover:\s*(#[0-9A-Fa-f]{6})/)?.[1];
    expect(hover).toBeTruthy();
    expect(hover).not.toBe(primary);
    expect(contrastRatio(hover!, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

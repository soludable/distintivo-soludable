import { FOOTER_TEXT, EMAIL_MARCA } from '../lib/constants.js';

export default function BrandFooter() {
  return (
    <footer className="flex items-center justify-center gap-2 py-4 text-xs text-ink-faint">
      <a href={`mailto:${EMAIL_MARCA}`}>
        <img
          src="/assets/logo-doncelproject.png"
          alt="DoncelProject"
          className="h-8 w-auto"
        />
      </a>
      <span>{FOOTER_TEXT}</span>
    </footer>
  );
}

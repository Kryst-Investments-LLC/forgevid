import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

describe('i18n coverage', () => {
  const localesDir = path.join(__dirname, '../../public/locales');
  const languages = fs.readdirSync(localesDir).filter(f => fs.statSync(path.join(localesDir, f)).isDirectory());
  const keysToCheck = [
    'dashboard', 'sidebar', 'login', 'pricing', 'languageSwitcher', 'darkMode'
  ];

  languages.forEach(lang => {
    it(`should have all required keys for ${lang}`, () => {
      const file = path.join(localesDir, lang, 'common.json');
      expect(fs.existsSync(file)).toBe(true);
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      keysToCheck.forEach(key => {
        expect(json[key]).toBeDefined();
      });
    });
  });

  it('should not have missing translation keys in UI code', () => {
    const codeFiles: string[] = glob.sync(path.join(__dirname, '../../components/**/*.tsx'))
      .concat(glob.sync(path.join(__dirname, '../../app/**/*.tsx')));
    const translationRegex = /t\(['"`]([\w.]+)['"`]\)/g;
    const allKeys = new Set<string>();
    codeFiles.forEach((file: string) => {
      const content = fs.readFileSync(file, 'utf8');
      let match: RegExpExecArray | null;
      while ((match = translationRegex.exec(content)) !== null) {
        allKeys.add(match[1]);
      }
    });
    languages.forEach(lang => {
      const file = path.join(localesDir, lang, 'common.json');
      if (!fs.existsSync(file)) return;
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      allKeys.forEach((key: string) => {
        // Only check top-level keys for simplicity
        if (typeof key === 'string' && key in json) {
          expect((json as Record<string, any>)[key]).toBeDefined();
        } else {
          // Check nested keys
          const [parent, child] = (typeof key === 'string' ? key.split('.') : ['', '']);
          if (json[parent]) {
            expect(json[parent][child]).toBeDefined();
          } else {
            throw new Error(`Missing translation key '${key}' in ${lang}`);
          }
        }
      });
    });
  });
});

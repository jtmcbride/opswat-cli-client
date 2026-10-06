import { groupInflections, withArticle } from '@/lib/grammar';

describe('withArticle', () => {
  it('adds the right article per language', () => {
    expect(withArticle('de', 'Haus', 'n')).toBe('das Haus');
    expect(withArticle('es', 'casa', 'f')).toBe('la casa');
    expect(withArticle('es', 'artista', 'fm')).toBe('el/la artista');
    expect(withArticle('fr', 'homme', 'm')).toBe("l'homme (m.)");
    expect(withArticle('fr', 'maison', 'f')).toBe('la maison');
    expect(withArticle('it', 'studente', 'm')).toBe('lo studente');
    expect(withArticle('it', 'libro', 'm')).toBe('il libro');
    expect(withArticle('pt', 'casa', 'f')).toBe('a casa');
    expect(withArticle('es', 'correr')).toBe('correr');
    expect(withArticle('hr', 'kuća', 'f')).toBe('kuća (f.)');
  });
});

describe('groupInflections', () => {
  it('names German subjunctives and merges indicative/headword duplicates', () => {
    const sections = groupInflections('de', [
      ['hat', ['present', 'singular', 'third-person']],
      ['habe', ['first-person', 'indicative', 'present', 'singular']],
      ['hätte', ['first-person', 'singular', 'subjunctive', 'subjunctive-ii']],
    ]);
    expect(sections.map((s) => s.title)).toEqual(['Present', 'Subjunctive II']);
    expect(sections[0].rows.map((r) => r.label)).toEqual(['er/sie/es', 'ich']);
  });

  it('uses Croatian pronouns for person rows', () => {
    const sections = groupInflections('hr', [
      ['gledam', ['present', 'first-person', 'singular']],
      ['gledaju', ['present', 'third-person', 'plural']],
    ]);
    expect(sections[0].rows.map((r) => r.label)).toEqual(['ja', 'oni/one/ona']);
  });

  it('groups conjugations by tense with pronoun rows, and other forms separately', () => {
    const sections = groupInflections('es', [
      ['tener', ['infinitive']],
      ['tengo', ['first-person', 'indicative', 'present', 'singular']],
      ['tienes', ['indicative', 'informal', 'present', 'second-person', 'singular']],
      ['tiene', ['indicative', 'present', 'singular', 'third-person']],
      ['tenés', ['indicative', 'present', 'second-person', 'singular', 'vos-form']],
      ['tiene', ['formal', 'indicative', 'present', 'second-person', 'singular']],
      ['tuve', ['first-person', 'preterite', 'singular']],
      ['tenga', ['first-person', 'present', 'singular', 'subjunctive']],
      ['tenido', ['participle', 'past']],
      ['tenga', ['formal', 'imperative', 'second-person-semantically', 'singular', 'third-person']],
      ['ten', ['imperative', 'informal', 'second-person', 'singular']],
    ]);
    expect(sections.map((s) => s.title)).toEqual(['Present', 'Preterite', 'Present subjunctive', 'Imperative', 'Other forms']);
    expect(sections[3].rows).toEqual([
      { label: 'usted', forms: ['tenga'] },
      { label: 'tú', forms: ['ten'] },
    ]);
    expect(sections[0].rows).toEqual([
      { label: 'yo', forms: ['tengo'] },
      { label: 'tú', forms: ['tienes'] },
      { label: 'él/ella', forms: ['tiene'] },
      { label: 'vos', forms: ['tenés'] },
      { label: 'usted', forms: ['tiene'] },
    ]);
    expect(sections[4].rows).toEqual([
      { label: 'Infinitive', forms: ['tener'] },
      { label: 'Past participle', forms: ['tenido'] },
    ]);
  });

  it('lists noun forms by case and number', () => {
    const [s] = groupInflections('de', [
      ['Hauses', ['genitive', 'singular']],
      ['Häuser', ['nominative', 'plural', 'definite']],
    ]);
    expect(s.rows.map((r) => r.label)).toEqual(['Genitive singular', 'Nominative plural']);
  });
});

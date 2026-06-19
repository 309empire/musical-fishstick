import { createContext, useContext, useState, useEffect } from "react";

export type Locale = "en" | "pt" | "de";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    "nav.dashboard": "Home",
    "nav.profile": "Profile",
    "nav.links": "Links",
    "nav.badges": "Badges",
    "nav.options": "Options",
    "nav.extras": "Extras",
    "nav.shop": "Shop",
    "nav.logout": "Log Out",
    "nav.viewProfile": "View Profile",
    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Manage your Hexed profile",
    "dashboard.welcome": "Welcome back",
    "dashboard.views": "views",
    "dashboard.likes": "likes",
    "links.add": "Add Link",
    "links.title": "Links",
    "links.desc": "Add social platforms and custom links",
    "links.empty": "No links yet",
    "links.empty.sub": "Add your social platforms and websites above",
    "tracks.title": "Tracks",
    "tracks.desc": "Manage music tracks for your profile player",
    "tracks.add": "Add Track",
    "tracks.empty": "No tracks yet",
    "tracks.volume": "Player Volume",
    "tracks.search": "Search on Spotify",
    "tracks.search.placeholder": "Search Spotify songs...",
    "tracks.use": "Use Sound",
    "tracks.premium": "Premium Only",
    "badges.title": "Badges",
    "badges.desc": "Showcase your achievements and roles",
    "badges.sync": "Sync Roles",
    "profile.title": "Profile",
    "profile.desc": "Customize your public profile",
    "profile.save": "Save",
    "extras.title": "Extras",
    "extras.desc": "Extra features for your profile",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.save": "Save",
    "common.add": "Add",
    "lang.select": "Language",
    "lang.change": "Change Language",
    "lang.select.title": "Select Language",
    "shop.title": "Shop",
    "shop.desc": "Browse and unlock premium features",
  },
  pt: {
    "nav.dashboard": "Início",
    "nav.profile": "Perfil",
    "nav.links": "Links",
    "nav.badges": "Emblemas",
    "nav.options": "Opções",
    "nav.extras": "Extras",
    "nav.shop": "Loja",
    "nav.logout": "Sair",
    "nav.viewProfile": "Ver Perfil",
    "dashboard.title": "Painel",
    "dashboard.subtitle": "Gerencie seu perfil Hexed",
    "dashboard.welcome": "Bem-vindo de volta",
    "dashboard.views": "visualizações",
    "dashboard.likes": "curtidas",
    "links.add": "Adicionar Link",
    "links.title": "Links",
    "links.desc": "Adicione plataformas sociais e links personalizados",
    "links.empty": "Nenhum link ainda",
    "links.empty.sub": "Adicione suas plataformas e sites acima",
    "tracks.title": "Faixas",
    "tracks.desc": "Gerencie as faixas de música do seu perfil",
    "tracks.add": "Adicionar Faixa",
    "tracks.empty": "Nenhuma faixa ainda",
    "tracks.volume": "Volume do Player",
    "tracks.search": "Pesquisar no Spotify",
    "tracks.search.placeholder": "Pesquisar músicas no Spotify...",
    "tracks.use": "Usar Som",
    "tracks.premium": "Apenas Premium",
    "badges.title": "Emblemas",
    "badges.desc": "Mostre suas conquistas e cargos",
    "badges.sync": "Sincronizar Cargos",
    "profile.title": "Perfil",
    "profile.desc": "Personalize seu perfil público",
    "profile.save": "Salvar",
    "extras.title": "Extras",
    "extras.desc": "Recursos extras para o seu perfil",
    "common.cancel": "Cancelar",
    "common.delete": "Excluir",
    "common.edit": "Editar",
    "common.save": "Salvar",
    "common.add": "Adicionar",
    "lang.select": "Idioma",
    "lang.change": "Mudar Idioma",
    "lang.select.title": "Selecionar Idioma",
    "shop.title": "Loja",
    "shop.desc": "Explore e desbloqueie recursos premium",
  },
  de: {
    "nav.dashboard": "Startseite",
    "nav.profile": "Profil",
    "nav.links": "Links",
    "nav.badges": "Abzeichen",
    "nav.options": "Optionen",
    "nav.extras": "Extras",
    "nav.shop": "Shop",
    "nav.logout": "Abmelden",
    "nav.viewProfile": "Profil anzeigen",
    "dashboard.title": "Übersicht",
    "dashboard.subtitle": "Verwalte dein Hexed-Profil",
    "dashboard.welcome": "Willkommen zurück",
    "dashboard.views": "Aufrufe",
    "dashboard.likes": "Gefällt mir",
    "links.add": "Link hinzufügen",
    "links.title": "Links",
    "links.desc": "Füge soziale Plattformen und Links hinzu",
    "links.empty": "Noch keine Links",
    "links.empty.sub": "Füge oben deine Plattformen hinzu",
    "tracks.title": "Tracks",
    "tracks.desc": "Musik-Tracks für deinen Profil-Player verwalten",
    "tracks.add": "Track hinzufügen",
    "tracks.empty": "Noch keine Tracks",
    "tracks.volume": "Player-Lautstärke",
    "tracks.search": "Spotify durchsuchen",
    "tracks.search.placeholder": "Spotify-Songs suchen...",
    "tracks.use": "Sound verwenden",
    "tracks.premium": "Nur Premium",
    "badges.title": "Abzeichen",
    "badges.desc": "Zeige deine Erfolge und Rollen",
    "badges.sync": "Rollen synchronisieren",
    "profile.title": "Profil",
    "profile.desc": "Passe dein öffentliches Profil an",
    "profile.save": "Speichern",
    "extras.title": "Extras",
    "extras.desc": "Zusatzfunktionen für dein Profil",
    "common.cancel": "Abbrechen",
    "common.delete": "Löschen",
    "common.edit": "Bearbeiten",
    "common.save": "Speichern",
    "common.add": "Hinzufügen",
    "lang.select": "Sprache",
    "lang.change": "Sprache ändern",
    "lang.select.title": "Sprache auswählen",
    "shop.title": "Shop",
    "shop.desc": "Entdecke und schalte Premium-Funktionen frei",
  },
};

const LANG_FLAGS: Record<Locale, string> = { en: "🇬🇧", pt: "🇧🇷", de: "🇩🇪" };
const LANG_NAMES: Record<Locale, string> = { en: "English", pt: "Português", de: "Deutsch" };

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
  LANG_FLAGS: typeof LANG_FLAGS;
  LANG_NAMES: typeof LANG_NAMES;
}>({
  locale: "en",
  setLocale: () => {},
  t: (k, fb) => fb || k,
  LANG_FLAGS,
  LANG_NAMES,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("hexed_lang") as Locale;
    return (saved && ["en", "pt", "de"].includes(saved)) ? saved : "en";
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("hexed_lang", l);
  };

  const t = (key: string, fallback?: string): string => {
    return translations[locale][key] || translations.en[key] || fallback || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, LANG_FLAGS, LANG_NAMES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, LANG_FLAGS, LANG_NAMES } = useI18n();
  const [open, setOpen] = useState(false);
  const locales: Locale[] = ["en", "pt", "de"];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/40 hover:border-white/20 transition-all text-xs font-bold text-gray-300"
      >
        <span>{LANG_FLAGS[locale]}</span>
        <span>{LANG_NAMES[locale]}</span>
        <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-xl min-w-[140px]">
          {locales.map(l => (
            <button
              key={l}
              onClick={() => { setLocale(l); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors ${locale === l ? "bg-orange-500/10 text-orange-500" : "text-gray-300 hover:bg-white/5"}`}
            >
              <span>{LANG_FLAGS[l]}</span>
              <span>{LANG_NAMES[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LanguageSwitcherEdge() {
  const { locale, setLocale, LANG_FLAGS, LANG_NAMES } = useI18n();
  const [open, setOpen] = useState(false);
  const locales: Locale[] = ["en", "pt", "de"];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        data-testid="button-change-language"
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 bg-black/40 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all text-xs font-bold text-gray-300"
      >
        <span className="text-sm">{LANG_FLAGS[locale]}</span>
        <span>{LANG_NAMES[locale]}</span>
        <svg className={`w-2.5 h-2.5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 right-0 z-50 bg-[#0e0e0e] border border-white/10 rounded-xl overflow-hidden shadow-xl min-w-[140px] p-1">
            {locales.map(l => (
              <button
                key={l}
                data-testid={`button-lang-${l}`}
                onClick={() => { setLocale(l); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  locale === l ? "bg-orange-500 text-black" : "text-gray-300 hover:bg-white/5"
                }`}
              >
                <span>{LANG_FLAGS[l]}</span>
                <span>{LANG_NAMES[l]}</span>
                {locale === l && (
                  <svg className="w-3 h-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

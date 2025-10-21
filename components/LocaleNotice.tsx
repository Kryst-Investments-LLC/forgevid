"use client";
import React from 'react';
import { useLocale } from 'next-intl';

interface LocaleNoticeProps {
  pageType: 'privacy' | 'terms' | 'security' | 'accessibility' | 'dpa' | 'subprocessors' | 'do-not-sell';
}

const notices: Record<string, Record<string, string>> = {
  privacy: {
    en: 'Official Privacy Policy (English).',
    es: 'Política de Privacidad oficial (inglés). Próximamente versión localizada.',
    hi: 'आधिकारिक गोपनीयता नीति (अंग्रेज़ी)। स्थानीयकृत संस्करण जल्द उपलब्ध होगा।',
    zh: '官方隐私政策（英文）。本地化版本即将推出。',
    ja: '公式のプライバシーポリシー（英語）。ローカライズ版は近日公開。',
    fr: 'Politique de Confidentialité officielle (anglais). Version localisée à venir.',
    it: 'Informativa sulla Privacy ufficiale (inglese). Versione localizzata in arrivo.',
    ko: '공식 개인정보 처리방침(영어). 현지화 버전이 곧 제공됩니다.',
    pt: 'Política de Privacidade oficial (inglês). Versão localizada em breve.',
    de: 'Offizielle Datenschutzrichtlinie (Englisch). Lokalisierte Version folgt.'
  },
  terms: {
    en: 'Official Terms of Service (English).',
    es: 'Términos de Servicio oficiales (inglés). Próximamente versión localizada.',
    hi: 'आधिकारिक सेवा की शर्तें (अंग्रेज़ी)। स्थानीयकृत संस्करण जल्द उपलब्ध होगा।',
    zh: '官方服务条款（英文）。本地化版本即将推出。',
    ja: '公式の利用規約（英語）。ローカライズ版は近日公開。',
    fr: 'Conditions d\'Utilisation officielles (anglais). Version localisée à venir.',
    it: 'Termini di Servizio ufficiali (inglese). Versione localizzata in arrivo.',
    ko: '공식 서비스 약관(영어). 현지화 버전이 곧 제공됩니다.',
    pt: 'Termos de Serviço oficiais (inglês). Versão localizada em breve.',
    de: 'Offizielle Nutzungsbedingungen (Englisch). Lokalisierte Version folgt.'
  },
  security: {
    en: 'Official Security Policy (English).',
    es: 'Política de Seguridad oficial (inglés). Próximamente versión localizada.',
    hi: 'आधिकारिक सुरक्षा नीति (अंग्रेज़ी)। स्थानीयकृत संस्करण जल्द उपलब्ध होगा।',
    zh: '官方安全政策（英文）。本地化版本即将推出。',
    ja: '公式のセキュリティポリシー（英語）。ローカライズ版は近日公開。',
    fr: 'Politique de Sécurité officielle (anglais). Version localisée à venir.',
    it: 'Politica di Sicurezza ufficiale (inglese). Versione localizzata in arrivo.',
    ko: '공식 보안 정책(영어). 현지화 버전이 곧 제공됩니다.',
    pt: 'Política de Segurança oficial (inglês). Versão localizada em breve.',
    de: 'Offizielle Sicherheitsrichtlinie (Englisch). Lokalisierte Version folgt.'
  },
  accessibility: {
    en: 'Official Accessibility Statement (English).',
    es: 'Declaración de Accesibilidad oficial (inglés). Próximamente versión localizada.',
    hi: 'आधिकारिक पहुंच योग्यता बयान (अंग्रेज़ी)। स्थानीयकृत संस्करण जल्द उपलब्ध होगा।',
    zh: '官方无障碍声明（英文）。本地化版本即将推出。',
    ja: '公式のアクセシビリティステートメント（英語）。ローカライズ版は近日公開。',
    fr: 'Déclaration d\'Accessibilité officielle (anglais). Version localisée à venir.',
    it: 'Dichiarazione di Accessibilità ufficiale (inglese). Versione localizzata in arrivo.',
    ko: '공식 접근성 성명(영어). 현지화 버전이 곧 제공됩니다.',
    pt: 'Declaração de Acessibilidade oficial (inglês). Versão localizada em breve.',
    de: 'Offizielle Barrierefreiheitserklärung (Englisch). Lokalisierte Version folgt.'
  },
  dpa: {
    en: 'Official Data Processing Addendum (English).',
    es: 'Anexo de Procesamiento de Datos oficial (inglés). Próximamente versión localizada.',
    hi: 'आधिकारिक डेटा प्रोसेसिंग एडेंडम (अंग्रेज़ी)। स्थानीयकृत संस्करण जल्द उपलब्ध होगा।',
    zh: '官方数据处理附录（英文）。本地化版本即将推出。',
    ja: '公式のデータ処理付録（英語）。ローカライズ版は近日公開。',
    fr: 'Annexe de Traitement des Données officielle (anglais). Version localisée à venir.',
    it: 'Allegato di Elaborazione Dati ufficiale (inglese). Versione localizzata in arrivo.',
    ko: '공식 데이터 처리 부록(영어). 현지화 버전이 곧 제공됩니다.',
    pt: 'Anexo de Processamento de Dados oficial (inglês). Versão localizada em breve.',
    de: 'Offizieller Datenverarbeitungszusatz (Englisch). Lokalisierte Version folgt.'
  },
  subprocessors: {
    en: 'Official Subprocessors List (English).',
    es: 'Lista de Subprocesadores oficial (inglés). Próximamente versión localizada.',
    hi: 'आधिकारिक सबप्रोसेसर सूची (अंग्रेज़ी)। स्थानीयकृत संस्करण जल्द उपलब्ध होगा।',
    zh: '官方子处理器列表（英文）。本地化版本即将推出。',
    ja: '公式のサブプロセッサーリスト（英語）。ローカライズ版は近日公開。',
    fr: 'Liste des Sous-traitants officielle (anglais). Version localisée à venir.',
    it: 'Elenco dei Subappaltatori ufficiale (inglese). Versione localizzata in arrivo.',
    ko: '공식 하위 처리자 목록(영어). 현지화 버전이 곧 제공됩니다.',
    pt: 'Lista de Subprocessadores oficial (inglês). Versão localizada em breve.',
    de: 'Offizielle Unterauftragnehmerliste (Englisch). Lokalisierte Version folgt.'
  },
  'do-not-sell': {
    en: 'Official Do Not Sell/Share Policy (English).',
    es: 'Política de No Vender/Compartir oficial (inglés). Próximamente versión localizada.',
    hi: 'आधिकारिक न बेचें/साझा करें नीति (अंग्रेज़ी)। स्थानीयकृत संस्करण जल्द उपलब्ध होगा।',
    zh: '官方不出售/共享政策（英文）。本地化版本即将推出。',
    ja: '公式の販売/共有禁止ポリシー（英語）。ローカライズ版は近日公開。',
    fr: 'Politique de Non-Vente/Partage officielle (anglais). Version localisée à venir.',
    it: 'Politica di Non Vendita/Condivisione ufficiale (inglese). Versione localizzata in arrivo.',
    ko: '공식 판매/공유 금지 정책(영어). 현지화 버전이 곧 제공됩니다.',
    pt: 'Política de Não Vender/Compartilhar oficial (inglês). Versão localizada em breve.',
    de: 'Offizielle Nicht-Verkaufs-/Teilungsrichtlinie (Englisch). Lokalisierte Version folgt.'
  }
};

export default function LocaleNotice({ pageType }: LocaleNoticeProps) {
  const locale = useLocale();
  const notice = notices[pageType]?.[locale] || notices[pageType]?.en || 'Official document (English).';

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 px-4 py-3 text-sm mb-6">
      {notice}
    </div>
  );
}

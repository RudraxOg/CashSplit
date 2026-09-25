import React from 'react';
import { MarketingNavbar } from '../components/MarketingNavbar';

const COPY = {
  privacy: ['Privacy Policy', 'RoomMate stores account and household information needed to provide shared expense, chore, shopping, and invitation features. Household data is visible only to authorized members. Contact hello@roommate.app to request access or deletion.'],
  terms: ['Terms of Service', 'Use RoomMate only for households and groups you are authorized to manage. Keep account credentials secure and verify financial records before making payments. RoomMate is an organizational tool and not a bank or payment processor.'],
};

export default function LegalPage({ type }) {
  const [title, body] = COPY[type] || COPY.privacy;
  return <div className="rm-marketing min-h-dvh"><MarketingNavbar /><main className="max-w-3xl mx-auto px-6 py-28"><p className="rm-eyebrow">ROOMMATE</p><h1 className="text-4xl font-bold mb-6">{title}</h1><p className="rm-text-secondary leading-7">{body}</p><p className="rm-text-secondary leading-7 mt-4">Last updated 24 September 2026. This concise project policy should be reviewed by qualified counsel before a public commercial launch.</p></main></div>;
}

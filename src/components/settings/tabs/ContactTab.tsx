import React from 'react';
import {
  Heart,
  HeartHandshake,
  ExternalLink,
  Copy,
  Coffee,
  User,
  Github,
  Linkedin,
  Youtube,
  MessageCircle,
  Mail,
} from 'lucide-react';
import { SOCIAL_CONTACT_LINKS, type SocialContactLink } from '../data/contactLinks';

interface ContactTabProps {
  isLight: boolean;
  onCopyBkash: () => void;
}

function renderSocialIcon(id: SocialContactLink['id']) {
  switch (id) {
    case 'github':
      return <Github className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />;
    case 'linkedin':
      return <Linkedin className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />;
    case 'youtube':
      return <Youtube className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />;
    case 'whatsapp':
      return <MessageCircle className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />;
    case 'email-primary':
      return <Mail className="w-4 h-4 text-amber-500 flex-shrink-0 group-hover:scale-110 transition-transform" />;
    case 'email-secondary':
      return <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0 group-hover:scale-110 transition-transform" />;
  }
}

export const ContactTab: React.FC<ContactTabProps> = ({ isLight, onCopyBkash }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-100">
      {/* Developer Profile Header */}
      <div
        className={`p-5 rounded-2xl border ${
          isLight
            ? 'bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 border-slate-200 shadow-sm'
            : 'bg-gradient-to-r from-slate-950/80 via-blue-950/30 to-slate-950/80 border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <img
            src="/developer-pfp.png"
            alt="Abu Dojana Tahmid"
            className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-lg shadow-indigo-500/20 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Abu Dojana Tahmid
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-500 border border-blue-500/25">
                Creator & Developer
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-400 border border-purple-500/25">
                SpaceTabs — Tab Manager
              </span>
            </div>
            <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Hi there! I designed and built SpaceTabs to give power users a clean, fast, privacy-first workspace manager with zero paywalls. If SpaceTabs helps you declutter your browser and saves you time, your support helps me continue actively developing and maintaining this project!
            </p>
          </div>
        </div>
      </div>

      {/* Section: Support & Donations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/30" />
            <h4
              className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              Support & Donations
            </h4>
          </div>
          <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            International & Bangladesh local payment options
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. SupportKori */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between transition ${
              isLight
                ? 'bg-rose-50/60 hover:bg-rose-50 border-rose-200'
                : 'bg-rose-950/20 hover:bg-rose-950/30 border-rose-900/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-rose-500">
                  <HeartHandshake className="w-4 h-4" />
                  <span>SupportKori (Bangladesh)</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/20">
                  bKash / Nagad / Rocket
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Ideal for supporters in Bangladesh. Easily tip or donate using bKash, Nagad, Rocket, or local debit/credit cards.
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-rose-500/15">
              <a
                href="https://www.supportkori.com/abudojana"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition cursor-pointer"
              >
                <span>Donate on SupportKori</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 2. bKash Personal Direct */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between transition ${
              isLight
                ? 'bg-pink-50/60 hover:bg-pink-50 border-pink-200'
                : 'bg-pink-950/20 hover:bg-pink-950/30 border-pink-900/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-pink-500">
                  <span className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-extrabold">
                    ৳
                  </span>
                  <span>bKash Personal Direct</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-500 border border-pink-500/20">
                  Direct Transfer
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Send Money or Cash In directly to personal bKash number:
              </p>
              <div
                className={`mt-2 font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${
                  isLight
                    ? 'bg-white border-pink-200 text-pink-700'
                    : 'bg-slate-900 border-pink-800 text-pink-300'
                }`}
              >
                <span>+8801521566157</span>
                <span className="text-[10px] text-pink-500 font-sans font-normal">Personal</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-pink-500/15">
              <button
                onClick={onCopyBkash}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs bg-pink-600 hover:bg-pink-500 text-white shadow-sm transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy bKash Number</span>
              </button>
            </div>
          </div>

          {/* 3. Patreon */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between transition ${
              isLight
                ? 'bg-amber-50/60 hover:bg-amber-50 border-amber-200'
                : 'bg-amber-950/20 hover:bg-amber-950/30 border-amber-900/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-500">
                  <Heart className="w-4 h-4 fill-amber-500/40" />
                  <span>Patreon</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/20">
                  International / Payoneer
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Support monthly or one-time via international credit/debit cards. Deposits directly via Payoneer.
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-amber-500/15">
              <a
                href="https://patreon.com/abudojana"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white shadow-sm transition cursor-pointer"
              >
                <span>Support on Patreon</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 4. SociaBuzz */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between transition ${
              isLight
                ? 'bg-sky-50/60 hover:bg-sky-50 border-sky-200'
                : 'bg-sky-950/20 hover:bg-sky-950/30 border-sky-900/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-sky-500">
                  <Coffee className="w-4 h-4" />
                  <span>SociaBuzz</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-500 border border-sky-500/20">
                  Global Tip & Tribe
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Leave a quick one-time tip or join the tribe from anywhere in the world with global payment methods.
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-sky-500/15">
              <a
                href="https://sociabuzz.com/abudojana/tribe"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition cursor-pointer"
              >
                <span>Support on SociaBuzz</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Connect & Socials */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            <h4
              className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              Connect & Contact
            </h4>
          </div>
          <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Feedback, feature requests & collaborations
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SOCIAL_CONTACT_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition group ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {renderSocialIcon(link.id)}
                <div className="min-w-0">
                  <div>{link.title}</div>
                  <div
                    className={`text-[10px] font-normal truncate ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {link.subtitle}
                  </div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Building, Sliders, Pencil, MapPin } from 'lucide-react';

interface CompanyProfileCardsProps {
  taName: string;
  onTaNameChange: (v: string) => void;
  taSubtitle: string;
  onTaSubtitleChange: (v: string) => void;
  taEmail: string;
  taAddress: string;
  taVat: string;
  taPhone: string;
  taCurrency: string;
  taTaxRate: string;
  mmName: string;
  onMmNameChange: (v: string) => void;
  mmSubtitle: string;
  onMmSubtitleChange: (v: string) => void;
  mmEmail: string;
  mmAddress: string;
  mmVat: string;
  mmPhone: string;
  mmCurrency: string;
  mmTaxRate: string;
  onEditCompany: (company: 'TA' | 'MM') => void;
}

export default function CompanyProfileCards({
  taName, onTaNameChange, taSubtitle, onTaSubtitleChange,
  taEmail, taAddress, taVat, taPhone, taCurrency, taTaxRate,
  mmName, onMmNameChange, mmSubtitle, onMmSubtitleChange,
  mmEmail, mmAddress, mmVat, mmPhone, mmCurrency, mmTaxRate,
  onEditCompany
}: CompanyProfileCardsProps) {
  return (
    <section id="general-profiles-section" className="space-y-2">
      <div className="flex items-center gap-2">
        <Building className="w-4 h-4 text-primary" />
        <h3 className="text-[14px] font-semibold text-on-surface">General Profiles</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Transport Action Card */}
        <div id="profile-card-ta" className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant hover:bg-surface-dim/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sliders className="w-5 h-5 text-primary" />
              </div>
              <div>
                <input
                  value={taName}
                  onChange={(e) => onTaNameChange(e.target.value)}
                  className="text-[14px] font-semibold text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary outline-none w-full"
                />
                <input
                  value={taSubtitle}
                  onChange={(e) => onTaSubtitleChange(e.target.value)}
                  className="text-[11px] text-primary font-medium bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary outline-none w-full"
                />
              </div>
            </div>
            <button 
              id="edit-profile-ta-btn"
              onClick={() => onEditCompany('TA')}
              className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-primary" />
            </button>
          </div>
          
          <div className="space-y-2 text-[12px]">
            <div>
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Contact</label>
              <p className="text-on-surface font-medium">{taEmail}</p>
            </div>
            <div>
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Address</label>
              <p className="text-on-surface-variant flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" /> {taAddress}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant/50">
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">VAT</label>
                <p className="text-on-surface font-medium">{taVat || '—'}</p>
              </div>
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Phone</label>
                <p className="text-on-surface font-medium">{taPhone || '—'}</p>
              </div>
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Currency</label>
                <p className="text-on-surface font-medium">{taCurrency}</p>
              </div>
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Tax Rate</label>
                <p className="text-on-surface font-medium">{taTaxRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Movie Motion Card */}
        <div id="profile-card-mm" className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant hover:bg-surface-dim/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Building className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <input
                  value={mmName}
                  onChange={(e) => onMmNameChange(e.target.value)}
                  className="text-[14px] font-semibold text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary outline-none w-full"
                />
                <input
                  value={mmSubtitle}
                  onChange={(e) => onMmSubtitleChange(e.target.value)}
                  className="text-[11px] text-secondary font-medium bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary outline-none w-full"
                />
              </div>
            </div>
            <button 
              id="edit-profile-mm-btn"
              onClick={() => onEditCompany('MM')}
              className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-secondary" />
            </button>
          </div>
          
          <div className="space-y-2 text-[12px]">
            <div>
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Contact</label>
              <p className="text-on-surface font-medium">{mmEmail}</p>
            </div>
            <div>
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Address</label>
              <p className="text-on-surface-variant flex items-center gap-1">
                <MapPin className="w-3 h-3 text-secondary" /> {mmAddress}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant/50">
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">VAT</label>
                <p className="text-on-surface font-medium">{mmVat || '—'}</p>
              </div>
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Phone</label>
                <p className="text-on-surface font-medium">{mmPhone || '—'}</p>
              </div>
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Currency</label>
                <p className="text-on-surface font-medium">{mmCurrency}</p>
              </div>
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Tax Rate</label>
                <p className="text-on-surface font-medium">{mmTaxRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

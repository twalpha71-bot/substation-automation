import React, { useState } from 'react';
import { ArrowRight, Search, Zap } from 'lucide-react';
import { SubstationBrand } from '../components/SubstationBrand';

type Destination = { label: string; tab: string };

export function SubstationLandingPage({
  onEnter,
  destinations,
  accountControls,
}: {
  onEnter: (tab?: string) => void;
  destinations: Destination[];
  accountControls?: React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [videoFailed, setVideoFailed] = useState(false);
  const videoSrc =
    (typeof window !== 'undefined' && (window as unknown as { __SAS_VIDEO_URL__?: string }).__SAS_VIDEO_URL__) ||
    'assets/video/substation-opening.mp4';
  const matches = query.trim()
    ? destinations
        .filter((d) => d.label.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  return (
    <main className="sas-landing" aria-label="Substation Automation landing page">
      {!videoFailed && (
        <video
          className="sas-landing-video"
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={() => setVideoFailed(true)}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
      <div className="sas-landing-shade" aria-hidden="true" />
      <header className="sas-landing-brand">
        <SubstationBrand variant="opening" />
      </header>
      <div className="sas-landing-account">{accountControls}</div>
      <section className="sas-landing-center">
        <form
          className="sas-landing-search-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            onEnter(matches[0]?.tab);
          }}
        >
          <Search size={26} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, labs, protocols, or learning modules..."
            aria-label="Search Substation Automation"
          />
          {matches.length > 0 && (
            <div className="sas-landing-results" role="listbox" aria-label="Search results">
              {matches.map((d) => (
                <button type="button" key={d.tab} onClick={() => onEnter(d.tab)}>
                  {d.label}
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          )}
        </form>
        <button className="sas-landing-enter" type="button" onClick={() => onEnter()}>
          <Zap size={23} />
          <span>Go To Substation Automation</span>
          <ArrowRight size={25} />
        </button>
      </section>
      <footer className="sas-landing-copyright" aria-label="Copyright notice">
        © {new Date().getFullYear()} Substation Automation Engineering Hub. All rights reserved.
      </footer>
    </main>
  );
}

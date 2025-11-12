/**
 * AnalysisPanel Component
 *
 * Displays extracted information from AI document analysis
 */

import React, { useState } from 'react';
import type { ExtractedData } from '../../types/demand-letter';
import styles from './AnalysisPanel.module.css';

export interface AnalysisPanelProps {
  extractedData: ExtractedData | null;
  isAnalyzing?: boolean;
}

type AnalysisSection = 'parties' | 'incident' | 'damages' | 'timeline' | 'claims';

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  extractedData,
  isAnalyzing = false,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<AnalysisSection>>(
    new Set(['parties', 'incident', 'damages'])
  );

  const toggleSection = (section: AnalysisSection) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  if (isAnalyzing) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Analysis Results</h2>
        </div>
        <div className={styles.analyzing}>
          <div className={styles.spinner} />
          <p>Analyzing documents...</p>
        </div>
      </div>
    );
  }

  if (!extractedData || Object.keys(extractedData).length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Analysis Results</h2>
        </div>
        <div className={styles.empty}>
          <p>No analysis results yet</p>
          <p className={styles.emptyHint}>
            Upload documents to start analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Analysis Results</h2>
      </div>
      <div className={styles.content}>
        {extractedData.parties && extractedData.parties.length > 0 && (
          <AnalysisSection
            title="Parties"
            count={extractedData.parties.length}
            isExpanded={expandedSections.has('parties')}
            onToggle={() => toggleSection('parties')}
          >
            <PartiesContent parties={extractedData.parties} />
          </AnalysisSection>
        )}

        {extractedData.incident && (
          <AnalysisSection
            title="Incident"
            isExpanded={expandedSections.has('incident')}
            onToggle={() => toggleSection('incident')}
          >
            <IncidentContent incident={extractedData.incident} />
          </AnalysisSection>
        )}

        {extractedData.damages && extractedData.damages.length > 0 && (
          <AnalysisSection
            title="Damages"
            count={extractedData.damages.length}
            isExpanded={expandedSections.has('damages')}
            onToggle={() => toggleSection('damages')}
          >
            <DamagesContent damages={extractedData.damages} />
          </AnalysisSection>
        )}

        {extractedData.timeline && extractedData.timeline.length > 0 && (
          <AnalysisSection
            title="Timeline"
            count={extractedData.timeline.length}
            isExpanded={expandedSections.has('timeline')}
            onToggle={() => toggleSection('timeline')}
          >
            <TimelineContent timeline={extractedData.timeline} />
          </AnalysisSection>
        )}

        {extractedData.claims && extractedData.claims.length > 0 && (
          <AnalysisSection
            title="Legal Claims"
            count={extractedData.claims.length}
            isExpanded={expandedSections.has('claims')}
            onToggle={() => toggleSection('claims')}
          >
            <ClaimsContent claims={extractedData.claims} />
          </AnalysisSection>
        )}
      </div>
    </div>
  );
};

interface AnalysisSectionProps {
  title: string;
  count?: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  title,
  count,
  isExpanded,
  onToggle,
  children,
}) => {
  return (
    <div className={styles.section}>
      <button
        className={styles.sectionHeader}
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span className={styles.sectionTitle}>
          {title}
          {count !== undefined && (
            <span className={styles.sectionCount}>{count}</span>
          )}
        </span>
        <span className={styles.chevron}>{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && <div className={styles.sectionContent}>{children}</div>}
    </div>
  );
};

const PartiesContent: React.FC<{ parties: ExtractedData['parties'] }> = ({
  parties,
}) => {
  if (!parties) return null;

  return (
    <div className={styles.partiesList}>
      {parties.map((party, index) => (
        <div key={index} className={styles.partyItem}>
          <div className={styles.partyHeader}>
            <span className={styles.partyType}>{party.type}</span>
            <span className={styles.partyName}>{party.name}</span>
          </div>
          {party.role && <div className={styles.partyRole}>{party.role}</div>}
          {party.contact && (
            <div className={styles.contactInfo}>
              {party.contact.address && <div>{party.contact.address}</div>}
              {party.contact.phone && <div>{party.contact.phone}</div>}
              {party.contact.email && <div>{party.contact.email}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const IncidentContent: React.FC<{ incident: ExtractedData['incident'] }> = ({
  incident,
}) => {
  if (!incident) return null;

  return (
    <div className={styles.incidentInfo}>
      {incident.date && (
        <div className={styles.infoRow}>
          <span className={styles.label}>Date:</span>
          <span>{incident.date}</span>
        </div>
      )}
      {incident.location && (
        <div className={styles.infoRow}>
          <span className={styles.label}>Location:</span>
          <span>{incident.location}</span>
        </div>
      )}
      {incident.type && (
        <div className={styles.infoRow}>
          <span className={styles.label}>Type:</span>
          <span>{incident.type}</span>
        </div>
      )}
      {incident.description && (
        <div className={styles.description}>{incident.description}</div>
      )}
    </div>
  );
};

const DamagesContent: React.FC<{ damages: ExtractedData['damages'] }> = ({
  damages,
}) => {
  if (!damages) return null;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className={styles.damagesList}>
      {damages.map((damage, index) => (
        <div key={index} className={styles.damageItem}>
          <div className={styles.damageHeader}>
            <span className={styles.damageType}>{damage.type}</span>
            {damage.amount && (
              <span className={styles.damageAmount}>
                {formatCurrency(damage.amount)}
              </span>
            )}
          </div>
          <div className={styles.damageCategory}>{damage.category}</div>
          <div className={styles.damageDescription}>{damage.description}</div>
        </div>
      ))}
    </div>
  );
};

const TimelineContent: React.FC<{ timeline: ExtractedData['timeline'] }> = ({
  timeline,
}) => {
  if (!timeline) return null;

  return (
    <div className={styles.timelineList}>
      {timeline.map((event, index) => (
        <div key={index} className={styles.timelineItem}>
          <div className={styles.timelineDate}>{event.date}</div>
          <div className={styles.timelineEvent}>{event.event}</div>
          {event.significance && (
            <div className={styles.timelineSignificance}>
              {event.significance}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ClaimsContent: React.FC<{ claims: ExtractedData['claims'] }> = ({
  claims,
}) => {
  if (!claims) return null;

  return (
    <div className={styles.claimsList}>
      {claims.map((claim, index) => (
        <div key={index} className={styles.claimItem}>
          <div className={styles.claimType}>{claim.type}</div>
          <div className={styles.claimBasis}>{claim.basis}</div>
          {claim.statute && (
            <div className={styles.claimStatute}>
              <span className={styles.label}>Statute:</span> {claim.statute}
            </div>
          )}
          {claim.elements && claim.elements.length > 0 && (
            <div className={styles.claimElements}>
              <span className={styles.label}>Elements:</span>
              <ul>
                {claim.elements.map((element, idx) => (
                  <li key={idx}>{element}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

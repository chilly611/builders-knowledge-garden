'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface ShareCard {
  id: string;
  type: 'dream' | 'achievement' | 'progress' | 'project';
  title: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  isPublic: boolean;
  views: number;
  clicks: number;
  reactions: Record<string, number>;
}

interface ShareAnalytics {
  views: number;
  clicks: number;
  reactions: {
    celebrate: number;
    love: number;
    inspire: number;
    wow: number;
  };
  shares: number;
}

interface CommunityShare {
  id: string;
  author: string;
  avatar: string;
  type: 'dream' | 'achievement' | 'progress' | 'project';
  title: string;
  description: string;
  timestamp: Date;
  views: number;
  reactions: Record<string, number>;
  cardContent: React.ReactNode;
}

interface ShareSettings {
  visibility: 'public' | 'private' | 'link-only';
  allowComments: boolean;
  allowSharing: boolean;
  shareUrl: string;
}

const REACTION_TYPES = [
  { icon: '🎉', label: 'Celebrate', key: 'celebrate' },
  { icon: '❤️', label: 'Love', key: 'love' },
  { icon: '✨', label: 'Inspire', key: 'inspire' },
  { icon: '🤯', label: 'Wow', key: 'wow' },
];

const MOCK_COMMUNITY_SHARES: CommunityShare[] = [
  {
    id: 'share-1',
    author: 'Alex Chen',
    avatar: '👤',
    type: 'achievement',
    title: 'Achieved "Safety Sprint Champion"',
    description: 'Completed all safety objectives and ranked #1 this month!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    views: 342,
    reactions: { celebrate: 24, love: 18, inspire: 5, wow: 12 },
    cardContent: null,
  },
  {
    id: 'share-2',
    author: 'Jordan Smith',
    avatar: '👥',
    type: 'progress',
    title: 'Reached Level 25!',
    description: 'Just unlocked the "Efficiency Master" badge after 5000 XP!',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    views: 218,
    reactions: { celebrate: 31, love: 22, inspire: 8, wow: 15 },
    cardContent: null,
  },
  {
    id: 'share-3',
    author: 'Morgan Lee',
    avatar: '🎯',
    type: 'dream',
    title: 'New Dream: Green City Initiative',
    description: 'Planning a sustainable urban development project focusing on community engagement',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    views: 567,
    reactions: { celebrate: 45, love: 38, inspire: 52, wow: 28 },
    cardContent: null,
  },
  {
    id: 'share-4',
    author: 'Casey Johnson',
    avatar: '💼',
    type: 'project',
    title: 'Project Complete: Client Merger Portal',
    description: 'Successfully delivered integrated systems for enterprise client - 100% completion!',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    views: 723,
    reactions: { celebrate: 62, love: 41, inspire: 19, wow: 38 },
    cardContent: null,
  },
];

const generateQRCode = (text: string): string => {
  const encoded = encodeURIComponent(text);
  const size = 200;
  const margin = 2;

  const chars = '0123456789';
  const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const versionNum = (Math.abs(hash) % 10) + 1;

  const qrString = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  return qrString;
};

const generateShareUrl = (cardId: string): string => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://buildersknowledgegarden.com';
  return `${baseUrl}/share/${cardId}`;
};

const generateEmbedCode = (cardId: string): string => {
  const shareUrl = generateShareUrl(cardId);
  return `<iframe src="${shareUrl}?embed=true" width="400" height="500" frameborder="0" style="border-radius: 8px;"></iframe>`;
};

const DreamCard: React.FC<{ card: ShareCard }> = ({ card }) => (
  <div
    style={{
      background: 'linear-gradient(135deg, #7F77DD 0%, #9b93f5 100%)',
      borderRadius: '1rem',
      padding: '2rem',
      color: 'white',
      textAlign: 'center',
      minHeight: '300px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      boxShadow: '0 10px 30px rgba(127, 119, 221, 0.3)',
    }}
  >
    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💭</div>
    <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 0.75rem 0', fontFamily: 'Archivo Black' }}>
      {card.title}
    </h3>
    <p style={{ fontSize: '1rem', margin: '0', opacity: 0.95, fontFamily: 'Archivo' }}>
      {card.description || 'A dream waiting to become reality'}
    </p>
    <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', fontFamily: 'Archivo', opacity: 0.85 }}>
      Stage: {card.metadata.stage || 'Ideation'}
    </div>
  </div>
);

const AchievementCard: React.FC<{ card: ShareCard }> = ({ card }) => (
  <div
    style={{
      background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
      borderRadius: '1rem',
      padding: '2rem',
      color: '#333',
      textAlign: 'center',
      minHeight: '300px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      boxShadow: '0 10px 30px rgba(255, 215, 0, 0.3)',
    }}
  >
    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
    <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 0.75rem 0', fontFamily: 'Archivo Black' }}>
      {card.title}
    </h3>
    <p style={{ fontSize: '1rem', margin: '0', fontFamily: 'Archivo' }}>
      {card.description || 'Achievement Unlocked'}
    </p>
    <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', fontFamily: 'Archivo' }}>
      Rarity: {card.metadata.rarity || 'Rare'}
    </div>
  </div>
);

const ProgressCard: React.FC<{ card: ShareCard }> = ({ card }) => (
  <div
    style={{
      background: 'linear-gradient(135deg, #1D9E75 0%, #2ab894 100%)',
      borderRadius: '1rem',
      padding: '2rem',
      color: 'white',
      textAlign: 'center',
      minHeight: '300px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      boxShadow: '0 10px 30px rgba(29, 158, 117, 0.3)',
    }}
  >
    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
    <h3 style={{ fontSize: '2.2rem', fontWeight: 900, margin: '0 0 0.5rem 0', fontFamily: 'Archivo Black' }}>
      Level {card.metadata.level || '1'}
    </h3>
    <div
      style={{
        height: '12px',
        background: 'rgba(255, 255, 255, 0.3)',
        borderRadius: '6px',
        margin: '1.5rem 0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          background: 'white',
          width: `${card.metadata.xpProgress || 50}%`,
          transition: 'width 0.6s ease',
        }}
      />
    </div>
    <p style={{ fontSize: '1rem', margin: '0', opacity: 0.95, fontFamily: 'Archivo' }}>
      {card.metadata.xp || 0} / {card.metadata.nextLevelXp || 5000} XP
    </p>
    {card.metadata.streak && (
      <div style={{ marginTop: '1rem', fontSize: '0.9rem', fontFamily: 'Archivo' }}>
        🔥 {card.metadata.streak}-day streak
      </div>
    )}
  </div>
);

const ProjectCard: React.FC<{ card: ShareCard }> = ({ card }) => (
  <div
    style={{
      background: 'linear-gradient(135deg, #D85A30 0%, #ff7a52 100%)',
      borderRadius: '1rem',
      padding: '2rem',
      color: 'white',
      textAlign: 'center',
      minHeight: '300px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      boxShadow: '0 10px 30px rgba(216, 90, 48, 0.3)',
    }}
  >
    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏗️</div>
    <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 0.75rem 0', fontFamily: 'Archivo Black' }}>
      {card.title}
    </h3>
    <p style={{ fontSize: '1rem', margin: '0.5rem 0', opacity: 0.95, fontFamily: 'Archivo' }}>
      {card.description}
    </p>
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'Archivo Black' }}>
        {card.metadata.completion || 0}%
      </div>
      <div
        style={{
          height: '8px',
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '4px',
          marginTop: '0.75rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'white',
            width: `${card.metadata.completion || 0}%`,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  </div>
);

export default function SocialSharing() {
  const [activeTab, setActiveTab] = useState<'create' | 'feed' | 'analytics'>('create');
  const [shareCards, setShareCards] = useState<ShareCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<ShareCard | null>(null);
  const [communityShares, setCommunityShares] = useState<CommunityShare[]>(MOCK_COMMUNITY_SHARES);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [userReactions, setUserReactions] = useState<Record<string, Set<string>>>({});
  const cardRefMap = useRef<Record<string, HTMLDivElement | null>>({});

  const [cardForm, setCardForm] = useState({
    type: 'dream' as 'dream' | 'achievement' | 'progress' | 'project',
    title: '',
    description: '',
    stage: 'Ideation',
    rarity: 'Rare',
    level: 1,
    xp: 0,
    xpProgress: 50,
    nextLevelXp: 5000,
    streak: 0,
    completion: 75,
    phase: 'Development',
  });

  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    visibility: 'link-only',
    allowComments: true,
    allowSharing: true,
    shareUrl: '',
  });

  const handleCreateCard = () => {
    if (!cardForm.title.trim()) {
      alert('Please enter a card title');
      return;
    }

    const newCard: ShareCard = {
      id: `card-${Date.now()}`,
      type: cardForm.type,
      title: cardForm.title,
      description: cardForm.description,
      metadata: {
        stage: cardForm.stage,
        rarity: cardForm.rarity,
        level: cardForm.level,
        xp: cardForm.xp,
        xpProgress: cardForm.xpProgress,
        nextLevelXp: cardForm.nextLevelXp,
        streak: cardForm.streak,
        completion: cardForm.completion,
        phase: cardForm.phase,
      },
      createdAt: new Date(),
      isPublic: shareSettings.visibility === 'public',
      views: 0,
      clicks: 0,
      reactions: { celebrate: 0, love: 0, inspire: 0, wow: 0 },
    };

    setShareCards([newCard, ...shareCards]);
    setSelectedCard(newCard);
    setShareSettings({ ...shareSettings, shareUrl: generateShareUrl(newCard.id) });

    setCardForm({
      type: 'dream',
      title: '',
      description: '',
      stage: 'Ideation',
      rarity: 'Rare',
      level: 1,
      xp: 0,
      xpProgress: 50,
      nextLevelXp: 5000,
      streak: 0,
      completion: 75,
      phase: 'Development',
    });
  };

  const renderCardPreview = (card: ShareCard) => {
    switch (card.type) {
      case 'dream':
        return <DreamCard card={card} />;
      case 'achievement':
        return <AchievementCard card={card} />;
      case 'progress':
        return <ProgressCard card={card} />;
      case 'project':
        return <ProjectCard card={card} />;
      default:
        return null;
    }
  };

  const handleShareToTwitter = (card: ShareCard) => {
    const text = `${card.title}${card.description ? ' - ' + card.description : ''} #BuildersKnowledgeGarden #${card.type}`;
    const url = generateShareUrl(card.id);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleShareToLinkedIn = (card: ShareCard) => {
    const url = generateShareUrl(card.id);
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedinUrl, '_blank');
  };

  const handleCopyLink = (card: ShareCard) => {
    const url = generateShareUrl(card.id);
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const handleReaction = (shareId: string, reactionKey: string) => {
    const existing = userReactions[shareId] || new Set<string>();
    const newSet = new Set(existing);

    if (newSet.has(reactionKey)) {
      newSet.delete(reactionKey);
    } else {
      newSet.add(reactionKey);
    }

    setUserReactions((prev) => ({
      ...prev,
      [shareId]: newSet,
    }));

    setCommunityShares((prev) =>
      prev.map((share) => {
        if (share.id === shareId) {
          return {
            ...share,
            reactions: {
              ...share.reactions,
              [reactionKey]: (share.reactions[reactionKey] || 0) + (newSet.has(reactionKey) ? 1 : -1),
            },
          };
        }
        return share;
      })
    );
  };

  const captureCardAsImage = async (cardId: string) => {
    const cardElement = cardRefMap.current[cardId];
    if (!cardElement) return;

    try {
      // Use SVG foreignObject approach for card capture (no external library)
      const { width, height } = cardElement.getBoundingClientRect();
      const clone = cardElement.cloneNode(true) as HTMLElement;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${clone.outerHTML}</div>
        </foreignObject>
      </svg>`;
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${cardId}.svg`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Error capturing card:', err);
      alert('Could not capture card image');
    }
  };

  const topReactions = useMemo(() => {
    const reactionCounts = communityShares.reduce(
      (acc, share) => {
        REACTION_TYPES.forEach((reaction) => {
          acc[reaction.key] = (acc[reaction.key] || 0) + (share.reactions[reaction.key] || 0);
        });
        return acc;
      },
      {} as Record<string, number>
    );
    return reactionCounts;
  }, [communityShares]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAF8', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2rem' }}
        >
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1a1a1a', fontFamily: 'Archivo Black', margin: '0 0 0.5rem 0' }}>
            Share Your Story
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#666', margin: 0, fontFamily: 'Archivo' }}>
            Create beautiful share cards and inspire your community
          </p>
        </motion.div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e0e0e0' }}>
          {(['create', 'feed', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '1rem 1.5rem',
                fontSize: '1rem',
                fontFamily: 'Archivo',
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: activeTab === tab ? '#1D9E75' : '#999',
                borderBottom: activeTab === tab ? '3px solid #1D9E75' : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              {tab === 'create' && 'Create Card'}
              {tab === 'feed' && 'Community Feed'}
              {tab === 'analytics' && 'Analytics'}
            </button>
          ))}
        </div>

        {/* Create Card Tab */}
        {activeTab === 'create' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              {/* Form */}
              <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                  Create New Share Card
                </h2>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'Archivo', color: '#1a1a1a' }}>
                    Card Type
                  </label>
                  <select
                    value={cardForm.type}
                    onChange={(e) => setCardForm({ ...cardForm, type: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '1rem',
                      fontFamily: 'Archivo',
                      border: '1px solid #e0e0e0',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="dream">Dream</option>
                    <option value="achievement">Achievement</option>
                    <option value="progress">Progress</option>
                    <option value="project">Project</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'Archivo', color: '#1a1a1a' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={cardForm.title}
                    onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
                    placeholder="Enter card title"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '1rem',
                      fontFamily: 'Archivo',
                      border: '1px solid #e0e0e0',
                      borderRadius: '0.5rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'Archivo', color: '#1a1a1a' }}>
                    Description
                  </label>
                  <textarea
                    value={cardForm.description}
                    onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
                    placeholder="Add a description (optional)"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '1rem',
                      fontFamily: 'Archivo',
                      border: '1px solid #e0e0e0',
                      borderRadius: '0.5rem',
                      boxSizing: 'border-box',
                      minHeight: '80px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                {cardForm.type === 'dream' && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'Archivo', color: '#1a1a1a' }}>
                      Dream Stage
                    </label>
                    <select
                      value={cardForm.stage}
                      onChange={(e) => setCardForm({ ...cardForm, stage: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '1rem',
                        fontFamily: 'Archivo',
                        border: '1px solid #e0e0e0',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="Ideation">Ideation</option>
                      <option value="Planning">Planning</option>
                      <option value="Development">Development</option>
                      <option value="Launch">Launch</option>
                    </select>
                  </div>
                )}

                {cardForm.type === 'achievement' && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'Archivo', color: '#1a1a1a' }}>
                      Rarity
                    </label>
                    <select
                      value={cardForm.rarity}
                      onChange={(e) => setCardForm({ ...cardForm, rarity: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '1rem',
                        fontFamily: 'Archivo',
                        border: '1px solid #e0e0e0',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="Common">Common</option>
                      <option value="Rare">Rare</option>
                      <option value="Epic">Epic</option>
                      <option value="Legendary">Legendary</option>
                    </select>
                  </div>
                )}

                {cardForm.type === 'progress' && (
                  <>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'Archivo', color: '#1a1a1a' }}>
                        Level: {cardForm.level}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={cardForm.level}
                        onChange={(e) => setCardForm({ ...cardForm, level: parseInt(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'Archivo', color: '#1a1a1a' }}>
                        XP Progress: {cardForm.xpProgress}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={cardForm.xpProgress}
                        onChange={(e) => setCardForm({ ...cardForm, xpProgress: parseInt(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'Archivo', color: '#1a1a1a' }}>
                        Streak: {cardForm.streak}
                      </label>
                      <input
                        type="number"
                        value={cardForm.streak}
                        onChange={(e) => setCardForm({ ...cardForm, streak: parseInt(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          fontSize: '1rem',
                          fontFamily: 'Archivo',
                          border: '1px solid #e0e0e0',
                          borderRadius: '0.5rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </>
                )}

                {cardForm.type === 'project' && (
                  <>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'Archivo', color: '#1a1a1a' }}>
                        Completion: {cardForm.completion}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={cardForm.completion}
                        onChange={(e) => setCardForm({ ...cardForm, completion: parseInt(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'Archivo', color: '#1a1a1a' }}>
                        Phase
                      </label>
                      <select
                        value={cardForm.phase}
                        onChange={(e) => setCardForm({ ...cardForm, phase: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          fontSize: '1rem',
                          fontFamily: 'Archivo',
                          border: '1px solid #e0e0e0',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="Planning">Planning</option>
                        <option value="Development">Development</option>
                        <option value="Testing">Testing</option>
                        <option value="Launch">Launch</option>
                        <option value="Complete">Complete</option>
                      </select>
                    </div>
                  </>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'Archivo', color: '#1a1a1a' }}>
                    Visibility
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {(['public', 'link-only', 'private'] as const).map((visibility) => (
                      <button
                        key={visibility}
                        onClick={() => setShareSettings({ ...shareSettings, visibility })}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          fontSize: '0.9rem',
                          fontFamily: 'Archivo',
                          fontWeight: 600,
                          border: shareSettings.visibility === visibility ? '2px solid #1D9E75' : '1px solid #e0e0e0',
                          borderRadius: '0.5rem',
                          background: shareSettings.visibility === visibility ? '#1D9E7520' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {visibility === 'public' && '🌍 Public'}
                        {visibility === 'link-only' && '🔗 Link Only'}
                        {visibility === 'private' && '🔒 Private'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Archivo', fontSize: '0.95rem', cursor: 'pointer', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={shareSettings.allowComments}
                      onChange={(e) => setShareSettings({ ...shareSettings, allowComments: e.target.checked })}
                    />
                    Allow Comments
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Archivo', fontSize: '0.95rem', cursor: 'pointer', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={shareSettings.allowSharing}
                      onChange={(e) => setShareSettings({ ...shareSettings, allowSharing: e.target.checked })}
                    />
                    Allow Sharing
                  </label>
                </div>

                <button
                  onClick={handleCreateCard}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    fontSize: '1rem',
                    fontFamily: 'Archivo',
                    fontWeight: 700,
                    border: 'none',
                    background: 'linear-gradient(135deg, #1D9E75 0%, #2ab894 100%)',
                    color: 'white',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  Create Share Card
                </button>
              </div>

              {/* Preview */}
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 1rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                    Preview
                  </h2>
                  <div
                    ref={(el) => {
                      if (el) cardRefMap.current['preview'] = el;
                    }}
                    style={{ minHeight: '350px' }}
                  >
                    {renderCardPreview({
                      id: 'preview',
                      type: cardForm.type,
                      title: cardForm.title || 'Card Title',
                      description: cardForm.description,
                      metadata: cardForm,
                      createdAt: new Date(),
                      isPublic: true,
                      views: 0,
                      clicks: 0,
                      reactions: { celebrate: 0, love: 0, inspire: 0, wow: 0 },
                    })}
                  </div>
                </div>

                {cardForm.title && (
                  <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                      Share Options
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <button
                        onClick={() => handleCopyLink({ ...cardForm, id: 'preview', createdAt: new Date(), isPublic: true, views: 0, clicks: 0, reactions: { celebrate: 0, love: 0, inspire: 0, wow: 0 }, metadata: {} } as ShareCard)}
                        style={{
                          padding: '0.75rem',
                          fontSize: '0.9rem',
                          fontFamily: 'Archivo',
                          fontWeight: 600,
                          border: '1px solid #e0e0e0',
                          background: 'white',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9f9')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                      >
                        📋 Copy Link
                      </button>
                      <button
                        onClick={() => setShowQRModal(true)}
                        style={{
                          padding: '0.75rem',
                          fontSize: '0.9rem',
                          fontFamily: 'Archivo',
                          fontWeight: 600,
                          border: '1px solid #e0e0e0',
                          background: 'white',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9f9')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                      >
                        📲 QR Code
                      </button>
                      <button
                        onClick={() => setShowEmbedModal(true)}
                        style={{
                          padding: '0.75rem',
                          fontSize: '0.9rem',
                          fontFamily: 'Archivo',
                          fontWeight: 600,
                          border: '1px solid #e0e0e0',
                          background: 'white',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9f9')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                      >
                        &lt;/&gt; Embed Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Your Cards */}
            {shareCards.length > 0 && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                  Your Share Cards
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {shareCards.map((card, idx) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{
                        background: 'white',
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.15)')}
                      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.08)')}
                    >
                      <div
                        ref={(el) => {
                          if (el) cardRefMap.current[card.id] = el;
                        }}
                        style={{ height: '200px', overflow: 'hidden' }}
                      >
                        {renderCardPreview(card)}
                      </div>
                      <div style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                          {card.title}
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 1rem 0', fontFamily: 'Archivo' }}>
                          {new Date(card.createdAt).toLocaleDateString()} • {card.views} views
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleCopyLink(card)}
                            style={{
                              flex: 1,
                              minWidth: '80px',
                              padding: '0.5rem',
                              fontSize: '0.8rem',
                              fontFamily: 'Archivo',
                              fontWeight: 600,
                              border: '1px solid #e0e0e0',
                              background: 'white',
                              borderRadius: '0.4rem',
                              cursor: 'pointer',
                            }}
                          >
                            📋
                          </button>
                          <button
                            onClick={() => handleShareToTwitter(card)}
                            style={{
                              flex: 1,
                              minWidth: '80px',
                              padding: '0.5rem',
                              fontSize: '0.8rem',
                              fontFamily: 'Archivo',
                              fontWeight: 600,
                              border: '1px solid #e0e0e0',
                              background: 'white',
                              borderRadius: '0.4rem',
                              cursor: 'pointer',
                            }}
                          >
                            𝕏
                          </button>
                          <button
                            onClick={() => handleShareToLinkedIn(card)}
                            style={{
                              flex: 1,
                              minWidth: '80px',
                              padding: '0.5rem',
                              fontSize: '0.8rem',
                              fontFamily: 'Archivo',
                              fontWeight: 600,
                              border: '1px solid #e0e0e0',
                              background: 'white',
                              borderRadius: '0.4rem',
                              cursor: 'pointer',
                            }}
                          >
                            in
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Community Feed Tab */}
        {activeTab === 'feed' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div style={{ marginBottom: '2rem' }}>
              <button
                onClick={() => setShowComposer(!showComposer)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1rem',
                  fontFamily: 'Archivo',
                  fontWeight: 600,
                  border: '2px solid #1D9E75',
                  background: '#1D9E7510',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  color: '#1D9E75',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1D9E7520')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#1D9E7510')}
              >
                ✍️ Share Your Story
              </button>
            </div>

            {showComposer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'white',
                  borderRadius: '1rem',
                  padding: '2rem',
                  marginBottom: '2rem',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                }}
              >
                <textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="What's on your mind? Share your achievement, progress, or inspiration..."
                  style={{
                    width: '100%',
                    padding: '1rem',
                    fontSize: '1rem',
                    fontFamily: 'Archivo',
                    border: '1px solid #e0e0e0',
                    borderRadius: '0.5rem',
                    boxSizing: 'border-box',
                    minHeight: '120px',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowComposer(false)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.95rem',
                      fontFamily: 'Archivo',
                      fontWeight: 600,
                      border: '1px solid #e0e0e0',
                      background: 'white',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (composerText.trim()) {
                        alert('Story shared! Thank you for inspiring the community.');
                        setComposerText('');
                        setShowComposer(false);
                      }
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.95rem',
                      fontFamily: 'Archivo',
                      fontWeight: 600,
                      border: 'none',
                      background: 'linear-gradient(135deg, #1D9E75 0%, #2ab894 100%)',
                      color: 'white',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    Post Story
                  </button>
                </div>
              </motion.div>
            )}

            {/* Feed Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {REACTION_TYPES.map((reaction) => (
                <div
                  key={reaction.key}
                  style={{
                    background: 'white',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    textAlign: 'center',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{reaction.icon}</div>
                  <p style={{ fontSize: '0.85rem', color: '#999', margin: '0 0 0.25rem 0', fontFamily: 'Archivo' }}>
                    {reaction.label}
                  </p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#1D9E75', fontFamily: 'Archivo Black' }}>
                    {topReactions[reaction.key] || 0}
                  </p>
                </div>
              ))}
            </div>

            {/* Feed */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {communityShares.map((share, idx) => (
                <motion.div
                  key={share.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    background: 'white',
                    borderRadius: '1rem',
                    overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {/* Share Header */}
                  <div style={{ padding: '1rem', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontSize: '2rem' }}>{share.avatar}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontFamily: 'Archivo', fontWeight: 600, color: '#1a1a1a' }}>
                          {share.author}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#999', fontFamily: 'Archivo' }}>
                          {Math.floor((Date.now() - share.timestamp.getTime()) / (1000 * 60 * 60))}h ago
                        </p>
                      </div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.35rem 0.75rem',
                          background: `${getLaneColor(share.type)}20`,
                          color: getLaneColor(share.type),
                          borderRadius: '0.3rem',
                          fontSize: '0.75rem',
                          fontFamily: 'Archivo',
                          fontWeight: 600,
                        }}
                      >
                        {share.type}
                      </span>
                    </div>
                  </div>

                  {/* Share Content */}
                  <div style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                      {share.title}
                    </h3>
                    <p style={{ fontSize: '0.95rem', color: '#666', margin: '0', fontFamily: 'Archivo', lineHeight: 1.5 }}>
                      {share.description}
                    </p>
                  </div>

                  {/* Share Stats */}
                  <div style={{ padding: '1rem', borderTop: '1px solid #f0f0f0', fontSize: '0.85rem', color: '#999', fontFamily: 'Archivo' }}>
                    👁️ {share.views} views
                  </div>

                  {/* Reactions */}
                  <div style={{ padding: '1rem', borderTop: '1px solid #f0f0f0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {REACTION_TYPES.map((reaction) => {
                      const isActive = userReactions[share.id]?.has(reaction.key) || false;
                      return (
                        <button
                          key={reaction.key}
                          onClick={() => handleReaction(share.id, reaction.key)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.85rem',
                            fontFamily: 'Archivo',
                            fontWeight: 600,
                            border: isActive ? `2px solid ${getLaneColor('builder')}` : '1px solid #e0e0e0',
                            background: isActive ? `${getLaneColor('builder')}15` : 'white',
                            borderRadius: '0.4rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          {reaction.icon} {share.reactions[reaction.key] || 0}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            {shareCards.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.2rem', color: '#999', fontFamily: 'Archivo' }}>
                  Create a share card to see analytics
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {shareCards.map((card, idx) => {
                  const analytics: ShareAnalytics = {
                    views: Math.floor(Math.random() * 500) + 50,
                    clicks: Math.floor(Math.random() * 100) + 10,
                    reactions: {
                      celebrate: Math.floor(Math.random() * 50),
                      love: Math.floor(Math.random() * 40),
                      inspire: Math.floor(Math.random() * 60),
                      wow: Math.floor(Math.random() * 30),
                    },
                    shares: Math.floor(Math.random() * 25),
                  };

                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{
                        background: 'white',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                        {card.title}
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.75rem', background: '#f9f9f9', borderRadius: '0.5rem' }}>
                          <p style={{ fontSize: '0.8rem', color: '#999', margin: '0 0 0.25rem 0', fontFamily: 'Archivo' }}>
                            Views
                          </p>
                          <p style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: '#378ADD', fontFamily: 'Archivo Black' }}>
                            {analytics.views}
                          </p>
                        </div>
                        <div style={{ padding: '0.75rem', background: '#f9f9f9', borderRadius: '0.5rem' }}>
                          <p style={{ fontSize: '0.8rem', color: '#999', margin: '0 0 0.25rem 0', fontFamily: 'Archivo' }}>
                            Clicks
                          </p>
                          <p style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: '#D85A30', fontFamily: 'Archivo Black' }}>
                            {analytics.clicks}
                          </p>
                        </div>
                      </div>

                      <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.75rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                          Reactions
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {REACTION_TYPES.map((reaction) => (
                            <span
                              key={reaction.key}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.75rem',
                                background: '#f0f0f0',
                                borderRadius: '0.4rem',
                                fontSize: '0.85rem',
                                fontFamily: 'Archivo',
                                fontWeight: 600,
                              }}
                            >
                              {reaction.icon} {(analytics.reactions as Record<string, number>)[reaction.key]}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p style={{ fontSize: '0.9rem', color: '#999', margin: 0, fontFamily: 'Archivo' }}>
                        📤 {analytics.shares} shares across social platforms
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: 'white',
                borderRadius: '1rem',
                padding: '2rem',
                maxWidth: '400px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a', textAlign: 'center' }}>
                Share via QR Code
              </h2>
              <div style={{ background: '#f9f9f9', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <img
                  src={generateQRCode(generateShareUrl('card-preview'))}
                  alt="QR Code"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
              <p style={{ fontSize: '0.9rem', color: '#666', textAlign: 'center', margin: '0 0 1.5rem 0', fontFamily: 'Archivo' }}>
                Scan to share this card with anyone
              </p>
              <button
                onClick={() => setShowQRModal(false)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  fontFamily: 'Archivo',
                  fontWeight: 600,
                  border: 'none',
                  background: '#1D9E75',
                  color: 'white',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embed Code Modal */}
      <AnimatePresence>
        {showEmbedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
            onClick={() => setShowEmbedModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: 'white',
                borderRadius: '1rem',
                padding: '2rem',
                maxWidth: '500px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                Embed Code
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 1rem 0', fontFamily: 'Archivo' }}>
                Copy this code to embed the card on your website:
              </p>
              <textarea
                readOnly
                value={generateEmbedCode('card-preview')}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0.5rem',
                  boxSizing: 'border-box',
                  minHeight: '120px',
                  resize: 'vertical',
                  marginBottom: '1rem',
                }}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateEmbedCode('card-preview'));
                  alert('Embed code copied!');
                  setShowEmbedModal(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  fontFamily: 'Archivo',
                  fontWeight: 600,
                  border: 'none',
                  background: '#1D9E75',
                  color: 'white',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                Copy Code
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getLaneColor(lane: string): string {
  const colors: Record<string, string> = {
    dream: '#7F77DD',
    achievement: '#FFD700',
    progress: '#1D9E75',
    project: '#D85A30',
    dreamer: '#7F77DD',
    builder: '#1D9E75',
    specialist: '#378ADD',
    merchant: '#D85A30',
    ally: '#D85A30',
    crew: '#1D9E75',
    fleet: '#378ADD',
    machine: '#D85A30',
  };
  return colors[lane] || '#378ADD';
}

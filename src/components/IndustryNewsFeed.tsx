'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

type Lane = 'dreamer' | 'builder' | 'specialist' | 'merchant' | 'ally' | 'crew' | 'fleet' | 'machine';
type Category = 'All' | 'Regulations' | 'Materials & Products' | 'Safety' | 'Market Trends' | 'Technology';
type ImpactLevel = 'High' | 'Medium' | 'Low';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  category: Category;
  impactLevel: ImpactLevel;
  relevanceTag: string;
  laneInsight: string;
  timestamp: string;
  sourceLogoUrl?: string;
  saved?: boolean;
}

const LANE_COLORS: Record<Lane, string> = {
  dreamer: '#1D9E75',
  builder: '#E8443A',
  specialist: '#D85A30',
  merchant: '#BA7517',
  ally: '#378ADD',
  crew: '#666666',
  fleet: '#BA7517',
  machine: '#7F77DD',
};

const LANE_NAMES: Record<Lane, string> = {
  dreamer: 'Dreamers',
  builder: 'Builders',
  specialist: 'Specialists',
  merchant: 'Merchants',
  ally: 'Allies',
  crew: 'Crew',
  fleet: 'Fleet',
  machine: 'Machine',
};

const CATEGORIES: Category[] = ['All', 'Regulations', 'Materials & Products', 'Safety', 'Market Trends', 'Technology'];

const IMPACT_COLORS: Record<ImpactLevel, string> = {
  High: '#E8443A',
  Medium: '#D85A30',
  Low: '#666666',
};

interface IndustryNewsFeedProps {
  lane: Lane;
}

export default function IndustryNewsFeed({ lane }: IndustryNewsFeedProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [savedArticles, setSavedArticles] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [showSaved, setShowSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Load saved articles from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`saved-articles-${lane}`);
    if (saved) {
      try {
        setSavedArticles(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved articles', e);
      }
    }
  }, [lane]);

  // Fetch news articles
  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/news?lane=${lane}`);
        if (response.ok) {
          const data = await response.json();
          setArticles(data.articles || []);
          setLastUpdated(new Date().toLocaleString());
        }
      } catch (error) {
        console.error('Failed to fetch news:', error);
      }
      setLoading(false);
    };

    fetchNews();
  }, [lane]);

  const handleSaveArticle = (article: NewsArticle) => {
    const isSaved = savedArticles.some((a) => a.id === article.id);
    let updated: NewsArticle[];

    if (isSaved) {
      updated = savedArticles.filter((a) => a.id !== article.id);
    } else {
      updated = [...savedArticles, { ...article, saved: true }];
    }

    setSavedArticles(updated);
    localStorage.setItem(`saved-articles-${lane}`, JSON.stringify(updated));
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/news?lane=${lane}&refresh=true`);
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
        setLastUpdated(new Date().toLocaleString());
      }
    } catch (error) {
      console.error('Failed to refresh news:', error);
    }
    setLoading(false);
  };

  const displayArticles = showSaved ? savedArticles : articles;
  const filteredArticles =
    selectedCategory === 'All' ? displayArticles : displayArticles.filter((a) => a.category === selectedCategory);

  const categoryCounts = CATEGORIES.map((cat) => {
    if (cat === 'All') return { category: cat, count: displayArticles.length };
    return { category: cat, count: displayArticles.filter((a) => a.category === cat).length };
  });

  return (
    <div
      style={{
        background: '#FAFAFA',
        borderRadius: '12px',
        padding: '24px',
        fontFamily: 'Archivo, sans-serif',
        marginBottom: '32px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#1a1a1a',
                margin: '0 0 8px 0',
              }}
            >
              Your Industry Briefing
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#666',
                margin: '0',
              }}
            >
              Curated for {LANE_NAMES[lane]}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: LANE_COLORS[lane],
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <p
          style={{
            fontSize: '12px',
            color: '#999',
            margin: '0',
          }}
        >
          Last updated: {lastUpdated || 'Loading...'}
        </p>
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}
      >
        {categoryCounts.map((item) => (
          <button
            key={item.category}
            onClick={() => {
              setSelectedCategory(item.category);
              setShowSaved(false);
            }}
            style={{
              padding: '8px 16px',
              background: selectedCategory === item.category && !showSaved ? LANE_COLORS[lane] : '#fff',
              color: selectedCategory === item.category && !showSaved ? '#fff' : '#1a1a1a',
              border: `1px solid ${selectedCategory === item.category && !showSaved ? LANE_COLORS[lane] : '#ddd'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            {item.category} <span style={{ opacity: 0.7, marginLeft: '6px' }}>({item.count})</span>
          </button>
        ))}

        {/* Saved Tab */}
        <button
          onClick={() => setShowSaved(!showSaved)}
          style={{
            padding: '8px 16px',
            background: showSaved ? LANE_COLORS[lane] : '#fff',
            color: showSaved ? '#fff' : '#1a1a1a',
            border: `1px solid ${showSaved ? LANE_COLORS[lane] : '#ddd'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
            marginLeft: 'auto',
          }}
        >
          📌 Saved ({savedArticles.length})
        </button>
      </div>

      {/* News Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <AnimatePresence mode="wait">
          {filteredArticles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                padding: '32px',
                textAlign: 'center',
                color: '#999',
              }}
            >
              <p style={{ fontSize: '14px', margin: '0' }}>
                {loading ? 'Loading your briefing...' : 'No articles found in this category'}
              </p>
            </motion.div>
          ) : (
            filteredArticles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '16px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = LANE_COLORS[lane];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                <div style={{ display: 'flex', gap: '12px' }}>
                  {/* Source Icon */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      background: LANE_COLORS[lane],
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: '700',
                      flexShrink: 0,
                    }}
                  >
                    {article.source.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Article Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Headline */}
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#1a1a1a',
                        margin: '0 0 8px 0',
                        lineHeight: '1.4',
                      }}
                    >
                      {article.title}
                    </h3>

                    {/* Summary */}
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#666',
                        margin: '0 0 12px 0',
                        lineHeight: '1.5',
                      }}
                    >
                      {article.summary}
                    </p>

                    {/* Relevance Tag & Impact */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          background: `${LANE_COLORS[lane]}20`,
                          color: LANE_COLORS[lane],
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      >
                        {article.relevanceTag}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: IMPACT_COLORS[article.impactLevel],
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#666', fontWeight: '600' }}>
                          {article.impactLevel} impact
                        </span>
                      </div>
                    </div>

                    {/* Lane Insight */}
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#999',
                        fontStyle: 'italic',
                        margin: '0 0 12px 0',
                      }}
                    >
                      {article.laneInsight}
                    </p>

                    {/* Footer */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        color: '#999',
                      }}
                    >
                      <span>
                        {article.source} • {article.timestamp}
                      </span>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          onClick={() => handleSaveArticle(article)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '4px 8px',
                            color: savedArticles.some((a) => a.id === article.id) ? LANE_COLORS[lane] : '#ccc',
                            transition: 'color 0.2s ease',
                          }}
                          title={savedArticles.some((a) => a.id === article.id) ? 'Unsave' : 'Save'}
                        >
                          {savedArticles.some((a) => a.id === article.id) ? '📌' : '📌'}
                        </button>

                        <a
                          href={article.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: LANE_COLORS[lane],
                            textDecoration: 'none',
                            fontWeight: '600',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `${LANE_COLORS[lane]}10`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          Read Original →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

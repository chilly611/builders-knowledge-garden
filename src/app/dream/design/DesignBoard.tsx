'use client';
import { motion } from 'framer-motion';
import { ACCENT, ACCENT_DIM, BG_PANEL, BORDER, TEXT_PRIMARY, TEXT_DIM, ROOMS, type BoardItem, type DesignToken } from './shared';

function RoomColumn({ room, items, tokens, onRemove }: { room: string; items: BoardItem[]; tokens: DesignToken[]; onRemove: (id: string) => void }) {
  const roomTokens = tokens.filter(t => items.some(i => i.generationId === t.sourceGenerationId));
  return (
    <div style={{ minWidth: 220, maxWidth: 280, flex: '1 1 220px', background: BG_PANEL, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${ACCENT}44, transparent)` }} />
      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: ACCENT, fontFamily: 'monospace', letterSpacing: '1px', borderBottom: `1px solid ${BORDER}`, paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }} />{room.toUpperCase()}
      </h4>
      {!items.length && <p style={{ fontSize: 11, color: TEXT_DIM, fontStyle: 'italic', margin: '8px 0', fontFamily: 'monospace' }}>Save designs here</p>}
      {items.map(item => (
        <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${BORDER}`, position: 'relative' }}>
          <img src={item.imageUrl} alt={item.label} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
          <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.4)' }}><p style={{ fontSize: 10, color: TEXT_PRIMARY, margin: 0, fontFamily: 'monospace' }}>{item.label}</p></div>
          <button onClick={() => onRemove(item.id)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: TEXT_DIM, border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer', lineHeight: '20px', textAlign: 'center' }}>x</button>
        </motion.div>
      ))}
      {roomTokens.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8, marginTop: 4 }}>
          <p style={{ fontSize: 10, color: TEXT_DIM, margin: '0 0 6px', fontFamily: 'monospace' }}>ELEMENTS</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {roomTokens.map(tok => <div key={tok.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '3px 6px', border: `1px solid ${BORDER}` }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: tok.color }} /><span style={{ fontSize: 9, color: TEXT_PRIMARY, fontFamily: 'monospace' }}>{tok.label}</span>
            </div>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DesignBoard({ board, tokens, onRemoveFromBoard, onSwitchToResults }: {
  board: BoardItem[]; tokens: DesignToken[]; onRemoveFromBoard: (id: string) => void; onSwitchToResults: () => void;
}) {
  if (!board.length) return (
    <div style={{ textAlign: 'center', padding: 60, color: TEXT_DIM, fontFamily: 'monospace' }}>
      <p style={{ fontSize: 40, margin: '0 0 12px' }}>📋</p><p style={{ fontSize: 14 }}>Save generated designs to organize them by room</p>
      <button onClick={onSwitchToResults} style={{ marginTop: 12, padding: '8px 20px', background: ACCENT_DIM, color: ACCENT, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'monospace' }}>View Generated Designs</button>
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
        {ROOMS.filter(r => board.some(b => b.room === r)).map(room => <RoomColumn key={room} room={room} items={board.filter(b => b.room === room)} tokens={tokens} onRemove={onRemoveFromBoard} />)}
      </div>
      {tokens.length > 0 && (
        <div style={{ marginTop: 24, background: BG_PANEL, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: ACCENT, fontFamily: 'monospace', letterSpacing: '1.5px' }}>DESIGN TOKENS ({tokens.length})</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tokens.map(tok => <div key={tok.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '6px 12px', border: `1px solid ${BORDER}` }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: tok.color, flexShrink: 0, boxShadow: `0 0 8px ${tok.color}44` }} />
              <div><p style={{ fontSize: 12, color: TEXT_PRIMARY, margin: 0, fontWeight: 600, fontFamily: 'monospace' }}>{tok.label}</p><p style={{ fontSize: 10, color: TEXT_DIM, margin: 0, fontFamily: 'monospace' }}>{tok.category}</p></div>
            </div>)}
          </div>
        </div>
      )}
    </div>
  );
}

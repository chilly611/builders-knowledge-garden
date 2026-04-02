import KillerAppNav from '@/components/KillerAppNav';

export default function KillerAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <KillerAppNav />
      <div style={{ paddingTop: 48 }}>
        {children}
      </div>
    </>
  );
}

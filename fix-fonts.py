import os, re

BASE = r"C:\Users\kmacn\Desktop\the Build Garden\app\src\app\dream"

files_to_fix = [
    os.path.join(BASE, "describe", "page.tsx"),
    os.path.join(BASE, "inspire", "page.tsx"),
    os.path.join(BASE, "browse", "page.tsx"),
    os.path.join(BASE, "sketch", "page.tsx"),
    os.path.join(BASE, "explore", "page.tsx"),
    os.path.join(BASE, "garden", "page.tsx"),
    os.path.join(BASE, "plans", "page.tsx"),
    os.path.join(BASE, "shared", "[slug]", "client.tsx"),
]

replacements = [
    # Import line
    ('import { Cinzel, Outfit } from "next/font/google";',
     'import { Archivo_Black, Archivo } from "next/font/google";'),
    ("import { Cinzel, Outfit } from 'next/font/google';",
     "import { Archivo_Black, Archivo } from 'next/font/google';"),
    # Const declarations
    ('const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700", "900"] });',
     'const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400" });'),
    ("const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '700', '900'] });",
     "const archivoBlack = Archivo_Black({ subsets: ['latin'], weight: '400' });"),
    ('const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });',
     'const archivo = Archivo({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });'),
    ("const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });",
     "const archivo = Archivo({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });"),
    # className refs
    ('cinzel.className', 'archivoBlack.className'),
    ('outfit.className', 'archivo.className'),
]

for fpath in files_to_fix:
    if not os.path.exists(fpath):
        print(f"SKIP (not found): {fpath}")
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        count = sum(1 for old, _ in replacements if old in original)
        print(f"FIXED: {os.path.basename(os.path.dirname(fpath))}/{os.path.basename(fpath)} ({count} replacement types)")
    else:
        print(f"NO CHANGE: {os.path.basename(os.path.dirname(fpath))}/{os.path.basename(fpath)}")

print("\nDone! All font references updated to Archivo.")

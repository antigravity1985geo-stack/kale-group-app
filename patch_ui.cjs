const fs = require('fs');
const path = require('path');

const adminDir = path.join('src', 'components', 'admin');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Backgrounds & Containers
  // Replace white cards with the new Shadow + Non-border style
  content = content.replace(/bg-white shadow-sm\/80 border border-brand-200\/50 rounded-2xl/g, 'bg-admin-card shadow-[0_18px_40px_rgba(112,144,176,0.12)] rounded-3xl');
  content = content.replace(/bg-white shadow-sm\/80 border border-brand-200 border-dashed rounded-2xl/g, 'bg-admin-card border-2 border-dashed border-admin-muted/20 rounded-3xl');
  content = content.replace(/bg-white shadow-sm\/50 border border-brand-200 border-dashed rounded-2xl/g, 'bg-admin-card border-2 border-dashed border-admin-muted/20 rounded-3xl');
  content = content.replace(/bg-white rounded-3xl shadow-\[0_8px_30px_rgb\(0,0,0,0.04\)\] border border-gray-100/g, 'bg-admin-card shadow-[0_18px_40px_rgba(112,144,176,0.12)] rounded-3xl');

  // 2. Buttons
  // Primary Buttons (Indigo)
  content = content.replace(/bg-brand-900 text-gold-400 rounded-xl/g, 'bg-admin-primary text-white rounded-2xl hover:bg-admin-primary-hover shadow-lg shadow-admin-primary/20 transition-all');
  content = content.replace(/bg-brand-900 text-white rounded-xl/g, 'bg-admin-primary text-white rounded-2xl hover:bg-admin-primary-hover shadow-lg shadow-admin-primary/20 transition-all');
  
  // Secondary / Gray Buttons
  content = content.replace(/bg-gray-50 border border-gray-200 rounded-xl/g, 'bg-admin-bg text-admin-muted rounded-2xl hover:bg-white hover:text-admin-primary transition-all shadow-sm');
  content = content.replace(/bg-brand-50 hover:bg-stone-700 text-slate-100/g, 'bg-admin-primary text-white hover:bg-admin-primary-hover');

  // 3. Typography
  content = content.replace(/text-brand-900/g, 'text-admin-text');
  content = content.replace(/text-brand-400/g, 'text-admin-muted');
  content = content.replace(/text-slate-500/g, 'text-admin-muted');
  content = content.replace(/text-brand-200/g, 'text-admin-muted');
  content = content.replace(/font-serif/g, 'font-sans font-bold'); // SaaS style often uses sans-serif for numbers/dashboards

  // 4. Badges & Accents
  content = content.replace(/bg-gold-400\/20 text-gold-400/g, 'bg-admin-primary/10 text-admin-primary');
  content = content.replace(/text-gold-400/g, 'text-admin-primary');
  content = content.replace(/text-gold-500/g, 'text-admin-primary');
  content = content.replace(/border-brand-200/g, 'border-admin-muted/10');
  content = content.replace(/bg-brand-50/g, 'bg-admin-bg');

  // 5. Loading / Skeleton
  content = content.replace(/text-gold-400/g, 'text-admin-primary');

  // 6. Animations (Inject staggered classes)
  // Look for divs that are main containers in components
  if (content.includes('className="space-y-') && !content.includes('admin-fade-in')) {
     content = content.replace('className="space-y-', 'className="admin-fade-in space-y-');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.tsx')) {
      patchFile(fullPath);
    }
  });
}

// Also patch AdminPanel.tsx itself
patchFile('src/AdminPanel.tsx');

// Patch all components in admin folder
if (fs.existsSync(adminDir)) {
  walkDir(adminDir);
}

console.log('UI Transformation Complete');

const fs = require('fs');
const path = require('path');

const adminDir = path.join('src', 'components', 'admin');

function refineComponent(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Refine Status Badges to be more "Vibrant & Premium" (not just dark/muted)
  // Emerald / Success
  content = content.replace(/bg-emerald-900\/40 text-emerald-300 border-emerald-700\/40/g, 'bg-emerald-50 text-emerald-600 border-emerald-100');
  // Amber / Pending
  content = content.replace(/bg-amber-900\/40 text-amber-300 border-amber-700\/40/g, 'bg-amber-50 text-amber-600 border-amber-100');
  // Blue / Info
  content = content.replace(/bg-blue-900\/40 text-blue-300 border-blue-700\/40/g, 'bg-indigo-50 text-admin-primary border-indigo-100');
  // Red / Danger
  content = content.replace(/bg-red-900\/40 text-red-300 border-red-700\/40/g, 'bg-rose-50 text-rose-600 border-rose-100');

  // 2. Refine Small Summary Cards (Non-main-dashboard)
  content = content.replace(/bg-admin-bg rounded-xl p-4/g, 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-3xl p-6 border border-admin-muted/5');
  content = content.replace(/bg-emerald-900\/30 border border-emerald-800\/40/g, 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-3xl p-6 border-l-4 border-l-emerald-500');
  content = content.replace(/bg-amber-900\/30 border border-amber-800\/40/g, 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-3xl p-6 border-l-4 border-l-amber-500');

  // 3. Row Items / List items
  content = content.replace(/bg-white shadow-sm\/80 border border-admin-muted\/10\/50 rounded-xl/g, 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-2xl border border-admin-muted/5 hover:shadow-lg transition-all');
  
  // 4. Input backgrounds
  content = content.replace(/bg-white shadow-sm border border-admin-muted\/10 rounded-xl/g, 'bg-white border-none shadow-sm rounded-2xl focus:ring-4 focus:ring-admin-primary/5 transition-all');

  // 5. Active Tab Buttons
  content = content.replace(/bg-brand-600 border-amber-500 text-admin-text/g, 'bg-admin-primary text-white border-admin-primary shadow-lg shadow-admin-primary/20');
  content = content.replace(/bg-blue-700 border-blue-600 text-admin-text/g, 'bg-admin-primary text-white border-admin-primary shadow-lg shadow-admin-primary/20');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Refined: ${filePath}`);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.tsx')) refineComponent(p);
  });
}

walk(adminDir);
console.log('Premium Polish Applied.');

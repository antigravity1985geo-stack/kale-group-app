const fs = require('fs');
let content = fs.readFileSync('src/AdminPanel.tsx', 'utf8');

// 1. Sidebar Background & Width
content = content.replace(/aside className=\"w-\[280px\] bg-gradient-to-b from-brand-950 to-brand-900 border-r border-white\/5 text-white flex flex-col shadow-\[4px_0_24px_rgba\(0,0,0,0.1\)\] z-20 relative\"/g, 
                        'aside className=\"w-[280px] bg-admin-sidebar text-white flex flex-col shadow-2xl z-20 relative border-r border-white/5\"');

// 2. Active Tab Style (Replace Gold with Indigo)
content = content.replace(/activeTab === tab.id \? \'bg-gold-400 text-brand-950 shadow-lg shadow-gold-400\/20 translate-x-1\' : \'text-admin-muted/g,
                        'activeTab === tab.id ? \'bg-admin-primary text-white shadow-lg shadow-admin-primary/20 translate-x-1\' : \'text-admin-muted');

// 3. Logo/Header Area (Simplify)
content = content.replace(/glow-gold cursor-pointer/g, 'cursor-pointer');
content = content.replace(/text-admin-primary font-light/g, 'text-admin-primary font-bold');

fs.writeFileSync('src/AdminPanel.tsx', content, 'utf8');
console.log('Sidebar Simplified Patch Done');

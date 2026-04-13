const fs = require('fs');
const path = require('path');

const adminPanelPath = 'src/AdminPanel.tsx';
let content = fs.readFileSync(adminPanelPath, 'utf8');

// 1. Sidebar Clean up (Final Split Design)
// I want to ensure the sidebar split is perfect according to visual goals
content = content.replace(/aside className=\"w-64/g, 'aside className=\"w-[280px]');

// 2. Main Layout
content = content.replace(/main className=\"flex-1 p-8 h-screen/g, 'main className=\"flex-1 p-8 md:p-12 h-screen overflow-y-auto relative z-10 bg-admin-bg/40 scroll-smooth');

// 3. Header Seamless Refinement
// Instead of replacing the whole line which is fragile, let's target the classes specifically
content = content.replace(/header className=\"flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 bg-white\/70 backdrop-blur-2xl p-6 rounded-\[2rem\] shadow-\[0_8px_30px_rgb\(0,0,0,0.04\)\] border border-white\/60 relative z-20\"/g, 
                        'header className=\"flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-20\"');

// 4. Header Text Polish
content = content.replace(/h1 className=\"text-3xl font-sans font-bold text-admin-text mb-1 drop-shadow-sm\"/g, 
                        'h1 className=\"text-4xl font-bold text-admin-text mb-2 tracking-tight\"');

// 5. Button & Input Polishing
content = content.replace(/className=\"w-full pl-10 pr-4 py-3 bg-admin-bg text-admin-muted rounded-2xl hover:bg-white hover:text-admin-primary transition-all shadow-sm text-sm focus:outline-none focus:border-gold-400 focus:bg-white transition-all shadow-none\"/g,
                        'className=\"w-full pl-12 pr-6 py-4 bg-white border-none rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-admin-primary/5 transition-all shadow-sm text-admin-text placeholder:text-admin-muted/40 font-medium\"');

// Clean up Add Buttons
const addBtnRegex = /className=\"flex items-center px-6 py-3 bg-admin-primary text-white rounded-2xl hover:bg-admin-primary-hover shadow-lg shadow-admin-primary\/20 transition-all hover:bg-brand-950 transition-all font-bold tracking-wider text-xs uppercase shadow-lg shadow-brand-900\/20 outline-none border-none cursor-pointer\"/g;
content = content.replace(addBtnRegex, 'className=\"flex items-center px-8 py-4 bg-admin-primary text-white rounded-2xl hover:bg-admin-primary-hover transition-all font-bold tracking-wider text-xs uppercase shadow-xl shadow-admin-primary/20 outline-none border-none cursor-pointer active:scale-95 group\"');

// Clean up Refresh
const refreshBtnRegex = /className=\"p-3 bg-admin-bg text-admin-muted rounded-2xl hover:bg-white hover:text-admin-primary transition-all shadow-sm hover:bg-white hover:border-gold-400 text-brand-500 hover:text-admin-primary transition-all shadow-none outline-none cursor-pointer\"/g;
content = content.replace(refreshBtnRegex, 'className=\"p-4 bg-white text-admin-muted rounded-2xl hover:text-admin-primary transition-all shadow-sm hover:shadow-lg border-none outline-none cursor-pointer active:scale-95 group\"');

// 6. Staggered Animation Wrapper in AdminPanel
if (!content.includes('admin-fade-in')) {
    content = content.replace(/<>\s*{isLoading \? \(/, '<div className=\"admin-fade-in stagger-1\">\n            {isLoading ? (');
    content = content.replace(/}\s*<(\/?)>\s*<\/main>/, '}</div>\n      </main>');
}

fs.writeFileSync(adminPanelPath, content, 'utf8');

// Also do another pass on the components folder for "stagger"
const adminDir = path.join('src', 'components', 'admin');
function addStagger(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            addStagger(fullPath);
        } else if (file.endsWith('.tsx')) {
            let c = fs.readFileSync(fullPath, 'utf8');
            let original = c;
            
            // Add staggered delay to child cards/divs if possible
            // A simple way is to find divs with bg-admin-card and add stagger
            let cardCount = 0;
            c = c.replace(/className=\"relative overflow-hidden bg-admin-card shadow-\[0_18px_40px_rgba\(112,144,176,0.12\)\] rounded-3xl p-5 group/g, (match) => {
                cardCount++;
                const staggerClass = cardCount <= 5 ? ` stagger-${cardCount}` : '';
                return match.replace('bg-admin-card', 'bg-admin-card admin-fade-in' + staggerClass);
            });
            
            if (c !== original) {
                fs.writeFileSync(fullPath, c, 'utf8');
            }
        }
    });
}
addStagger(adminDir);

console.log('UI Transformation Finalized');
